from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:

    total_start = perf_counter()

    normalized_email = email.strip().lower()

    # 1. Database query
    query_start = perf_counter()

    statement = select(User).where(
        User.email == normalized_email
    )

    user = db.scalar(statement)

    print(
        f"[AUTH] Database query: "
        f"{(perf_counter() - query_start):.3f} seconds"
    )

    if user is None:
        return None

    if not user.is_active:
        return None

    # 2. Password verification
    password_start = perf_counter()

    password_valid = verify_password(
        password,
        user.password_hash,
    )

    print(
        f"[AUTH] Argon2 verification: "
        f"{(perf_counter() - password_start):.3f} seconds"
    )

    print(
        f"[AUTH] Total: "
        f"{(perf_counter() - total_start):.3f} seconds"
    )

    if not password_valid:
        return None

    return user