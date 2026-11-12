
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.user import User
from app.services.email import send_email


def generate_temporary_password() -> str:
    """Generate a cryptographically secure temporary password."""

    return secrets.token_urlsafe(24)


def prepare_temporary_password(
    user: User,
    temporary_password: str,
) -> None:
    """Prepare the account for a mandatory password change."""

    settings = get_settings()
    now = datetime.now(timezone.utc)

    user.password_hash = hash_password(
        temporary_password
    )

    user.must_change_password = True

    user.temporary_password_expires_at = (
        now
        + timedelta(
            minutes=settings.temporary_password_expire_minutes
        )
    )

    user.password_changed_at = now
    user.token_version += 1


def send_temporary_password_email(
    *,
    email: str,
    full_name: str,
    temporary_password: str,
) -> None:
    """Send a temporary password using Resend."""

    settings = get_settings()

    safe_name = escape(full_name)
    safe_password = escape(temporary_password)

    expiration_minutes = (
        settings.temporary_password_expire_minutes
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Password reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 560px; margin: auto; padding: 30px;">
            <h2>Password reset</h2>

            <p>Hello {safe_name},</p>

            <p>
                An administrator has requested a password reset
                for your Case Management account.
            </p>

            <p>Your temporary password is:</p>

            <div style="
                padding: 16px;
                background-color: #f3f4f6;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                word-break: break-all;
            ">
                {safe_password}
            </div>

            <p>
                This password expires in
                {expiration_minutes} minutes.
            </p>

            <p>
                You must create a new permanent password
                after signing in.
            </p>

            <p>
                If you did not expect this email,
                contact your administrator.
            </p>

            <p>Case Management Team</p>
        </div>
    </body>
    </html>
    """

    send_email(
        to=email,
        subject="Your temporary Case Management password",
        html=html,
    )
