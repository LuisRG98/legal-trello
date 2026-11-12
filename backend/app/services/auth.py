
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """Authenticate an active user using email and password."""

    normalized_email = email.strip().lower()

    statement = select(User).where(
        User.email == normalized_email
    )

    user = db.scalar(statement)

    if user is None or not user.is_active:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    return user
