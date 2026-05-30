"""WebSocket endpoint for real-time interview session management."""
import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.interview import Interview
from app.models.question import Question
from app.models.transcript import Transcript
from app.redis_client import (
    redis_get,
    redis_get_int,
    redis_incr,
    redis_llen,
    redis_lrange,
    redis_rpush,
    redis_set,
)
from app.services.suggestion_generator import maybe_trigger_rolling_summary, stream_suggestions
from app.utils.auth import decode_token_ws
from app.utils.ws_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 30  # seconds


@router.websocket("/ws/interviews/{interview_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    token: str = Query(...),
):
    # ── Auth ────────────────────────────────────────────────────────────────
    payload = decode_token_ws(token)
    if not payload:
        await websocket.close(code=4001)
        return

    # ── Validate interview exists ────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Interview).where(Interview.id == interview_id))
        interview = result.scalar_one_or_none()
    if not interview:
        await websocket.close(code=4004)
        return

    # ── Accept connection ────────────────────────────────────────────────────
    await manager.connect(interview_id, websocket)

    # ── Send initial state ───────────────────────────────────────────────────
    try:
        initial_questions = await _load_initial_questions(interview_id)
        transcript_count = await redis_llen(f"interview:{interview_id}:transcript")
        await websocket.send_json({
            "type": "connected",
            "interview_id": interview_id,
            "transcript_buffered": transcript_count,
            "initial_questions": initial_questions,
        })
    except Exception as exc:
        logger.warning("Failed to send initial state: %s", exc)

    # ── Rate-limit state ─────────────────────────────────────────────────────
    last_suggestion_time: float = 0.0

    # ── Message loop ─────────────────────────────────────────────────────────
    heartbeat_task = asyncio.create_task(_heartbeat(websocket))
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "pong":
                continue

            elif msg_type == "transcript":
                await _handle_transcript(interview_id, msg, websocket)

            elif msg_type == "request_suggestions":
                now = time.monotonic()
                cooldown = settings.SUGGESTION_RATE_LIMIT_SECONDS
                if now - last_suggestion_time < cooldown:
                    remaining = round(cooldown - (now - last_suggestion_time))
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Please wait {remaining}s before requesting again",
                    })
                    continue
                last_suggestion_time = now
                await _handle_suggestions(interview_id, websocket)

            elif msg_type == "question_asked":
                question_id = msg.get("question_id")
                if question_id:
                    await _mark_question_asked(interview_id, question_id)

            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("WS disconnected: interview_id=%s", interview_id)
    except Exception as exc:
        logger.error("WS error for %s: %s", interview_id, exc)
    finally:
        heartbeat_task.cancel()
        await manager.disconnect(interview_id)


async def _heartbeat(websocket: WebSocket) -> None:
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        try:
            await websocket.send_json({"type": "ping"})
        except Exception:
            break


async def _handle_transcript(interview_id: str, msg: dict, websocket: WebSocket) -> None:
    """Buffer transcript chunk in Redis; archive to Postgres when threshold reached."""
    if msg.get("is_final") is False:
        await websocket.send_json({"type": "transcript_ack", "partial": True})
        return

    chunk = {
        "speaker": msg.get("speaker", "unknown"),
        "text": msg.get("text", ""),
        "timestamp": msg.get("timestamp", ""),
    }

    await redis_rpush(f"interview:{interview_id}:transcript", chunk)
    count = await redis_incr(f"interview:{interview_id}:exchange_count")

    # Archive older entries to Postgres when buffer hits max
    buffer_len = await redis_llen(f"interview:{interview_id}:transcript")
    if buffer_len >= settings.REDIS_TRANSCRIPT_MAX:
        asyncio.create_task(_archive_transcript_batch(interview_id))

    # Maybe trigger rolling summary
    await maybe_trigger_rolling_summary(interview_id)

    await websocket.send_json({"type": "transcript_ack", "sequence": count})


async def _handle_suggestions(interview_id: str, websocket: WebSocket) -> None:
    """Stream suggestion tokens to the client, then send the complete structured set."""
    await websocket.send_json({"type": "suggestion_start"})
    try:
        async for token_msg in stream_suggestions(interview_id):
            await websocket.send_json(json.loads(token_msg))
    except Exception as exc:
        logger.error("Suggestion streaming error for %s: %s", interview_id, exc)
        await websocket.send_json({"type": "suggestion_error", "message": str(exc)})


async def _mark_question_asked(interview_id: str, question_id: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Question).where(Question.id == question_id, Question.interview_id == interview_id)
        )
        question = result.scalar_one_or_none()
        if question:
            question.is_asked = True
            await db.commit()

    # Also track question text in Redis for suggestion context
    asked_key = f"interview:{interview_id}:questions:asked"
    existing = await redis_get(asked_key) or []
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Question).where(Question.id == question_id))
        q = result.scalar_one_or_none()
        if q and q.question_text not in existing:
            existing.append(q.question_text)
            await redis_set(asked_key, existing, ttl=86400)


async def _archive_transcript_batch(interview_id: str) -> None:
    """Move oldest ARCHIVE_BATCH entries from Redis to Postgres."""
    batch_size = settings.REDIS_TRANSCRIPT_ARCHIVE_BATCH
    entries = await redis_lrange(f"interview:{interview_id}:transcript", 0, batch_size - 1)

    async with AsyncSessionLocal() as db:
        # Get current max sequence_num to avoid duplicates
        result = await db.execute(
            select(Transcript.sequence_num)
            .where(Transcript.interview_id == interview_id)
            .order_by(Transcript.sequence_num.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        next_seq = (row or 0) + 1

        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            db.add(Transcript(
                id=str(uuid.uuid4()),
                interview_id=interview_id,
                speaker=entry.get("speaker", "unknown"),
                text=entry.get("text", ""),
                timestamp=entry.get("timestamp"),
                sequence_num=next_seq + i,
            ))
        try:
            await db.commit()
        except Exception as exc:
            logger.error("Transcript archive failed: %s", exc)
            await db.rollback()

    # Trim archived entries from Redis list
    r = await _get_redis_raw()
    await r.ltrim(f"interview:{interview_id}:transcript", batch_size, -1)


async def _load_initial_questions(interview_id: str) -> list[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Question)
            .where(Question.interview_id == interview_id, Question.phase == "initial")
            .order_by(Question.order_num)
        )
        questions = result.scalars().all()
        return [
            {
                "id": q.id,
                "question": q.question_text,
                "category": q.category,
                "difficulty": q.difficulty,
                "what_to_listen_for": q.what_to_listen_for,
                "red_flags": q.red_flags,
                "order": q.order_num,
                "is_asked": q.is_asked,
            }
            for q in questions
        ]


async def _get_redis_raw():
    from app.redis_client import get_redis
    return get_redis()
