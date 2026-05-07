"""Firestore client wrapper for database operations."""

from __future__ import annotations

import logging
from typing import Any, Optional

from google.cloud import firestore

from config import settings

logger = logging.getLogger(__name__)

_db: Optional[firestore.AsyncClient] = None


def get_db() -> firestore.AsyncClient:
    global _db
    if _db is None:
        _db = firestore.AsyncClient(
            project=settings.GCP_PROJECT,
            database=settings.FIRESTORE_DATABASE,
        )
    return _db


async def get_user(uid: str) -> Optional[dict]:
    doc = await get_db().collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


async def create_or_update_user(uid: str, data: dict) -> None:
    await get_db().collection("users").document(uid).set(data, merge=True)


async def get_match(match_id: str) -> Optional[dict]:
    doc = await get_db().collection("matches").document(match_id).get()
    return doc.to_dict() if doc.exists else None


async def update_match(match_id: str, data: dict) -> None:
    await get_db().collection("matches").document(match_id).set(data, merge=True)


async def list_matches() -> list[dict]:
    docs = get_db().collection("matches").order_by(
        "updated_at", direction=firestore.Query.DESCENDING
    ).limit(20)
    results = []
    async for doc in docs.stream():
        d = doc.to_dict()
        d["match_id"] = doc.id
        results.append(d)
    return results


async def create_decision_window(event_id: str, data: dict) -> None:
    await get_db().collection("decision_windows").document(event_id).set(data)


async def get_decision_window(event_id: str) -> Optional[dict]:
    doc = await get_db().collection("decision_windows").document(event_id).get()
    return doc.to_dict() if doc.exists else None


async def update_decision_window(event_id: str, data: dict) -> None:
    await get_db().collection("decision_windows").document(event_id).set(data, merge=True)


async def list_decision_windows(match_id: str) -> list[dict]:
    docs = get_db().collection("decision_windows").where(
        filter=firestore.FieldFilter("match_id", "==", match_id)
    ).order_by("created_at", direction=firestore.Query.DESCENDING)
    results = []
    async for doc in docs.stream():
        d = doc.to_dict()
        d["event_id"] = doc.id
        results.append(d)
    return results


async def save_fan_decision(data: dict) -> str:
    doc_ref = get_db().collection("fan_decisions").document()
    await doc_ref.set(data)
    return doc_ref.id


async def get_fan_decision(event_id: str, user_id: str) -> Optional[dict]:
    docs = get_db().collection("fan_decisions").where(
        filter=firestore.FieldFilter("event_id", "==", event_id)
    ).where(
        filter=firestore.FieldFilter("user_id", "==", user_id)
    ).limit(1)
    async for doc in docs.stream():
        d = doc.to_dict()
        d["id"] = doc.id
        return d
    return None


async def get_user_decisions_for_match(match_id: str, user_id: str) -> list[dict]:
    docs = get_db().collection("fan_decisions").where(
        filter=firestore.FieldFilter("match_id", "==", match_id)
    ).where(
        filter=firestore.FieldFilter("user_id", "==", user_id)
    ).order_by("created_at", direction=firestore.Query.DESCENDING)
    results = []
    async for doc in docs.stream():
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)
    return results


async def get_recent_user_decisions(user_id: str, limit: int = 5) -> list[dict]:
    docs = get_db().collection("fan_decisions").where(
        filter=firestore.FieldFilter("user_id", "==", user_id)
    ).order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
    results = []
    async for doc in docs.stream():
        results.append(doc.to_dict())
    return results


async def update_leaderboard(match_id: str, user_id: str, data: dict) -> None:
    await get_db().collection("leaderboard").document(match_id)\
        .collection("entries").document(user_id).set(data, merge=True)


async def get_leaderboard(match_id: str, limit: int = 100) -> list[dict]:
    docs = get_db().collection("leaderboard").document(match_id)\
        .collection("entries").order_by(
            "total_points", direction=firestore.Query.DESCENDING
        ).limit(limit)
    results = []
    rank = 1
    async for doc in docs.stream():
        d = doc.to_dict()
        d["user_id"] = doc.id
        d["rank"] = rank
        results.append(d)
        rank += 1
    return results


async def get_user_leaderboard_entry(match_id: str, user_id: str) -> Optional[dict]:
    doc = await get_db().collection("leaderboard").document(match_id)\
        .collection("entries").document(user_id).get()
    return doc.to_dict() if doc.exists else None


async def update_season_points(user_id: str, points_to_add: int) -> None:
    await get_db().collection("users").document(user_id).update({
        "total_season_points": firestore.Increment(points_to_add),
        "matches_played": firestore.Increment(0),
    })
