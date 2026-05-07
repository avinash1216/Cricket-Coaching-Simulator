"""Match state API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services import firestore_client as db
from services.match_simulator import get_current_state, get_available_matches

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("")
async def list_matches():
    """List all available matches (mock + any in Firestore)."""
    # Get mock matches available for simulation
    mock = get_available_matches()

    # Get matches from Firestore (live/completed)
    try:
        firestore_matches = await db.list_matches()
    except Exception:
        firestore_matches = []

    return {
        "mock_matches": mock,
        "active_matches": firestore_matches,
    }


@router.get("/{match_id}")
async def get_match(match_id: str):
    """Get current match state."""
    # First check in-memory state (live simulation)
    state = get_current_state(match_id)
    if state:
        return state

    # Fall back to Firestore
    try:
        match = await db.get_match(match_id)
        if match:
            return match
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Match not found")


@router.get("/{match_id}/decisions")
async def get_match_decisions(match_id: str):
    """Get all decision windows for a match."""
    try:
        windows = await db.list_decision_windows(match_id)
        return {"match_id": match_id, "decisions": windows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
