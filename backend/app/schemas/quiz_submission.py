from pydantic import BaseModel
from typing import Literal


class SubmittedAnswer(BaseModel):
    question_id: int
    selected_answer: Literal["A", "B", "C", "D"]


class QuizSubmissionRequest(BaseModel):
    answers: list[SubmittedAnswer]


class QuestionResult(BaseModel):
    question_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmissionResponse(BaseModel):
    score: int
    total_questions: int
    percentage: float
    results: list[QuestionResult]