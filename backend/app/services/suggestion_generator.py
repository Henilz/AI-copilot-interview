"""Real-time suggestion generation with streaming and rolling-summary context management."""
import asyncio
import json
import logging
import time
from typing import AsyncGenerator

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.redis_client import redis_get, redis_get_int, redis_lrange, redis_llen, redis_set
from app.schemas.question import SuggestionSet
from app.services.llm_config import NVIDIA_LIGHT_MODEL, client_kwargs, model_name
from app.utils.cost_tracker import CostAccumulator

logger = logging.getLogger(__name__)

client = AsyncOpenAI(**client_kwargs())

SUGGESTION_SYSTEM_PROMPT = """You are an expert interview coach assisting a non-technical interviewer in real-time.

Your job: suggest the 3 MOST VALUABLE follow-up questions based on what has (and hasn't) been discussed so far.

Consider:
- Gaps in the candidate's resume that haven't been probed
- Answers that were vague or need clarification
- Unexplored technical or behavioral areas
- Logical next steps in the interview flow

Return a JSON object with a "suggestions" array. Each item must have:
- question: exact question to ask (conversational, non-technical language)
- rationale: why this question is valuable right now (1 sentence, for the interviewer)
- category: "technical" | "behavioral" | "situational" | "experience"
- difficulty: "easy" | "medium" | "hard"
- what_to_listen_for: plain-English description of a good answer (1-2 sentences)

Return only valid JSON, no markdown."""

ROLLING_SUMMARY_PROMPT = """Summarize the following interview exchanges in under 200 words.
Focus on: technical depth shown, topics covered, candidate communication quality, any red flags noticed.
Write in plain text (not JSON).

Exchanges:
{exchanges}"""


async def build_suggestion_context(interview_id: str) -> str:
    """Assemble the context string for the suggestion prompt."""
    resume_data = await redis_get(f"interview:{interview_id}:resume") or {}
    resume_summary = _resume_summary(resume_data)

    # Last 10 verbatim transcript exchanges
    transcript_len = await redis_llen(f"interview:{interview_id}:transcript")
    start = max(0, transcript_len - 10)
    recent = await redis_lrange(f"interview:{interview_id}:transcript", start, -1)
    recent_text = _format_exchanges(recent)

    # All rolling summaries (older context)
    summaries = await redis_lrange(f"interview:{interview_id}:rolling_summaries", 0, -1)
    summary_text = "\n---\n".join(summaries) if summaries else "No prior summary yet."

    # Already-asked questions
    asked_raw = await redis_get(f"interview:{interview_id}:questions:asked") or []
    asked_text = "\n".join(f"- {q}" for q in asked_raw) if asked_raw else "None yet."

    return f"""CANDIDATE RESUME SUMMARY:
{resume_summary}

INTERVIEW HISTORY (summarised):
{summary_text}

RECENT EXCHANGES (verbatim, last 10):
{recent_text}

QUESTIONS ALREADY ASKED:
{asked_text}"""


async def stream_suggestions(
    interview_id: str,
) -> AsyncGenerator[str, None]:
    """Stream raw tokens from OpenAI, then yield a final complete JSON message."""
    context = await build_suggestion_context(interview_id)

    full_content = ""
    async with client.chat.completions.stream(
        model=model_name(settings.SUGGESTION_MODEL, NVIDIA_LIGHT_MODEL),
        messages=[
            {"role": "system", "content": SUGGESTION_SYSTEM_PROMPT},
            {"role": "user", "content": context},
        ],
        temperature=0.8,
        response_format={"type": "json_object"},
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_content += delta
                yield json.dumps({"type": "suggestion_token", "content": delta})

    # Parse and validate complete JSON
    try:
        data = json.loads(full_content)
        suggestion_set = SuggestionSet.model_validate(data)
        yield json.dumps({
            "type": "suggestion_complete",
            "suggestions": [s.model_dump() for s in suggestion_set.suggestions],
        })

        # Persist suggested questions to Redis for context tracking
        asked = [s.question for s in suggestion_set.suggestions]
        existing = await redis_get(f"interview:{interview_id}:suggestions:latest") or []
        await redis_set(
            f"interview:{interview_id}:suggestions:latest",
            [s.model_dump() for s in suggestion_set.suggestions],
            ttl=86400,
        )
    except (json.JSONDecodeError, Exception) as exc:
        logger.error("Failed to parse suggestion JSON: %s", exc)
        yield json.dumps({"type": "suggestion_error", "message": "Failed to parse suggestions."})


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
async def generate_rolling_summary(interview_id: str, exchanges: list[dict]) -> str:
    """Summarise a batch of exchanges and store in Redis."""
    exchanges_text = _format_exchanges(exchanges)
    prompt = ROLLING_SUMMARY_PROMPT.format(exchanges=exchanges_text)

    response = await client.chat.completions.create(
        model=model_name(settings.TRANSCRIPT_SUMMARY_MODEL, NVIDIA_LIGHT_MODEL),
        messages=[
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        max_tokens=300,
    )

    summary = response.choices[0].message.content.strip()

    # Append to Redis rolling summaries list
    import redis.asyncio as aioredis
    from app.redis_client import get_redis
    r = get_redis()
    await r.rpush(f"interview:{interview_id}:rolling_summaries", summary)

    logger.info("Rolling summary generated for interview %s", interview_id)
    return summary


async def maybe_trigger_rolling_summary(interview_id: str) -> None:
    """Check exchange count; if it's a multiple of ROLLING_SUMMARY_INTERVAL, run a summary."""
    count = await redis_get_int(f"interview:{interview_id}:exchange_count")
    interval = settings.ROLLING_SUMMARY_INTERVAL
    last_at = await redis_get_int(f"interview:{interview_id}:last_summary_at")

    if count > 0 and count % interval == 0 and count != last_at:
        from app.redis_client import redis_set as rs
        await rs(f"interview:{interview_id}:last_summary_at", count)
        # Fetch the last `interval` exchanges
        start = max(0, count - interval)
        exchanges = await redis_lrange(f"interview:{interview_id}:transcript", start, count - 1)
        asyncio.create_task(generate_rolling_summary(interview_id, exchanges))


def _resume_summary(resume: dict) -> str:
    if not resume:
        return "No resume data available."
    name = resume.get("name", "Candidate")
    role = resume.get("current_role", "Unknown role")
    yoe = resume.get("years_of_experience", "?")
    skills = resume.get("skills", {})
    langs = ", ".join(skills.get("programming_languages", [])[:5])
    return f"{name} — {role}, {yoe} years exp. Key languages: {langs or 'N/A'}"


def _format_exchanges(exchanges: list) -> str:
    lines = []
    for ex in exchanges:
        if isinstance(ex, dict):
            speaker = ex.get("speaker", "?").capitalize()
            text = ex.get("text", "")
            ts = ex.get("timestamp", "")
            lines.append(f"[{ts}] {speaker}: {text}")
        else:
            lines.append(str(ex))
    return "\n".join(lines) if lines else "No exchanges yet."
