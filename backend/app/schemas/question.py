from datetime import datetime

from pydantic import BaseModel


class QuestionItem(BaseModel):
    id: str | None = None
    question: str
    category: str | None = None
    difficulty: str | None = None
    what_to_listen_for: str | None = None
    red_flags: str | None = None
    rationale: str | None = None
    order: int = 0


class InitialQuestionSet(BaseModel):
    questions: list[QuestionItem]


class SuggestionItem(BaseModel):
    question: str
    rationale: str | None = None
    category: str | None = None
    difficulty: str | None = None
    what_to_listen_for: str | None = None


class SuggestionSet(BaseModel):
    suggestions: list[SuggestionItem]


class QuestionResponse(BaseModel):
    id: str
    interview_id: str
    phase: str
    question_text: str
    category: str | None
    difficulty: str | None
    what_to_listen_for: str | None
    red_flags: str | None
    rationale: str | None
    order_num: int
    is_asked: bool
    created_at: datetime

    model_config = {"from_attributes": True}
