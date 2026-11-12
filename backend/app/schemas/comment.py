from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class CommentCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=5000,
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Comment cannot be empty.")

        return value


class CommentUpdate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=5000,
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Comment cannot be empty.")

        return value


class CommentAuthorRead(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class CommentRead(BaseModel):
    id: UUID
    case_id: UUID
    user_id: UUID
    author: CommentAuthorRead = Field(validation_alias="user")
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentHistoryRead(BaseModel):
    id: UUID
    comment_id: UUID
    user_id: UUID
    author: CommentAuthorRead = Field(validation_alias="user")
    version: int
    action: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)