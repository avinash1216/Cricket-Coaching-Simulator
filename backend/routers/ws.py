"""WebSocket endpoint for real-time match updates."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from services.ws_manager import ws_manager
from services import decision_engine
from services import scoring_engine
from services.match_simulator import get_current_state

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{match_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    match_id: str,
    user_id: str = Query(default="anonymous"),
    user_name: str = Query(default="Anonymous"),
):
    """WebSocket connection for real-time match updates.

    Connect with: ws://host/ws/{match_id}?user_id=xxx&user_name=yyy

    Server sends events:
        - MATCH_UPDATE: ball-by-ball updates
        - BALL_UPDATE: individual ball event
        - OVER_END: over completed
        - DECISION_WINDOW_OPEN: new decision window
        - DECISION_WINDOW_CLOSED: window closed + captain reveal
        - SCORE_RESULT: individual user's score for a decision
        - LEADERBOARD_UPDATE: updated leaderboard
        - MATCH_COMPLETE: match finished

    Client can send:
        - SUBMIT_DECISION: { event_id, choice }
    """
    await ws_manager.connect(websocket, match_id, user_id)

    # Send current match state on connect
    state = get_current_state(match_id)
    if state:
        await websocket.send_text(json.dumps({
            "type": "MATCH_STATE",
            "data": state,
        }))

    # Send any open decision windows
    open_windows = decision_engine.get_open_windows(match_id)
    if open_windows:
        for window in open_windows:
            await websocket.send_text(json.dumps({
                "type": "DECISION_WINDOW_OPEN",
                "data": window,
            }))

    try:
        while True:
            # Listen for client messages
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
                msg_type = message.get("type", "")

                if msg_type == "SUBMIT_DECISION":
                    data = message.get("data", {})
                    event_id = data.get("event_id", "")
                    choice = data.get("choice", "")

                    if event_id and choice:
                        submission = await decision_engine.submit_decision(
                            event_id=event_id,
                            user_id=user_id,
                            choice=choice,
                        )
                        if submission:
                            await websocket.send_text(json.dumps({
                                "type": "DECISION_SUBMITTED",
                                "data": {
                                    "event_id": event_id,
                                    "choice": choice,
                                    "response_time_ms": submission.get("response_time_ms", 0),
                                },
                            }))
                            # Score asynchronously
                            import asyncio
                            asyncio.create_task(scoring_engine.score_decision(submission))
                        else:
                            await websocket.send_text(json.dumps({
                                "type": "ERROR",
                                "data": {"message": "Window closed or invalid choice"},
                            }))

                elif msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "ERROR",
                    "data": {"message": "Invalid JSON"},
                }))

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, match_id, user_id)
        logger.info("User %s disconnected from match %s", user_id, match_id)
