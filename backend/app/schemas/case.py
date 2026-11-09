from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CaseCreate(BaseModel):
    """
    Case number is generated automatically by the backend.
    """
    pass


class CaseStatusUpdate(BaseModel):
    status_code: str = Field(
        min_length=1,
        max_length=50,
    )


class CaseAssignmentUpdate(BaseModel):
    assigned_to_id: UUID | None


class CaseAssigneeRead(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class CaseRead(BaseModel):
    id: UUID
    case_number: str
    status_id: UUID
    assigned_to_id: UUID | None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    assigned_to: CaseAssigneeRead | None = None

    model_config = ConfigDict(from_attributes=True)

    
class CaseListItem(BaseModel):
    id: UUID
    case_number: str

    status_id: UUID
    status_code: str

    assigned_to_id: UUID | None
    created_by_id: UUID

    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    assigned_to: CaseAssigneeRead | None = None

    model_config = ConfigDict(from_attributes=True)


class CaseListResponse(BaseModel):
    items: list[CaseListItem]

    total: int
    page: int
    page_size: int
    pages: int
