"""Celery tasks for async resume parsing."""
import asyncio
import logging

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.models.resume import Resume
from app.services.resume_parser import parse_resume
from app.utils.file_utils import extract_text

logger = logging.getLogger(__name__)

sync_engine = create_engine(settings.SYNC_DATABASE_URL)
SyncSession = sessionmaker(bind=sync_engine)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def parse_resume_task(self, resume_id: str, file_bytes: list[int], content_type: str) -> dict:
    """Extract text from uploaded file and parse resume with GPT-4o-mini."""
    with SyncSession() as db:
        resume = db.execute(select(Resume).where(Resume.id == resume_id)).scalar_one_or_none()
        if not resume:
            logger.error("Resume %s not found", resume_id)
            return {"status": "failed", "error": "Resume not found"}

        resume.parsing_status = "processing"
        db.commit()

        try:
            raw_bytes = bytes(file_bytes)
            raw_text = extract_text(raw_bytes, content_type)

            if not raw_text.strip():
                raise ValueError("No text could be extracted from the file")

            # Run async parse_resume inside a new event loop
            parsed, cost = asyncio.run(parse_resume(raw_text))

            resume.raw_text = raw_text
            resume.parsed_json = parsed.model_dump()
            resume.parsing_status = "complete"
            db.commit()

            # Cache in Redis (sync)
            import redis
            r = redis.from_url(settings.REDIS_URL)
            import json
            r.set(
                f"interview:{resume.interview_id}:resume",
                json.dumps(parsed.model_dump()),
                ex=86400,
            )

            logger.info(
                "Resume parsed for interview %s | cost=$%.6f",
                resume.interview_id,
                cost.total_cost_usd,
            )
            return {"status": "complete", "interview_id": resume.interview_id}

        except Exception as exc:
            logger.exception("Resume parsing failed for %s: %s", resume_id, exc)
            resume.parsing_status = "failed"
            resume.error_message = str(exc)
            db.commit()
            raise self.retry(exc=exc)
