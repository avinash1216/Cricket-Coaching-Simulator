"""Admin API endpoints for match control."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import StartMatchRequest, TriggerDecisionRequest, SetCaptainChoiceRequest
from services import match_simulator
from services import decision_engine
from services import firestore_client as db

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/start-match")
async def start_match(body: StartMatchRequest):
    """Start a mock match simulation."""
    match_id = body.match_id

    # Check if match data exists
    match_data = match_simulator.get_match_data(match_id)
    if not match_data:
        raise HTTPException(status_code=404, detail=f"No mock data for match: {match_id}")

    if match_simulator.is_simulation_running(match_id):
        raise HTTPException(status_code=409, detail="Simulation already running")

    # Start simulation with decision engine callbacks
    started = match_simulator.start_simulation(
        match_id,
        on_over_end=decision_engine.on_over_end,
        on_wicket=decision_engine.on_wicket,
    )

    if not started:
        raise HTTPException(status_code=500, detail="Failed to start simulation")

    # Save initial match state to Firestore
    state = match_simulator.get_current_state(match_id)
    if state:
        try:
            await db.update_match(match_id, state)
        except Exception as e:
            pass  # Non-critical

    return {
        "status": "started",
        "match_id": match_id,
        "team_a": match_data["team_a"],
        "team_b": match_data["team_b"],
        "message": f"Simulation started for {match_data['team_a']} vs {match_data['team_b']}",
    }


@router.post("/stop-match")
async def stop_match(body: StartMatchRequest):
    """Stop a running match simulation."""
    stopped = match_simulator.stop_simulation(body.match_id)
    if not stopped:
        raise HTTPException(status_code=404, detail="No running simulation found")

    return {"status": "stopped", "match_id": body.match_id}


@router.get("/status")
async def get_status():
    """Get status of all simulations and open windows."""
    available = match_simulator.get_available_matches()
    running = []
    for m in available:
        mid = m["match_id"]
        if match_simulator.is_simulation_running(mid):
            state = match_simulator.get_current_state(mid)
            running.append({
                "match_id": mid,
                "state": state,
                "open_windows": decision_engine.get_open_windows(mid),
            })

    return {
        "available_matches": available,
        "running_simulations": running,
    }


@router.post("/set-captain-choice")
async def set_captain_choice(body: SetCaptainChoiceRequest):
    """Manually set the captain's choice for a decision window."""
    try:
        await db.update_decision_window(body.event_id, {
            "captain_choice": body.captain_choice,
        })
        return {"status": "updated", "event_id": body.event_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
