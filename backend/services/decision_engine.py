"""Decision Engine — manages decision window lifecycle."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from config import settings
from services.ws_manager import ws_manager
from services import firestore_client as db

logger = logging.getLogger(__name__)

# In-memory tracking of open windows
_open_windows: dict[str, dict] = {}  # event_id -> window data
_window_tasks: dict[str, asyncio.Task] = {}  # event_id -> close timer task


async def on_over_end(match_id: str, match_state: dict, over_data: dict) -> None:
    """Called when an over ends — triggers bowling change + field placement decisions."""
    # Generate bowling change decision
    await _create_decision_window(
        match_id=match_id,
        match_state=match_state,
        decision_type="bowling_change",
        over_data=over_data,
    )

    # Small delay then generate field placement decision
    await asyncio.sleep(1)
    await _create_decision_window(
        match_id=match_id,
        match_state=match_state,
        decision_type="field_placement",
        over_data=over_data,
    )


async def on_wicket(match_id: str, match_state: dict, over_data: dict) -> None:
    """Called when a wicket falls — could trigger field change decision."""
    # For MVP, we only trigger decisions at over end
    # Wickets are noted in the match state but don't open new windows mid-over
    pass


async def _create_decision_window(
    match_id: str,
    match_state: dict,
    decision_type: str,
    over_data: dict,
) -> str:
    """Create and broadcast a decision window."""
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    closes_at = now + timedelta(seconds=settings.DECISION_WINDOW_SECONDS)

    # Generate options based on decision type
    if decision_type == "bowling_change":
        options = _generate_bowling_options(match_state, over_data)
        captain_choice = over_data.get("captain_next_bowler", "")
    elif decision_type == "field_placement":
        options = _generate_field_options(match_state)
        captain_choice = over_data.get("captain_field_template", "balanced")
    else:
        return ""

    window_data = {
        "event_id": event_id,
        "match_id": match_id,
        "decision_type": decision_type,
        "status": "open",
        "options": options,
        "window_opens_at": now.isoformat(),
        "window_closes_at": closes_at.isoformat(),
        "captain_choice": captain_choice,
        "context": {
            "over": match_state.get("over", 0),
            "phase": match_state.get("phase", ""),
            "score": match_state.get("score", {}),
            "current_bowler": match_state.get("current_bowler", ""),
            "current_batters": match_state.get("current_batters", []),
        },
        "created_at": now.isoformat(),
        "open_timestamp": time.time(),
    }

    # Store in memory
    _open_windows[event_id] = window_data

    # Store in Firestore (non-blocking, don't include captain_choice yet)
    firestore_data = {**window_data}
    firestore_data.pop("captain_choice", None)  # Hide captain choice until window closes
    firestore_data.pop("open_timestamp", None)
    try:
        await db.create_decision_window(event_id, firestore_data)
    except Exception as e:
        logger.error("Failed to save decision window to Firestore: %s", e)

    # Broadcast to all connected fans (without captain choice)
    broadcast_data = {
        "event_id": event_id,
        "match_id": match_id,
        "decision_type": decision_type,
        "options": options,
        "window_duration": settings.DECISION_WINDOW_SECONDS,
        "window_closes_at": closes_at.isoformat(),
        "context": window_data["context"],
    }
    await ws_manager.broadcast(match_id, "DECISION_WINDOW_OPEN", broadcast_data)

    # Schedule window close
    task = asyncio.create_task(_close_window_after_delay(event_id, match_id))
    _window_tasks[event_id] = task

    logger.info("Decision window opened: %s (%s) for match %s",
                event_id, decision_type, match_id)
    return event_id


async def _close_window_after_delay(event_id: str, match_id: str) -> None:
    """Close a decision window after the configured delay."""
    await asyncio.sleep(settings.DECISION_WINDOW_SECONDS)
    await close_window(event_id, match_id)


async def close_window(event_id: str, match_id: str) -> None:
    """Close a decision window and reveal the captain's choice."""
    window = _open_windows.pop(event_id, None)
    if not window:
        return

    _window_tasks.pop(event_id, None)

    captain_choice = window.get("captain_choice", "")

    # Update Firestore
    try:
        await db.update_decision_window(event_id, {
            "status": "closed",
            "captain_choice": captain_choice,
        })
    except Exception as e:
        logger.error("Failed to update decision window in Firestore: %s", e)

    # Broadcast window closed with captain reveal
    await ws_manager.broadcast(match_id, "DECISION_WINDOW_CLOSED", {
        "event_id": event_id,
        "captain_choice": captain_choice,
        "decision_type": window["decision_type"],
    })

    logger.info("Decision window closed: %s, captain chose: %s", event_id, captain_choice)


async def submit_decision(
    event_id: str,
    user_id: str,
    choice: str,
    client_timestamp: Optional[float] = None,
) -> Optional[dict]:
    """Submit a fan's decision for an open window. Returns submission data or None."""
    window = _open_windows.get(event_id)
    if not window:
        logger.warning("Decision submitted for closed/unknown window: %s", event_id)
        return None

    # Validate choice is one of the options
    valid_ids = [opt["id"] for opt in window["options"]]
    if choice not in valid_ids:
        logger.warning("Invalid choice %s for window %s", choice, event_id)
        return None

    # Check if user already submitted
    existing = await db.get_fan_decision(event_id, user_id)
    if existing:
        logger.warning("User %s already submitted for window %s", user_id, event_id)
        return existing

    # Calculate response time
    open_ts = window.get("open_timestamp", time.time())
    response_time_ms = int((time.time() - open_ts) * 1000)

    # Find the chosen option label
    chosen_label = ""
    for opt in window["options"]:
        if opt["id"] == choice:
            chosen_label = opt["label"]
            break

    submission = {
        "user_id": user_id,
        "match_id": window["match_id"],
        "event_id": event_id,
        "decision_type": window["decision_type"],
        "choice": choice,
        "choice_label": chosen_label,
        "response_time_ms": response_time_ms,
        "captain_choice": window.get("captain_choice", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Scoring fields — filled in later by scoring engine
        "captain_match_score": 0,
        "gemini_merit_score": 0,
        "speed_bonus": 0,
        "streak_bonus": 0,
        "total_points": 0,
        "merit_level": "pending",
    }

    # Save to Firestore
    try:
        doc_id = await db.save_fan_decision(submission)
        submission["id"] = doc_id
    except Exception as e:
        logger.error("Failed to save fan decision: %s", e)

    return submission


def get_open_windows(match_id: str) -> list[dict]:
    """Get all currently open decision windows for a match."""
    return [
        {k: v for k, v in w.items() if k not in ("captain_choice", "open_timestamp")}
        for w in _open_windows.values()
        if w["match_id"] == match_id
    ]


def _generate_bowling_options(match_state: dict, over_data: dict) -> list[dict]:
    """Generate 3 bowling options from available bowlers."""
    bowlers = match_state.get("bowlers_available", [])
    current_bowler = over_data.get("bowler", "")

    # Filter out current bowler (can't bowl consecutive overs) and bowlers with no overs left
    available = [
        b for b in bowlers
        if b["name"] != current_bowler and b.get("overs_left", 0) > 0
    ]

    # Pick top 3 (or all if fewer)
    selected = available[:3]

    options = []
    for i, bowler in enumerate(selected):
        opt_id = chr(65 + i)  # A, B, C
        options.append({
            "id": opt_id,
            "label": bowler["name"],
            "description": f"{bowler['bowler_type'].title()} | {bowler['overs_left']} overs left | Econ: {bowler['economy']}",
            "stats": {
                "bowler_type": bowler["bowler_type"],
                "overs_left": bowler["overs_left"],
                "economy": bowler["economy"],
                "wickets": bowler.get("wickets", 0),
            },
        })

    return options


def _generate_field_options(match_state: dict) -> list[dict]:
    """Generate 3 field placement template options."""
    phase = match_state.get("phase", "middle")

    return [
        {
            "id": "attacking",
            "label": "Attacking Field",
            "description": "4 close catchers, 2 slips, aggressive ring. Best for taking wickets.",
            "stats": {"catchers": 4, "boundary": 2, "ring": 3},
        },
        {
            "id": "balanced",
            "label": "Balanced Field",
            "description": "3 in ring, 4 on boundary. Standard T20 setup.",
            "stats": {"catchers": 2, "boundary": 4, "ring": 3},
        },
        {
            "id": "defensive",
            "label": "Defensive Field",
            "description": "All fielders on boundary, deep positions. Best for restricting runs.",
            "stats": {"catchers": 1, "boundary": 6, "ring": 2},
        },
    ]
