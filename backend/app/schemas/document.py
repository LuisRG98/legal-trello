from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PDFUploadItemResult(BaseModel):
    filename: str
    case_number: str | None = None
    success: bool
    message: str


class PDFUploadResponse(BaseModel):
    results: list[PDFUploadItemResult]
    total: int
    succeeded: int
    failed: int


class DocumentRead(BaseModel):
    id: UUID
    case_id: UUID
    original_filename: str
    content_type: str
    file_size: int
    uploaded_by_id: UUID
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)