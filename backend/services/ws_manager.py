"""WebSocket connection manager for real-time broadcasting."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per match room."""

    def __init__(self) -> None:
        self._rooms: dict[str, set[tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, match_id: str, user_id: str) -> None:
        await websocket.accept()
        if match_id not in self._rooms:
            self._rooms[match_id] = set()
        self._rooms[match_id].add((websocket, user_id))
        logger.info("User %s connected to match %s (%d total)",
                     user_id, match_id, len(self._rooms[match_id]))

    def disconnect(self, websocket: WebSocket, match_id: str, user_id: str) -> None:
        if match_id in self._rooms:
            self._rooms[match_id].discard((websocket, user_id))
            if not self._rooms[match_id]:
                del self._rooms[match_id]
        logger.info("User %s disconnected from match %s", user_id, match_id)

    async def broadcast(self, match_id: str, event_type: str, data: Any) -> None:
        if match_id not in self._rooms:
            return
        message = json.dumps({"type": event_type, "data": data})
        dead_connections: list[tuple[WebSocket, str]] = []
        for ws, uid in self._rooms[match_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.append((ws, uid))
        for conn in dead_connections:
            self._rooms[match_id].discard(conn)
            logger.warning("Removed dead connection for user %s", conn[1])

    async def send_to_user(self, match_id: str, user_id: str,
                           event_type: str, data: Any) -> None:
        if match_id not in self._rooms:
            return
        message = json.dumps({"type": event_type, "data": data})
        for ws, uid in self._rooms[match_id]:
            if uid == user_id:
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    def get_connected_users(self, match_id: str) -> list[str]:
        if match_id not in self._rooms:
            return []
        return [uid for _, uid in self._rooms[match_id]]

    def get_room_count(self, match_id: str) -> int:
        return len(self._rooms.get(match_id, set()))


ws_manager = ConnectionManager()
