import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String(20), default="created")  # created|active|ended
    candidate_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resume: Mapped["Resume"] = relationship("Resume", back_populates="interview", uselist=False)
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="interview")
    transcripts: Mapped[list["Transcript"]] = relationship("Transcript", back_populates="interview")
    rolling_summaries: Mapped[list["RollingSummary"]] = relationship("RollingSummary", back_populates="interview")
    evaluation: Mapped["Evaluation"] = relationship("Evaluation", back_populates="interview", uselist=False)
