from pydantic import BaseModel


class ShortAnswerSubmissionItem(BaseModel):
    question_id: int
    answer: str


class ShortAnswerSubmissionRequest(BaseModel):
    answers: list[ShortAnswerSubmissionItem]


class ShortAnswerResult(BaseModel):
    question_id: int
    topic: str
    question: str
    student_answer: str
    expected_answer: str


class ShortAnswerSubmissionResponse(BaseModel):
    results: list[ShortAnswerResult]