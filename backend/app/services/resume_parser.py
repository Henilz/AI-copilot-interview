"""Parse raw resume text into structured JSON using GPT-4o-mini."""
import json
import logging

from openai import APIStatusError, AsyncOpenAI, AuthenticationError
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import settings
from app.schemas.resume import ParsedResume
from app.services.llm_config import NVIDIA_LIGHT_MODEL, client_kwargs, model_name
from app.utils.cost_tracker import CostAccumulator, estimate_tokens

logger = logging.getLogger(__name__)

client = AsyncOpenAI(**client_kwargs())


def _is_retryable_openai_error(exc: BaseException) -> bool:
    if isinstance(exc, AuthenticationError):
        return False
    if isinstance(exc, APIStatusError) and 400 <= exc.status_code < 500:
        return False
    return True

SYSTEM_PROMPT = """You are an expert resume parser. Extract structured information from the resume text provided.

Return a JSON object with EXACTLY these fields:
- name: string or null
- email: string or null
- phone: string or null
- current_role: string or null (most recent job title)
- years_of_experience: number or null (total years)
- education: array of {degree, institution, year}
- work_experience: array of {company, role, duration, responsibilities: [string]}
- skills: {programming_languages: [], frameworks: [], databases: [], tools: [], soft_skills: []}
- certifications: array of strings
- summary: string (2-3 sentence professional summary you write based on the resume)

Use null for missing scalar fields and [] for missing arrays. Return only valid JSON, no markdown."""


@retry(
    retry=retry_if_exception(_is_retryable_openai_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
)
async def parse_resume(raw_text: str) -> tuple[ParsedResume, CostAccumulator]:
    cost = CostAccumulator()

    response = await client.chat.completions.create(
        model=model_name(settings.RESUME_PARSE_MODEL, NVIDIA_LIGHT_MODEL),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Parse this resume:\n\n{raw_text[:8000]}"},
        ],
        temperature=0,
    )

    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens
    cost.add("gpt-4o-mini", input_tokens, output_tokens)
    logger.info("Resume parse: %d in / %d out tokens", input_tokens, output_tokens)

    raw_json = response.choices[0].message.content
    data = json.loads(raw_json)
    parsed = ParsedResume.model_validate(data)
    return parsed, cost
