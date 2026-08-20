from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(primary_key=True)

    attempt_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_attempts.id")
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_questions.id")
    )

    selected_answer: Mapped[str] = mapped_column(String(1))

    is_correct: Mapped[bool] = mapped_column(Boolean)

    attempt = relationship(
        "QuizAttempt",
        back_populates="answers",
    )

    question = relationship(
        "QuizQuestion",
        back_populates="answers",
    )