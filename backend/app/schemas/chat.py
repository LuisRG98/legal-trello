from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatRoom(str, Enum):
    GENERAL = "general"
    MANAGEMENT = "management"


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    room: ChatRoom
    author_id: UUID | None
    author_name: str
    author_role: str
    content: str
    created_at: datetime
    expires_at: datetime
