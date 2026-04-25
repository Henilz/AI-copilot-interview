from datetime import datetime

from pydantic import BaseModel


class StrengthItem(BaseModel):
    area: str
    description: str
    transcript_citation: str | None = None


class WeaknessItem(BaseModel):
    area: str
    description: str
    transcript_citation: str | None = None


class SkillMatrixItem(BaseModel):
    skill: str
    claimed: bool = True
    demonstrated: str  # demonstrated|partial|not_shown
    evidence: str | None = None


class QAReviewItem(BaseModel):
    question: str
    candidate_response_summary: str
    assessment: str  # strong|adequate|weak
    notes: str | None = None


class EvaluationResult(BaseModel):
    overall_recommendation: str  # hire|no_hire|maybe
    recommendation_reason: str
    strengths: list[StrengthItem] = []
    weaknesses: list[WeaknessItem] = []
    skill_matrix: list[SkillMatrixItem] = []
    communication_score: int  # 1-10
    communication_notes: str | None = None
    red_flags: list[str] = []
    qa_review: list[QAReviewItem] = []
    suggested_next_round_focus: list[str] = []


class EvaluationStatusResponse(BaseModel):
    id: str
    interview_id: str
    status: str
    result: EvaluationResult | None = None
    pdf_url: str | None = None
    total_cost_usd: float | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
