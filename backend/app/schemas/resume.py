import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    original_file_name: str
    file_type: str
    version: int
    is_active: bool
    parsing_status: str
    parsing_method: str | None
    parsing_error: str | None
    created_at: datetime


class ResumeParsedDataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parsing_status: str
    parsing_method: str | None
    parsed_data: dict | None
