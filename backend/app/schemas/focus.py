from pydantic import BaseModel, ConfigDict, Field


class FocusConcept(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    plain_explanation: str
    why_it_matters: str
    key_points: list[str] = Field(min_length=2, max_length=4)
    check_your_understanding: str


class FocusBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    concepts: list[FocusConcept] = Field(min_length=2, max_length=8)
