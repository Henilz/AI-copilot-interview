"""Generate initial interview questions from parsed resume using the configured LLM."""
import json
import logging
import uuid

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.schemas.question import InitialQuestionSet
from app.services.llm_config import NVIDIA_LIGHT_MODEL, client_kwargs, model_name
from app.utils.cost_tracker import CostAccumulator

logger = logging.getLogger(__name__)

client = AsyncOpenAI(**client_kwargs())

SYSTEM_PROMPT = """You are a senior technical interviewer designing a realistic live interview sequence.

Generate 10-12 linked interview questions from the candidate's resume. The questions must feel like one coherent interview, not a disconnected list.

Requirements:
- Make the sequence progressively deeper: calibration -> resume deep-dive -> architecture/trade-offs -> debugging/failure modes -> ownership/behavioral close.
- At least 8 questions must be technical or technical-experience questions tied to specific resume skills, projects, tools, languages, frameworks, or systems.
- Avoid generic prompts such as "Which language do you use most?" unless the resume gives no technical signal.
- Each question after question 1 should connect to an earlier topic, claimed skill, or likely follow-up path. Use phrases like "Earlier you mentioned...", "Building on that...", or "In that same project..." when appropriate.
- Ask for concrete examples, design decisions, constraints, failure modes, debugging process, performance, scaling, security, testing, deployment, or trade-offs.
- Include a balanced mix: 2 foundational, 4-5 intermediate, 3-4 advanced/expert.
- Keep wording conversational, but technically substantive.
- Each question must include actionable evaluation guidance for the interviewer.

Return a JSON object with a "questions" array. Each question object must have:
- id: unique string identifier, e.g. "q1", "q2"
- question: the exact question to ask
- category: "technical" | "architecture" | "debugging" | "behavioral" | "situational" | "experience"
- difficulty: "foundational" | "intermediate" | "applied" | "advanced" | "expert"
- what_to_listen_for: describe the concrete technical signals of a strong answer in 2-3 sentences
- red_flags: describe warning signs in a weak or shallow answer in 1-2 sentences
- order: integer from 1 to 12

Return only valid JSON, no markdown."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_initial_questions(resume_json: dict) -> tuple[InitialQuestionSet, CostAccumulator]:
    cost = CostAccumulator()

    resume_text = json.dumps(resume_json, indent=2)[:6000]

    response = await client.chat.completions.create(
        model=model_name(settings.QUESTION_GENERATION_MODEL, NVIDIA_LIGHT_MODEL),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Generate a linked technical interview plan for this candidate:\n\n{resume_text}"},
        ],
        temperature=0.45,
    )

    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens
    cost.add(model_name(settings.QUESTION_GENERATION_MODEL, NVIDIA_LIGHT_MODEL), input_tokens, output_tokens)
    logger.info("Question gen: %d in / %d out tokens", input_tokens, output_tokens)

    data = json.loads(response.choices[0].message.content)
    question_set = InitialQuestionSet.model_validate(data)

    for i, q in enumerate(question_set.questions):
        if not q.id:
            q.id = str(uuid.uuid4())
        if q.order == 0:
            q.order = i + 1

    return question_set, cost
