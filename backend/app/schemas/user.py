
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.core.roles import UserRole


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    nickname: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=12, max_length=128)
    role: UserRole

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        value = " ".join(value.split())

        if not value:
            raise ValueError("Full name cannot be empty")

        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("nickname")
    @classmethod
    def normalize_nickname(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Nickname cannot be empty")

        return value


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRead(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    nickname: str
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class SalesUserRead(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AssigneeRead(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)



class PasswordResetResponse(BaseModel):
    message: str
