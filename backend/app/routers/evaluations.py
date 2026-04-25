"""Evaluation status polling and retrieval."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationResult, EvaluationStatusResponse
from app.utils.auth import get_current_user

router = APIRouter()


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
