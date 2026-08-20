from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuizShortAnswerQuestion(Base):
    __tablename__ = "quiz_short_answer_questions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    quiz_id: Mapped[int] = mapped_column(
        ForeignKey(
            "quizzes.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    topic: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    expected_answer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    quiz = relationship(
        "Quiz",
        back_populates="short_answer_questions",
    )