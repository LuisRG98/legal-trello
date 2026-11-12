
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Generate a secure password hash using the configured password hasher."""
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Verify a password against its stored hash."""
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
    token_version: int = 0,
    token_type: str = "access",
) -> str:
    """Create a signed JWT with a specific purpose and version."""

    settings = get_settings()

    now = datetime.now(timezone.utc)

    expires_at = now + (
        expires_delta
        or timedelta(
            minutes=settings.access_token_expire_minutes
        )
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
        "type": token_type,
        "token_version": token_version,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def create_password_change_token(
    subject: str,
    token_version: int,
) -> str:
    """Create a short-lived token exclusively for password changes."""

    settings = get_settings()

    return create_access_token(
        subject=subject,
        expires_delta=timedelta(
            minutes=settings.password_change_token_expire_minutes
        ),
        token_version=token_version,
        token_type="password_change",
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Validate a JWT and return its payload."""

    settings = get_settings()

    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
    )
