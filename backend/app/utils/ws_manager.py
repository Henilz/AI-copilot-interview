"""WebSocket connection manager with Redis pub/sub for multi-worker support."""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

from app.redis_client import get_redis

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Maps interview_id -> (WebSocket, pubsub_task)
        self._connections: dict[str, tuple[WebSocket, asyncio.Task]] = {}

    async def connect(self, interview_id: str, websocket: WebSocket) -> None:
        await websocket.accept()

        # Close any stale connection for the same interview
        if interview_id in self._connections:
            old_ws, old_task = self._connections[interview_id]
            old_task.cancel()
            try:
                await old_ws.close(code=1001)
            except Exception:
                pass

        # Start listening to the Redis pub/sub channel for this interview
        task = asyncio.create_task(self._redis_listener(interview_id, websocket))
        self._connections[interview_id] = (websocket, task)
        logger.info("WS connected: interview_id=%s", interview_id)

    async def disconnect(self, interview_id: str) -> None:
        if interview_id in self._connections:
            _, task = self._connections.pop(interview_id)
            task.cancel()
        logger.info("WS disconnected: interview_id=%s", interview_id)

    async def send(self, interview_id: str, message: Any) -> None:
        """Send directly to a connected client (same worker)."""
        if interview_id in self._connections:
            ws, _ = self._connections[interview_id]
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.warning("WS send failed for %s: %s", interview_id, exc)

    async def broadcast(self, interview_id: str, message: Any) -> None:
        """Publish via Redis so any worker can reach the client."""
        r = get_redis()
        channel = f"interview:{interview_id}:channel"
        await r.publish(channel, json.dumps(message))

    async def _redis_listener(self, interview_id: str, websocket: WebSocket) -> None:
        """Background task: subscribe to Redis channel and forward messages to WS."""
        r = get_redis()
        channel = f"interview:{interview_id}:channel"
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for raw in pubsub.listen():
                if raw["type"] != "message":
                    continue
                try:
                    msg = json.loads(raw["data"])
                    await websocket.send_json(msg)
                except Exception as exc:
                    logger.warning("Forwarding Redis msg failed: %s", exc)
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


manager = ConnectionManager()
