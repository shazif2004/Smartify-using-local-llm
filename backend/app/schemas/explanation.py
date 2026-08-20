from typing import Literal

from pydantic import BaseModel, Field


ExplanationMode = Literal[
    "explain_like_im_10",
    "college_level",
    "simple_english",
    "thirty_second_summary",
    "exam_review",
]


class ExplanationRequest(BaseModel):
    selected_text: str = Field(
        min_length=20,
        max_length=12000,
    )
    mode: ExplanationMode


class ExplanationResponse(BaseModel):
    document_id: int
    mode: ExplanationMode
    explanation: str