
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class ActivityActorRead(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)


class CaseActivityRead(BaseModel):
    id: UUID
    case_id: UUID
    actor_id: UUID
    actor: ActivityActorRead
    action: str
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseActivityListResponse(BaseModel):
    items: list[CaseActivityRead]
    total: int
    skip: int
    limit: int
