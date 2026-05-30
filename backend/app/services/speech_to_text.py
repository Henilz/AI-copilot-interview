"""Groq Whisper speech-to-text for streamed tab audio chunks."""
from openai import APIStatusError, AsyncOpenAI

from app.config import settings

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_client_instance: AsyncOpenAI | None = None


def _client() -> AsyncOpenAI:
    global _client_instance
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env to enable Whisper transcription."
        )
    if _client_instance is None:
        _client_instance = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=GROQ_BASE_URL,
        )
    return _client_instance


async def transcribe_audio_chunk(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    if len(audio_bytes) < 1200:
        return ""

    try:
        response = await _client().audio.transcriptions.create(
            model=settings.GROQ_WHISPER_MODEL,
            file=("meet-audio.webm", audio_bytes, content_type),
            response_format="json",
            language="en",
        )
    except APIStatusError as exc:
        if exc.status_code == 404:
            raise RuntimeError(
                f"Groq returned 404 for model '{settings.GROQ_WHISPER_MODEL}'. "
                "Check GROQ_WHISPER_MODEL (e.g. whisper-large-v3-turbo)."
            ) from exc
        if exc.status_code == 401:
            raise RuntimeError("Groq rejected GROQ_API_KEY (401). Verify the key.") from exc
        raise

    return (response.text or "").strip()
