"""Leaderboard API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Header

from services import firestore_client as db

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/{match_id}")
async def get_match_leaderboard(match_id: str, limit: int = 100):
    """Get the leaderboard for a specific match."""
    try:
        entries = await db.get_leaderboard(match_id, limit=limit)
        return {"match_id": match_id, "entries": entries}
    except Exception as e:
        return {"match_id": match_id, "entries": [], "error": str(e)}


@router.get("/{match_id}/me")
async def get_my_rank(
    match_id: str,
    x_user_id: str = Header(default="anonymous"),
):
    """Get the current user's leaderboard entry for a match."""
    try:
        entry = await db.get_user_leaderboard_entry(match_id, x_user_id)
        if entry:
            # Calculate rank
            all_entries = await db.get_leaderboard(match_id, limit=1000)
            rank = next(
                (e["rank"] for e in all_entries if e["user_id"] == x_user_id),
                None,
            )
            entry["rank"] = rank
            return entry
        return {"user_id": x_user_id, "total_points": 0, "decisions_made": 0, "rank": None}
    except Exception as e:
        return {"user_id": x_user_id, "total_points": 0, "decisions_made": 0, "error": str(e)}
