from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Difficulty = Literal["easy", "medium", "hard"]


class QuizGenerateRequest(BaseModel):
    difficulty: Difficulty = "medium"
    number_of_questions: int = Field(default=5, ge=1, le=10)


class GeneratedQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str


class GeneratedShortAnswerQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    question: str
    expected_answer: str


class GeneratedQuiz(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    questions: list[GeneratedQuestion]
    short_answer_questions: list[GeneratedShortAnswerQuestion]


class QuizQuestionResponse(BaseModel):
    id: int
    question: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str


class QuizShortAnswerResponse(BaseModel):
    id: int
    topic: str
    question: str


class QuizResponse(BaseModel):
    id: int
    title: str
    document_id: int
    questions: list[QuizQuestionResponse]
    short_answer_questions: list[QuizShortAnswerResponse]
