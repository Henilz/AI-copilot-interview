"""Audio streaming WebSocket for Meet tab audio transcription."""
import asyncio
import logging
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.interview import Interview
from app.models.transcript import Transcript
from app.redis_client import redis_incr, redis_llen, redis_rpush
from app.services.speech_to_text import transcribe_audio_chunk
from app.services.suggestion_generator import maybe_trigger_rolling_summary
from app.utils.auth import decode_token_ws

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/audio/health")
async def audio_health():
    return {"status": "ok", "route": "audio"}


@router.websocket("/ws/interviews/{interview_id}/audio")
async def audio_websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    token: str = Query(...),
):
    payload = decode_token_ws(token)
    if not payload:
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Interview).where(Interview.id == interview_id))
        interview = result.scalar_one_or_none()

    if not interview:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    await websocket.send_json({"type": "audio_connected", "interview_id": interview_id})

    question_id: str | None = None
    content_type = "audio/webm"
    last_text = ""

    try:
        while True:
            message = await websocket.receive()

            if message.get("text") is not None:
                data = message["text"]
                if data == "ping":
                    await websocket.send_text("pong")
                    continue
                if data.startswith("question_id:"):
                    question_id = data.split(":", 1)[1] or None
                    continue
                if data.startswith("content_type:"):
                    content_type = data.split(":", 1)[1] or content_type
                    continue

            audio_bytes = message.get("bytes")
            if not audio_bytes:
                continue

            try:
                text = await transcribe_audio_chunk(audio_bytes, content_type=content_type)
            except Exception as exc:
                logger.exception("Audio transcription failed for %s: %s", interview_id, exc)
                await websocket.send_json({"type": "audio_error", "message": str(exc)})
                continue

            if not text or text == last_text:
                continue

            last_text = text
            sequence = await _persist_transcript(interview_id, text, question_id)
            await websocket.send_json({
                "type": "audio_transcript",
                "text": text,
                "sequence": sequence,
                "question_id": question_id,
            })

    except WebSocketDisconnect:
        logger.info("Audio WS disconnected: interview_id=%s", interview_id)


async def _persist_transcript(interview_id: str, text: str, question_id: str | None) -> int:
    chunk = {
        "speaker": "candidate",
        "text": text,
        "timestamp": "",
        "question_id": question_id,
    }

    await redis_rpush(f"interview:{interview_id}:transcript", chunk)
    count = await redis_incr(f"interview:{interview_id}:exchange_count")

    buffer_len = await redis_llen(f"interview:{interview_id}:transcript")
    if buffer_len >= settings.REDIS_TRANSCRIPT_MAX:
        asyncio.create_task(_archive_transcript_batch(interview_id))

    await maybe_trigger_rolling_summary(interview_id)
    return count


async def _archive_transcript_batch(interview_id: str) -> None:
    from app.redis_client import get_redis, redis_lrange

    batch_size = settings.REDIS_TRANSCRIPT_ARCHIVE_BATCH
    entries = await redis_lrange(f"interview:{interview_id}:transcript", 0, batch_size - 1)

    async with AsyncSessionLocal() as db:
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
                speaker=entry.get("speaker", "candidate"),
                text=entry.get("text", ""),
                timestamp=entry.get("timestamp"),
                sequence_num=next_seq + i,
            ))

        try:
            await db.commit()
        except Exception as exc:
            logger.error("Audio transcript archive failed: %s", exc)
            await db.rollback()

    await get_redis().ltrim(f"interview:{interview_id}:transcript", batch_size, -1)
