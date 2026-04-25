from datetime import datetime

from pydantic import BaseModel


# LLM-structured output schema
class Education(BaseModel):
    degree: str | None = None
    institution: str | None = None
    year: str | None = None


class WorkExperience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    responsibilities: list[str] = []


class Skills(BaseModel):
    programming_languages: list[str] = []
    frameworks: list[str] = []
    databases: list[str] = []
    tools: list[str] = []
    soft_skills: list[str] = []


class ParsedResume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    current_role: str | None = None
    years_of_experience: float | None = None
    education: list[Education] = []
    work_experience: list[WorkExperience] = []
    skills: Skills = Skills()
    certifications: list[str] = []
    summary: str | None = None


class ResumeStatusResponse(BaseModel):
    interview_id: str
    parsing_status: str
    parsed_data: ParsedResume | None = None
    error_message: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
