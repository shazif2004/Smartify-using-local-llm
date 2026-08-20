from datetime import datetime

from pydantic import BaseModel, ConfigDict

from pydantic import BaseModel, Field


class PastedDocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    character_count: int
    uploaded_at: datetime
    owner_id: int