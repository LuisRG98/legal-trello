
from typing import Annotated
from collections.abc import Callable
from uuid import UUID

import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.core.security import decode_access_token


bearer_scheme = HTTPBearer(
    auto_error=False,
)


def get_authenticated_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> tuple[User, dict]:
    """Validate the JWT and retrieve its associated active user."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = decode_access_token(
            credentials.credentials
        )

        user_id = payload.get("sub")

        if not user_id:
            raise unauthorized

        user = db.get(User, UUID(user_id))

        if user is None or not user.is_active:
            raise unauthorized

        token_version = payload.get("token_version", 0)

        if token_version != user.token_version:
            raise unauthorized

        return user, payload

    except (
        jwt.InvalidTokenError,
        ValueError,
        TypeError,
        AttributeError,
    ):
        raise unauthorized


def get_current_user(
    authenticated: Annotated[
        tuple[User, dict],
        Depends(get_authenticated_user),
    ],
) -> User:
    """Require a normal access token and a permanent password."""

    user, payload = authenticated

    if payload.get("type", "access") != "access":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This token cannot access this resource",
        )

    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must change your password before continuing",
        )

    return user


def get_password_change_user(
    authenticated: Annotated[
        tuple[User, dict],
        Depends(get_authenticated_user),
    ],
) -> User:
    """Allow access only with a temporary password-change token."""

    user, payload = authenticated

    if payload.get("type") != "password_change":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A password-change token is required",
        )

    if not user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No password change is pending",
        )

    if user.temporary_password_expires_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Temporary password has expired",
        )

    from datetime import datetime, timezone

    if user.temporary_password_expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Temporary password has expired",
        )

    return user


def require_roles(*allowed_roles: str) -> Callable:
    """Restrict an endpoint to the specified roles."""

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker
