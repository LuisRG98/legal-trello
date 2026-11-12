
import hashlib
import secrets

from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import quote

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.email import send_email


def hash_reset_token(token: str) -> str:
    """Return the SHA-256 hash of a reset token."""

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def generate_reset_token() -> str:
    """Generate a cryptographically secure reset token."""

    return secrets.token_urlsafe(32)


def create_password_reset_token(
    db: Session,
    user: User,
) -> str:
    """
    Create a new reset token and invalidate previous tokens.

    Only the hash is persisted.
    """

    settings = get_settings()
    now = datetime.now(timezone.utc)

    # Invalidate all previous unused tokens.
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    raw_token = generate_reset_token()

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(raw_token),
        expires_at=(
            now
            + timedelta(
                minutes=settings.password_reset_token_expire_minutes
            )
        ),
    )

    db.add(reset_token)

    return raw_token


def send_password_reset_email(
    *,
    email: str,
    full_name: str,
    token: str,
) -> None:
    """Send a password recovery link through Resend."""

    settings = get_settings()

    reset_url = (
        f"{settings.frontend_base_url.rstrip('/')}"
        f"/reset-password?token={quote(token)}"
    )

    safe_name = escape(full_name)
    safe_url = escape(reset_url, quote=True)

    expiration_minutes = (
        settings.password_reset_token_expire_minutes
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Password recovery</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 560px; margin: auto; padding: 30px;">
            <h2>Password recovery</h2>

            <p>Hello {safe_name},</p>

            <p>
                We received a request to reset your
                Case Management account password.
            </p>

            <p>
                Click the button below to create a new password:
            </p>

            <p>
                <a
                    href="{safe_url}"
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background-color: #2563eb;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                    "
                >
                    Reset password
                </a>
            </p>

            <p>
                This link expires in {expiration_minutes} minutes
                and can only be used once.
            </p>

            <p>
                If you did not request this change,
                you can safely ignore this email.
            </p>

            <p>Case Management Team</p>
        </div>
    </body>
    </html>
    """

    send_email(
        to=email,
        subject="Reset your Case Management password",
        html=html,
    )


def reset_user_password(
    db: Session,
    *,
    token: str,
    new_password: str,
) -> bool:
    """
    Validate and consume a reset token.

    Returns False when the token is invalid, expired,
    or already used.
    """

    now = datetime.now(timezone.utc)
    token_hash = hash_reset_token(token)

    # Lock the token row to prevent concurrent reuse.
    reset_record = db.scalar(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .with_for_update()
    )

    if reset_record is None:
        return False

    user = db.get(
        User,
        reset_record.user_id,
    )

    if user is None or not user.is_active:
        return False

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.password_changed_at = now

    # Invalidate every existing JWT.
    user.token_version += 1

    reset_record.used_at = now

    # Invalidate any other outstanding reset tokens.
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.id != reset_record.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    db.commit()

    return True
