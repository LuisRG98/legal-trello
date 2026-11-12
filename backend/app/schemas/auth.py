
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    password_change_required: bool = False


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    nickname: str
    email: EmailStr
    role: str
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class TemporaryPasswordChangeRequest(BaseModel):
    new_password: str = Field(
        min_length=12,
        max_length=128,
    )


class PasswordChangeResponse(BaseModel):
    message: str



class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        min_length=32,
        max_length=128,
    )

    new_password: str = Field(
        min_length=12,
        max_length=128,
    )


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordResponse(BaseModel):
    message: str
