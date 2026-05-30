"""Interview management endpoints: create, upload resume, generate questions, end interview."""
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.evaluation import Evaluation
from app.models.interview import Interview
from app.models.question import Question
from app.models.resume import Resume
from app.redis_client import redis_get, redis_set
from app.schemas.interview import InterviewCreate, InterviewResponse
from app.schemas.question import QuestionResponse
from app.schemas.resume import ResumeStatusResponse
from app.services.question_generator import generate_initial_questions
from app.utils.auth import get_current_user
from app.utils.file_utils import ALLOWED_CONTENT_TYPES, extract_text

router = APIRouter()

MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


# ── Create interview ────────────────────────────────────────────────────────

@router.post("/interviews", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    body: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    interview = Interview(
        id=str(uuid.uuid4()),
        candidate_name=body.candidate_name,
        job_role=body.job_role,
    )
    db.add(interview)
    await db.flush()
    await db.commit()
    await db.refresh(interview)
    return interview


# ── Get interview ───────────────────────────────────────────────────────────

@router.get("/interviews/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    interview = await _get_interview_or_404(interview_id, db)
    return interview


# ── Upload resume ───────────────────────────────────────────────────────────

@router.post("/interviews/{interview_id}/resume", status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    interview_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    interview = await _get_interview_or_404(interview_id, db)

    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and DOCX files are accepted",
        )

    # Read and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    # Create or reset resume record
    existing = await db.execute(select(Resume).where(Resume.interview_id == interview_id))
    resume_row = existing.scalar_one_or_none()

    if resume_row:
        resume_row.parsing_status = "pending"
        resume_row.parsed_json = None
        resume_row.raw_text = None
        resume_row.error_message = None
        resume_row.original_filename = file.filename
        resume_id = resume_row.id
    else:
        resume_row = Resume(
            id=str(uuid.uuid4()),
            interview_id=interview_id,
            parsing_status="pending",
            original_filename=file.filename,
        )
        db.add(resume_row)
        resume_id = resume_row.id

    await db.flush()
    await db.commit()

    # Enqueue parsing via Celery after the resume row is committed so the worker
    # and immediate status polls can both see it.
    background_tasks.add_task(
        _enqueue_resume_parse, resume_id, file_bytes, file.content_type
    )

    return {"interview_id": interview_id, "resume_id": resume_id, "status": "processing"}


def _enqueue_resume_parse(resume_id: str, file_bytes: bytes, content_type: str) -> None:
    from app.tasks.resume_tasks import parse_resume_task
    parse_resume_task.delay(resume_id, list(file_bytes), content_type)


# ── Resume status ───────────────────────────────────────────────────────────

@router.get("/interviews/{interview_id}/resume/status", response_model=ResumeStatusResponse)
async def get_resume_status(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Resume).where(Resume.interview_id == interview_id))
    resume_row = result.scalar_one_or_none()
    if not resume_row:
        raise HTTPException(status_code=404, detail="No resume uploaded for this interview")

    parsed_data = None
    if resume_row.parsing_status == "complete" and resume_row.parsed_json:
        from app.schemas.resume import ParsedResume
        parsed_data = ParsedResume.model_validate(resume_row.parsed_json)

    return ResumeStatusResponse(
        interview_id=interview_id,
        parsing_status=resume_row.parsing_status,
        parsed_data=parsed_data,
        error_message=resume_row.error_message,
        updated_at=resume_row.updated_at,
    )


# ── Initial questions ───────────────────────────────────────────────────────

@router.get("/interviews/{interview_id}/initial-questions", response_model=list[QuestionResponse])
async def get_initial_questions(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await _get_interview_or_404(interview_id, db)

    # Return cached questions if already generated
    cached_key = f"interview:{interview_id}:questions:initial"
    cached = await redis_get(cached_key)
    if cached:
        existing = await db.execute(
            select(Question)
            .where(Question.interview_id == interview_id, Question.phase == "initial")
            .order_by(Question.order_num)
        )
        rows = existing.scalars().all()
        if rows:
            return rows

    # Load resume JSON
    resume_json = await redis_get(f"interview:{interview_id}:resume")
    if not resume_json:
        result = await db.execute(select(Resume).where(Resume.interview_id == interview_id))
        resume_row = result.scalar_one_or_none()
        if not resume_row or resume_row.parsing_status != "complete":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume must be parsed before generating questions",
            )
        resume_json = resume_row.parsed_json

    # Generate with LLM
    question_set, cost = await generate_initial_questions(resume_json)

    # Persist to DB
    db_questions = []
    for q in question_set.questions:
        row = Question(
            id=str(uuid.uuid4()),
            interview_id=interview_id,
            phase="initial",
            question_text=q.question,
            category=q.category,
            difficulty=q.difficulty,
            what_to_listen_for=q.what_to_listen_for,
            red_flags=q.red_flags,
            order_num=q.order,
        )
        db.add(row)
        db_questions.append(row)

    await db.flush()
    await redis_set(cached_key, True, ttl=86400)

    return db_questions


# ── Mark question as asked ──────────────────────────────────────────────────

@router.patch("/interviews/{interview_id}/questions/{question_id}/asked")
async def mark_question_asked(
    interview_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Question).where(Question.id == question_id, Question.interview_id == interview_id)
    )
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    question.is_asked = True
    await db.flush()
    return {"id": question_id, "is_asked": True}


# ── End interview ───────────────────────────────────────────────────────────

@router.post("/interviews/{interview_id}/end", status_code=status.HTTP_202_ACCEPTED)
async def end_interview(
    interview_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    interview = await _get_interview_or_404(interview_id, db)

    if interview.status == "ended":
        # Return existing evaluation if already ended
        result = await db.execute(select(Evaluation).where(Evaluation.interview_id == interview_id))
        existing_eval = result.scalar_one_or_none()
        if existing_eval:
            return {"interview_id": interview_id, "evaluation_id": existing_eval.id, "status": existing_eval.status}

    interview.status = "ended"
    interview.updated_at = datetime.utcnow()

    # Create evaluation record
    evaluation = Evaluation(id=str(uuid.uuid4()), interview_id=interview_id)
    db.add(evaluation)
    await db.flush()
    evaluation_id = evaluation.id
    await db.commit()

    # The evaluation row must be committed before background jobs or immediate
    # polling try to read it.
    background_tasks.add_task(_flush_redis_transcript_to_db, interview_id)
    background_tasks.add_task(_enqueue_evaluation, interview_id, evaluation_id)

    return {"interview_id": interview_id, "evaluation_id": evaluation_id, "status": "processing"}


async def _flush_redis_transcript_to_db(interview_id: str) -> None:
    """Persist any buffered Redis transcript entries to Postgres."""
    from app.database import AsyncSessionLocal
    from app.models.transcript import Transcript as TranscriptModel
    from app.redis_client import redis_lrange, redis_llen

    total = await redis_llen(f"interview:{interview_id}:transcript")
    if total == 0:
        return

    entries = await redis_lrange(f"interview:{interview_id}:transcript", 0, -1)
    async with AsyncSessionLocal() as db:
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            row = TranscriptModel(
                id=str(uuid.uuid4()),
                interview_id=interview_id,
                speaker=entry.get("speaker", "unknown"),
                text=entry.get("text", ""),
                timestamp=entry.get("timestamp"),
                sequence_num=i + 1,
            )
            db.add(row)
        try:
            await db.commit()
        except Exception:
            await db.rollback()


def _enqueue_evaluation(interview_id: str, evaluation_id: str) -> None:
    from app.tasks.evaluation_tasks import generate_evaluation_task
    generate_evaluation_task.delay(interview_id, evaluation_id)


# ── Helper ──────────────────────────────────────────────────────────────────

async def _get_interview_or_404(interview_id: str, db: AsyncSession) -> Interview:
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview
