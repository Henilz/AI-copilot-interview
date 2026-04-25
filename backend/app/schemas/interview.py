from datetime import datetime

from pydantic import BaseModel


class InterviewCreate(BaseModel):
    candidate_name: str | None = None
    job_role: str | None = None


class InterviewResponse(BaseModel):
    id: str
    status: str
    candidate_name: str | None
    job_role: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
