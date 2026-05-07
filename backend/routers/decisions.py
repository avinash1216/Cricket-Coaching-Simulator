"""Decision submission and history API endpoints."""

from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from models.schemas import DecisionSubmission
from services import decision_engine
from services import scoring_engine
from services import firestore_client as db

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


@router.post("/submit")
async def submit_decision(
    body: DecisionSubmission,
    x_user_id: str = Header(default="anonymous"),
    x_user_name: str = Header(default="Anonymous"),
):
    """Submit a fan's decision for an open window."""
    # Submit the decision
    submission = await decision_engine.submit_decision(
        event_id=body.event_id,
        user_id=x_user_id,
        choice=body.choice,
        client_timestamp=body.timestamp,
    )

    if not submission:
        raise HTTPException(
            status_code=400,
            detail="Decision window is closed or choice is invalid",
        )

    # Score the decision asynchronously (don't block the response)
    asyncio.create_task(scoring_engine.score_decision(submission))

    return {
        "status": "submitted",
        "event_id": body.event_id,
        "choice": body.choice,
        "response_time_ms": submission.get("response_time_ms", 0),
        "message": "Decision recorded! Scoring in progress...",
    }


@router.get("/history/{match_id}")
async def get_user_decisions(
    match_id: str,
    x_user_id: str = Header(default="anonymous"),
):
    """Get all decisions a user made in a match."""
    try:
        decisions = await db.get_user_decisions_for_match(match_id, x_user_id)
        return {"match_id": match_id, "decisions": decisions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/windows/{match_id}")
async def get_open_windows(match_id: str):
    """Get currently open decision windows for a match."""
    windows = decision_engine.get_open_windows(match_id)
    return {"match_id": match_id, "open_windows": windows}
