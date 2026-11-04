from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.roles import UserRole
from app.core.security import hash_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserRead,
    UserRoleUpdate,
    UserStatusUpdate,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_roles(UserRole.ADMIN.value))],
)


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
) -> list[User]:
    statement = select(User).order_by(User.full_name)

    return list(db.scalars(statement).all())


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> User:
    email = str(payload.email).strip().lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        # Also handles concurrent requests attempting to create
        # the same email when the database enforces uniqueness.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from None

    return user


@router.patch(
    "/{user_id}/role",
    response_model=UserRead,
)
def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.role = payload.role.value

    db.commit()
    db.refresh(user)

    return user


@router.patch(
    "/{user_id}/status",
    response_model=UserRead,
)
def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    return user