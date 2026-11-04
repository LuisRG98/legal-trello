import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User
from app.core.roles import UserRole


def main() -> None:
    email = input("Administrator email: ").strip().lower()
    full_name = input("Administrator full name: ").strip()
    nick_name = input("Administrator nickname: ").strip()

    if not email or not full_name:
        print("Email and full name are required.")
        return

    password = getpass.getpass("Administrator password: ")
    confirm_password = getpass.getpass("Confirm password: ")

    if password != confirm_password:
        print("Passwords do not match.")
        return

    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user is not None:
            print("A user with this email already exists.")
            return

        admin = User(
            full_name=full_name,
            email=email,
            nickname=nick_name,
            password_hash=hash_password(password),
            role=UserRole.ADMIN.value,
            is_active=True,
        )

        try:
            db.add(admin)
            db.commit()
            print(f"Administrator created successfully: {email}")

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    main()