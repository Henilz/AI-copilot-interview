"""Celery tasks for async interview evaluation and PDF generation."""
import json
import logging
from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.models.evaluation import Evaluation
from app.models.interview import Interview
from app.models.question import Question
from app.models.resume import Resume
from app.models.transcript import Transcript
from app.services.evaluation_generator import run_final_evaluation
from app.services.pdf_generator import generate_pdf_bytes
from app.services.s3_service import generate_presigned_url, upload_pdf

logger = logging.getLogger(__name__)

sync_engine = create_engine(settings.SYNC_DATABASE_URL)
SyncSession = sessionmaker(bind=sync_engine)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def generate_evaluation_task(self, interview_id: str, evaluation_id: str) -> dict:
    """Full evaluation pipeline: load data → LLM eval → PDF → S3 → notify."""
    with SyncSession() as db:
        evaluation = db.execute(
            select(Evaluation).where(Evaluation.id == evaluation_id)
        ).scalar_one_or_none()
        if not evaluation:
            return {"status": "failed", "error": "Evaluation not found"}

        evaluation.status = "processing"
        db.commit()

        try:
            # ---- Load data from Postgres ----
            interview = db.execute(
                select(Interview).where(Interview.id == interview_id)
            ).scalar_one()

            resume_row = db.execute(
                select(Resume).where(Resume.interview_id == interview_id)
            ).scalar_one_or_none()
            resume_json = resume_row.parsed_json if resume_row else {}

            transcripts = db.execute(
                select(Transcript)
                .where(Transcript.interview_id == interview_id)
                .order_by(Transcript.sequence_num)
            ).scalars().all()

            questions = db.execute(
                select(Question)
                .where(Question.interview_id == interview_id, Question.is_asked == True)
                .order_by(Question.created_at)
            ).scalars().all()

            # ---- Format transcript as plain text ----
            transcript_lines = []
            for t in transcripts:
                ts = f"[{t.timestamp}] " if t.timestamp else ""
                transcript_lines.append(f"{ts}{t.speaker.capitalize()}: {t.text}")
            transcript_text = "\n".join(transcript_lines)

            questions_dicts = [
                {"question_text": q.question_text, "category": q.category, "phase": q.phase}
                for q in questions
            ]

            # ---- Run LLM evaluation ----
            result, cost = run_final_evaluation(resume_json, transcript_text, questions_dicts)

            # ---- Generate PDF ----
            interview_data = {
                "id": interview.id,
                "candidate_name": interview.candidate_name or "Candidate",
                "job_role": interview.job_role or "Position",
                "date": interview.created_at.strftime("%B %d, %Y"),
            }
            pdf_bytes = generate_pdf_bytes(result.model_dump(), interview_data)

            # ---- Upload to S3 ----
            s3_key = f"evaluations/{interview_id}/report.pdf"
            upload_pdf(pdf_bytes, s3_key)
            pdf_url = generate_presigned_url(s3_key, expiry_seconds=86400)

            # ---- Persist evaluation ----
            evaluation.structured_json = result.model_dump()
            evaluation.pdf_url = pdf_url
            evaluation.pdf_s3_key = s3_key
            evaluation.status = "complete"
            evaluation.completed_at = datetime.utcnow()
            evaluation.total_input_tokens = cost.total_input_tokens
            evaluation.total_output_tokens = cost.total_output_tokens
            evaluation.total_cost_usd = cost.total_cost_usd
            db.commit()

            # ---- Notify via Redis pub/sub ----
            import redis as sync_redis
            r = sync_redis.from_url(settings.REDIS_URL)
            r.publish(
                f"interview:{interview_id}:channel",
                json.dumps({
                    "type": "evaluation_ready",
                    "evaluation_id": evaluation_id,
                    "pdf_url": pdf_url,
                }),
            )

            logger.info(
                "Evaluation complete for interview %s | cost=$%.4f",
                interview_id,
                cost.total_cost_usd,
            )
            return {"status": "complete", "evaluation_id": evaluation_id, "pdf_url": pdf_url}

        except Exception as exc:
            logger.exception("Evaluation failed for interview %s: %s", interview_id, exc)
            evaluation.status = "failed"
            evaluation.error_message = str(exc)
            db.commit()
            raise self.retry(exc=exc)
