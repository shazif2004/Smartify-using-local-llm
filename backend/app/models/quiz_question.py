from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True)

    question: Mapped[str] = mapped_column(Text)

    choice_a: Mapped[str] = mapped_column(Text)

    choice_b: Mapped[str] = mapped_column(Text)

    choice_c: Mapped[str] = mapped_column(Text)

    choice_d: Mapped[str] = mapped_column(Text)

    correct_answer: Mapped[str] = mapped_column(String(1))

    explanation: Mapped[str] = mapped_column(Text)

    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id")
    )

    quiz = relationship(
        "Quiz",
        back_populates="questions",
    )

    answers = relationship(
        "QuizAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
    )