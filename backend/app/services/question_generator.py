"""Generate initial interview questions from parsed resume using GPT-4o-mini."""
import json
import logging
import uuid

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.schemas.question import InitialQuestionSet, QuestionItem
from app.utils.cost_tracker import CostAccumulator

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert interview coach helping a NON-TECHNICAL interviewer conduct a thorough technical interview.
The interviewer cannot evaluate technical answers themselves — they need detailed, plain-English guidance.

Generate 10-12 interview questions based on the candidate's resume. Requirements:
- Mix of difficulties: 3 easy, 5 medium, 3-4 hard
- Mix of categories: technical, behavioral, situational, experience-based
- Each question must include actionable guidance for a non-technical interviewer

Return a JSON object with a "questions" array. Each question object must have:
- id: unique string identifier (e.g. "q1", "q2")
- question: the exact question to ask (conversational tone)
- category: "technical" | "behavioral" | "situational" | "experience"
- difficulty: "easy" | "medium" | "hard"
- what_to_listen_for: plain-English description of a STRONG answer (2-3 sentences)
- red_flags: plain-English description of warning signs in a weak answer (1-2 sentences)
- order: integer (1-12)

Return only valid JSON, no markdown."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_initial_questions(resume_json: dict) -> tuple[InitialQuestionSet, CostAccumulator]:
    cost = CostAccumulator()

    resume_text = json.dumps(resume_json, indent=2)[:4000]

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Generate questions for this candidate:\n\n{resume_text}"},
        ],
        temperature=0.7,
    )

    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens
    cost.add("gpt-4o-mini", input_tokens, output_tokens)
    logger.info("Question gen: %d in / %d out tokens", input_tokens, output_tokens)

    data = json.loads(response.choices[0].message.content)
    question_set = InitialQuestionSet.model_validate(data)

    # Ensure every question has an id
    for i, q in enumerate(question_set.questions):
        if not q.id:
            q.id = str(uuid.uuid4())
        if q.order == 0:
            q.order = i + 1

    return question_set, cost
