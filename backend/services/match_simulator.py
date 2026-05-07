"""Mock match simulator that replays pre-built match data as live events."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional

from config import settings
from services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

# In-memory state for active simulations
_active_simulations: dict[str, asyncio.Task] = {}
_match_states: dict[str, dict] = {}


def load_mock_data() -> dict:
    """Load mock match data from JSON file."""
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "mock_matches.json")
    with open(data_path, "r") as f:
        return json.load(f)


def get_match_data(match_id: str) -> Optional[dict]:
    """Get mock match data by ID."""
    data = load_mock_data()
    for match in data["matches"]:
        if match["match_id"] == match_id:
            return match
    return None


def get_available_matches() -> list[dict]:
    """Get list of available mock matches."""
    data = load_mock_data()
    return [
        {
            "match_id": m["match_id"],
            "team_a": m["team_a"],
            "team_b": m["team_b"],
            "toss": m["toss"],
            "total_overs": len(m["overs"]),
        }
        for m in data["matches"]
    ]


def get_current_state(match_id: str) -> Optional[dict]:
    """Get the current simulation state for a match."""
    return _match_states.get(match_id)


def _determine_phase(over: int) -> str:
    """Determine match phase based on over number."""
    if over <= 6:
        return "powerplay"
    elif over <= 15:
        return "middle"
    else:
        return "death"


def _build_match_state(match_data: dict, over_idx: int, ball_idx: int,
                       total_runs: int, total_wickets: int, total_extras: int,
                       current_batters: list[str], bowler_states: dict) -> dict:
    """Build the current match state dictionary."""
    current_over = match_data["overs"][over_idx] if over_idx < len(match_data["overs"]) else None
    over_number = current_over["over_number"] if current_over else over_idx + 1

    # Build bowlers available list
    bowlers_available = []
    for b in match_data["bowlers_b"]:
        state = bowler_states.get(b["name"], {"overs_bowled": 0, "runs_conceded": 0, "wickets": 0})
        overs_left = 4 - state["overs_bowled"]
        if overs_left > 0:
            economy = (state["runs_conceded"] / state["overs_bowled"]) if state["overs_bowled"] > 0 else b["economy"]
            bowlers_available.append({
                "name": b["name"],
                "bowler_type": b["bowler_type"],
                "overs_bowled": state["overs_bowled"],
                "overs_left": overs_left,
                "economy": round(economy, 1),
                "wickets": state["wickets"],
            })

    return {
        "match_id": match_data["match_id"],
        "team_a": match_data["team_a"],
        "team_b": match_data["team_b"],
        "status": "live",
        "innings": 1,
        "over": over_number,
        "ball": ball_idx,
        "score": {"runs": total_runs, "wickets": total_wickets},
        "target": match_data.get("target"),
        "required": None,
        "current_batters": current_batters[:2],
        "current_bowler": current_over["bowler"] if current_over else "",
        "phase": _determine_phase(over_number),
        "bowlers_available": bowlers_available,
        "toss": match_data["toss"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def _run_simulation(match_id: str, on_over_end: Any = None, on_wicket: Any = None) -> None:
    """Run the match simulation, broadcasting events via WebSocket."""
    match_data = get_match_data(match_id)
    if not match_data:
        logger.error("Match data not found for %s", match_id)
        return

    total_runs = 0
    total_wickets = 0
    total_extras = 0
    batting_order = list(match_data["batters_a"]) + [
        p for p in match_data["squad_a"]
        if p not in match_data["batters_a"]
    ]
    current_batters = batting_order[:2]
    batter_idx = 2  # next batter to come in

    # Track bowler states
    bowler_states: dict[str, dict] = {}

    commentary_log: list[dict] = []

    logger.info("Starting simulation for match %s", match_id)

    for over_idx, over_data in enumerate(match_data["overs"]):
        bowler_name = over_data["bowler"]

        # Initialize bowler state if needed
        if bowler_name not in bowler_states:
            bowler_states[bowler_name] = {"overs_bowled": 0, "runs_conceded": 0, "wickets": 0}

        over_runs = 0
        over_wickets = 0

        for ball_data in over_data["balls"]:
            # Check if simulation was cancelled
            if match_id not in _active_simulations:
                logger.info("Simulation cancelled for %s", match_id)
                return

            total_runs += ball_data["runs"] + ball_data["extras"]
            total_extras += ball_data["extras"]
            over_runs += ball_data["runs"] + ball_data["extras"]

            if ball_data["wicket"]:
                total_wickets += 1
                over_wickets += 1
                bowler_states[bowler_name]["wickets"] += 1
                # Replace dismissed batter
                if ball_data["batter"] in current_batters and batter_idx < len(batting_order):
                    idx = current_batters.index(ball_data["batter"])
                    current_batters[idx] = batting_order[batter_idx]
                    batter_idx += 1

            bowler_states[bowler_name]["runs_conceded"] += ball_data["runs"] + ball_data["extras"]

            # Build and store current state
            state = _build_match_state(
                match_data, over_idx, ball_data["ball"],
                total_runs, total_wickets, total_extras,
                current_batters, bowler_states,
            )
            _match_states[match_id] = state

            # Build commentary entry
            commentary_entry = {
                "over": over_data["over_number"],
                "ball": ball_data["ball"],
                "runs": ball_data["runs"],
                "extras": ball_data["extras"],
                "wicket": ball_data["wicket"],
                "batter": ball_data["batter"],
                "bowler": bowler_name,
                "commentary": ball_data["commentary"],
                "score": f"{total_runs}/{total_wickets}",
            }
            commentary_log.append(commentary_entry)

            # Broadcast ball update
            await ws_manager.broadcast(match_id, "BALL_UPDATE", {
                "match_state": state,
                "ball_event": commentary_entry,
                "commentary": commentary_log[-5:],  # last 5 entries
            })

            # If wicket, trigger wicket event callback
            if ball_data["wicket"] and on_wicket:
                await on_wicket(match_id, state, over_data)

            # Wait between balls
            await asyncio.sleep(settings.BALL_INTERVAL_SECONDS)

        # Over complete — update bowler stats
        bowler_states[bowler_name]["overs_bowled"] += 1

        # Update state after over
        state = _build_match_state(
            match_data, over_idx, 6,
            total_runs, total_wickets, total_extras,
            current_batters, bowler_states,
        )
        state["last_over_summary"] = {
            "over": over_data["over_number"],
            "bowler": bowler_name,
            "runs": over_runs,
            "wickets": over_wickets,
        }
        _match_states[match_id] = state

        # Broadcast over end
        await ws_manager.broadcast(match_id, "OVER_END", {
            "match_state": state,
            "over_summary": state["last_over_summary"],
            "captain_next_bowler": over_data.get("captain_next_bowler", ""),
            "captain_field_template": over_data.get("captain_field_template", "balanced"),
        })

        # Trigger over-end callback (for decision engine)
        if on_over_end:
            await on_over_end(match_id, state, over_data)

        # Longer pause between overs (decision window happens here)
        await asyncio.sleep(settings.OVER_PAUSE_SECONDS)

    # Match complete
    if match_id in _match_states:
        _match_states[match_id]["status"] = "completed"
    await ws_manager.broadcast(match_id, "MATCH_COMPLETE", {
        "match_state": _match_states.get(match_id, {}),
        "final_score": f"{total_runs}/{total_wickets}",
    })
    logger.info("Simulation complete for %s: %d/%d", match_id, total_runs, total_wickets)

    # Cleanup
    _active_simulations.pop(match_id, None)


def start_simulation(match_id: str, on_over_end: Any = None, on_wicket: Any = None) -> bool:
    """Start a match simulation in the background. Returns True if started."""
    if match_id in _active_simulations:
        logger.warning("Simulation already running for %s", match_id)
        return False

    match_data = get_match_data(match_id)
    if not match_data:
        logger.error("No mock data found for match %s", match_id)
        return False

    # Initialize match state
    _match_states[match_id] = {
        "match_id": match_id,
        "team_a": match_data["team_a"],
        "team_b": match_data["team_b"],
        "status": "live",
        "innings": 1,
        "over": 0,
        "ball": 0,
        "score": {"runs": 0, "wickets": 0},
        "target": None,
        "required": None,
        "current_batters": match_data["batters_a"][:2],
        "current_bowler": "",
        "phase": "powerplay",
        "bowlers_available": [
            {
                "name": b["name"],
                "bowler_type": b["bowler_type"],
                "overs_bowled": 0,
                "overs_left": 4,
                "economy": b["economy"],
                "wickets": 0,
            }
            for b in match_data["bowlers_b"]
        ],
        "toss": match_data["toss"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    task = asyncio.create_task(_run_simulation(match_id, on_over_end, on_wicket))
    _active_simulations[match_id] = task
    return True


def stop_simulation(match_id: str) -> bool:
    """Stop a running simulation."""
    task = _active_simulations.pop(match_id, None)
    if task:
        task.cancel()
        if match_id in _match_states:
            _match_states[match_id]["status"] = "completed"
        return True
    return False


def is_simulation_running(match_id: str) -> bool:
    """Check if a simulation is currently running."""
    return match_id in _active_simulations
