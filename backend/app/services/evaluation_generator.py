"""Final interview evaluation using GPT-4o (not mini) for quality output."""
import json
import logging

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.schemas.evaluation import EvaluationResult
from app.services.llm_config import (
    NVIDIA_LIGHT_MODEL,
    NVIDIA_STRONG_MODEL,
    client_kwargs,
    model_name,
)
from app.utils.cost_tracker import CostAccumulator, estimate_tokens

logger = logging.getLogger(__name__)

# Sync client for use inside Celery tasks
sync_client = OpenAI(**client_kwargs())

CHUNK_SUMMARY_PROMPT = """You are summarising a portion of a technical interview transcript.
Extract and preserve the key Q&A pairs, technical depth demonstrated, and any notable strengths or concerns.
Keep it under 500 words.

Transcript chunk:
{chunk}"""

EVALUATION_SYSTEM_PROMPT = """You are a senior technical interviewer providing a comprehensive post-interview evaluation.
Base ALL assessments on specific evidence from the transcript — no speculation.

You must return a JSON object with EXACTLY these fields:
- overall_recommendation: "hire" | "no_hire" | "maybe"
- recommendation_reason: string (2-3 sentences justifying the recommendation)
- strengths: array of {area: string, description: string, transcript_citation: string}
- weaknesses: array of {area: string, description: string, transcript_citation: string}
- skill_matrix: array of {skill: string, claimed: bool, demonstrated: "demonstrated"|"partial"|"not_shown", evidence: string}
- communication_score: integer 1-10
- communication_notes: string
- red_flags: array of strings (each a specific concern with evidence)
- qa_review: array of {question: string, candidate_response_summary: string, assessment: "strong"|"adequate"|"weak", notes: string}
- suggested_next_round_focus: array of strings (areas to probe deeper in next interview)

Return only valid JSON, no markdown."""


def chunk_text(text: str, max_tokens: int) -> list[str]:
    """Split text into chunks of approximately max_tokens."""
    words = text.split()
    chunks = []
    current: list[str] = []
    current_tokens = 0

    for word in words:
        word_tokens = max(1, len(word) // 4)
        if current_tokens + word_tokens > max_tokens and current:
            chunks.append(" ".join(current))
            current = [word]
            current_tokens = word_tokens
        else:
            current.append(word)
            current_tokens += word_tokens

    if current:
        chunks.append(" ".join(current))
    return chunks


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=5, max=30))
def summarise_transcript_chunk(chunk: str) -> tuple[str, int, int]:
    response = sync_client.chat.completions.create(
        model=model_name(settings.TRANSCRIPT_SUMMARY_MODEL, NVIDIA_LIGHT_MODEL),
        messages=[
            {"role": "user", "content": CHUNK_SUMMARY_PROMPT.format(chunk=chunk)},
        ],
        temperature=0,
        max_tokens=600,
    )
    return (
        response.choices[0].message.content.strip(),
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
    )


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=5, max=30))
def run_final_evaluation(
    resume_json: dict,
    transcript_text: str,
    questions: list[dict],
) -> tuple[EvaluationResult, CostAccumulator]:
    cost = CostAccumulator()

    # Compress transcript if too long
    transcript_tokens = estimate_tokens(transcript_text)
    if transcript_tokens > settings.TRANSCRIPT_CHUNK_THRESHOLD_TOKENS:
        logger.info("Transcript too long (%d tokens); chunking…", transcript_tokens)
        chunks = chunk_text(transcript_text, settings.TRANSCRIPT_CHUNK_SIZE_TOKENS)
        summaries = []
        for chunk in chunks:
            summary, inp, out = summarise_transcript_chunk(chunk)
            cost.add("gpt-4o-mini", inp, out)
            summaries.append(summary)
        transcript_text = "\n\n---\n\n".join(summaries)
        logger.info("Transcript compressed to %d chunk summaries", len(summaries))

    resume_text = json.dumps(resume_json, indent=2)[:3000]
    questions_text = "\n".join(
        f"Q{i+1}: {q.get('question_text', q.get('question', ''))}"
        for i, q in enumerate(questions[:30])
    )

    prompt = f"""CANDIDATE RESUME:
{resume_text}

INTERVIEW TRANSCRIPT:
{transcript_text[:10000]}

QUESTIONS ASKED DURING INTERVIEW:
{questions_text}"""

    response = sync_client.chat.completions.create(
        model=model_name(settings.EVALUATION_MODEL, NVIDIA_STRONG_MODEL),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    cost.add("gpt-4o", response.usage.prompt_tokens, response.usage.completion_tokens)
    logger.info(
        "Final eval: %d in / %d out tokens (GPT-4o)",
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
    )

    data = json.loads(response.choices[0].message.content)
    result = EvaluationResult.model_validate(data)
    return result, cost
