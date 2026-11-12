
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_password_change_user,
)
from app.core.security import (
    create_access_token,
    create_password_change_token,
    hash_password,
)
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    TemporaryPasswordChangeRequest,
    PasswordChangeResponse,
)
from app.services.auth import authenticate_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:

    user = authenticate_user(
        db=db,
        email=str(credentials.email),
        password=credentials.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.must_change_password:

        if (
            user.temporary_password_expires_at is None
            or user.temporary_password_expires_at <= datetime.now(timezone.utc)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Temporary password expired. Contact an administrator.",
            )

        token = create_password_change_token(
            subject=str(user.id),
            token_version=user.token_version,
        )

        return TokenResponse(
            access_token=token,
            password_change_required=True,
        )

    access_token = create_access_token(
        subject=str(user.id),
        token_version=user.token_version,
    )

    return TokenResponse(
        access_token=access_token,
        password_change_required=False,
    )


@router.post(
    "/change-temporary-password",
    response_model=PasswordChangeResponse,
)
def change_temporary_password(
    payload: TemporaryPasswordChangeRequest,
    current_user: User = Depends(get_password_change_user),
    db: Session = Depends(get_db),
) -> PasswordChangeResponse:

    current_user.password_hash = hash_password(
        payload.new_password
    )

    current_user.must_change_password = False
    current_user.temporary_password_expires_at = None
    current_user.password_changed_at = datetime.now(timezone.utc)

    # Invalidate the temporary token and any previous sessions.
    current_user.token_version += 1

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return PasswordChangeResponse(
        message="Password changed successfully. Please sign in again."
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
