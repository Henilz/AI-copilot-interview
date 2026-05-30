"""Speech-to-text helpers for streamed tab audio chunks."""
from openai import APIStatusError, AsyncOpenAI

from app.config import settings
from app.services.llm_config import is_nvidia_key


def _client() -> AsyncOpenAI:
    api_key = settings.STT_API_KEY or settings.OPENAI_API_KEY
    base_url = settings.STT_BASE_URL or None

    if is_nvidia_key() and not settings.STT_API_KEY:
        raise RuntimeError(
            "Tab audio transcription requires STT_API_KEY because the configured NVIDIA LLM key "
            "does not expose an OpenAI-compatible audio transcription endpoint."
        )

    if api_key.startswith("nvapi-") or (base_url and "nvidia.com" in base_url):
        raise RuntimeError(
            "The configured STT provider appears to be NVIDIA. NVIDIA's GPT OSS endpoint is for text LLM calls, "
            "not OpenAI Whisper-compatible audio transcription. Set STT_API_KEY to an STT provider key "
            "and leave STT_BASE_URL empty for OpenAI Whisper, or set STT_BASE_URL to a provider that supports "
            "/audio/transcriptions."
        )

    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return AsyncOpenAI(**kwargs)


async def transcribe_audio_chunk(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    if len(audio_bytes) < 1200:
        return ""

    try:
        response = await _client().audio.transcriptions.create(
            model=settings.STT_MODEL,
            file=("meet-audio.webm", audio_bytes, content_type),
            response_format="json",
        )
    except APIStatusError as exc:
        if exc.status_code == 404:
            raise RuntimeError(
                "STT endpoint returned 404. Check STT_API_KEY, STT_BASE_URL, and STT_MODEL. "
                "For Groq Whisper use STT_API_KEY=<Groq key>, STT_BASE_URL=https://api.groq.com/openai/v1, "
                "and STT_MODEL=whisper-large-v3-turbo."
            ) from exc
        raise

    return (response.text or "").strip()
