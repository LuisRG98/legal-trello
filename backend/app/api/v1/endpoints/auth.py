
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import hashlib

from sqlalchemy import func, select, update

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
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.auth import authenticate_user

from app.models.password_reset_token import PasswordResetToken

from app.services.email import EmailDeliveryError

from app.services.self_service_password_reset import (
    create_password_reset_token,
    send_password_reset_email,
    reset_user_password,
)

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



@router.post(
    "/password/forgot",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Request a password reset email.

    Always return the same response to prevent
    email/account enumeration.
    """

    generic_message = (
        "If an eligible account exists, "
        "a password recovery email will be sent."
    )

    normalized_email = str(payload.email).strip().lower()

    user = db.scalar(
        select(User).where(
            func.lower(User.email) == normalized_email
        )
    )

    if user is None or not user.is_active:
        return ForgotPasswordResponse(
            message=generic_message
        )

    token = create_password_reset_token(
        db=db,
        user=user,
    )

    try:
        # Persist the token before sending the email.
        db.commit()

    except Exception:
        db.rollback()
        raise

    try:
        send_password_reset_email(
            email=user.email,
            full_name=user.full_name,
            token=token,
        )

    except EmailDeliveryError:
        # Do not leave an active token if delivery failed.
        db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.token_hash
                == hashlib.sha256(token.encode("utf-8")).hexdigest(),
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )
        db.commit()

    return ForgotPasswordResponse(
        message=generic_message
    )


@router.post(
    "/password/reset",
    response_model=ResetPasswordResponse,
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> ResetPasswordResponse:

    try:
        success = reset_user_password(
            db=db,
            token=payload.token,
            new_password=payload.new_password,
        )

    except Exception:
        db.rollback()
        raise

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    return ResetPasswordResponse(
        message="Password reset successfully. Please sign in again."
    )
