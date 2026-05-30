"""Provider-aware LLM client/model configuration."""

from app.config import settings

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_LIGHT_MODEL = "openai/gpt-oss-20b"
NVIDIA_STRONG_MODEL = "openai/gpt-oss-120b"


def is_nvidia_key() -> bool:
    return settings.OPENAI_API_KEY.startswith("nvapi-")


def client_kwargs() -> dict[str, str]:
    base_url = settings.OPENAI_BASE_URL.strip()
    if not base_url and is_nvidia_key():
        base_url = NVIDIA_BASE_URL

    kwargs = {"api_key": settings.OPENAI_API_KEY}
    if base_url:
        kwargs["base_url"] = base_url
    return kwargs


def model_name(configured: str, nvidia_default: str) -> str:
    if is_nvidia_key() and configured.startswith("gpt-"):
        return nvidia_default
    return configured
