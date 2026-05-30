"""Evaluation status polling and retrieval."""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationResult, EvaluationStatusResponse
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/evaluations/files/{key:path}")
async def serve_local_report(key: str):
    """Serve PDFs written by the local-disk fallback (dev only).

    No auth: the path embeds the interview UUID, which is unguessable. If you
    deploy to prod, configure AWS_* so S3 presigned URLs are used instead.
    """
    base = Path(settings.LOCAL_REPORTS_DIR).resolve()
    target = (base / key).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(target, media_type="application/pdf", filename=target.name)


@router.get("/evaluations/{evaluation_id}/status", response_model=EvaluationStatusResponse)
async def get_evaluation_status(
    evaluation_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    eval_result = None
    if evaluation.status == "complete" and evaluation.structured_json:
        eval_result = EvaluationResult.model_validate(evaluation.structured_json)

    return EvaluationStatusResponse(
        id=evaluation.id,
        interview_id=evaluation.interview_id,
        status=evaluation.status,
        result=eval_result,
        pdf_url=evaluation.pdf_url,
        total_cost_usd=evaluation.total_cost_usd,
        error_message=evaluation.error_message,
        created_at=evaluation.created_at,
        completed_at=evaluation.completed_at,
    )


@router.get("/interviews/{interview_id}/evaluation", response_model=EvaluationStatusResponse)
async def get_evaluation_by_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Evaluation).where(Evaluation.interview_id == interview_id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this interview")

    eval_result = None
    if evaluation.status == "complete" and evaluation.structured_json:
        eval_result = EvaluationResult.model_validate(evaluation.structured_json)

    return EvaluationStatusResponse(
        id=evaluation.id,
        interview_id=evaluation.interview_id,
        status=evaluation.status,
        result=eval_result,
        pdf_url=evaluation.pdf_url,
        total_cost_usd=evaluation.total_cost_usd,
        error_message=evaluation.error_message,
        created_at=evaluation.created_at,
        completed_at=evaluation.completed_at,
    )
