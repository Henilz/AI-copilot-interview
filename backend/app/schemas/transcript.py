from pydantic import BaseModel


class TranscriptChunk(BaseModel):
    type: str = "transcript"
    speaker: str  # candidate|interviewer
    text: str
    timestamp: str | None = None


class TranscriptEntry(BaseModel):
    id: str
    speaker: str
    text: str
    timestamp: str | None
    sequence_num: int

    model_config = {"from_attributes": True}
