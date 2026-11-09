
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
    SalesUserRead,
    AssigneeRead,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


def get_active_admins(db: Session) -> list[User]:
    """
    Retrieve active administrators while locking their rows.

    This helps prevent concurrent operations from removing
    the last active administrator.
    """

    statement = (
        select(User)
        .where(
            User.role == UserRole.ADMIN.value,
            User.is_active.is_(True),
        )
        .with_for_update()
    )

    return list(db.scalars(statement).all())


@router.get(
    "",
    response_model=list[UserRead],
    dependencies=[
        Depends(require_roles(UserRole.ADMIN.value))
    ],
)
def list_users(
    db: Session = Depends(get_db),
) -> list[User]:

    statement = (
        select(User)
        .order_by(User.full_name)
    )

    return list(db.scalars(statement).all())


@router.get(
    "/sales",
    response_model=list[SalesUserRead],
    dependencies=[
        Depends(
            require_roles(
                UserRole.ADMIN.value,
                UserRole.MANAGER.value,
            )
        )
    ],
)
def list_sales_users(
    db: Session = Depends(get_db),
) -> list[User]:

    statement = (
        select(User)
        .where(
            User.role == UserRole.SALES.value,
            User.is_active.is_(True),
        )
        .order_by(User.full_name.asc())
    )

    return list(db.scalars(statement).all())


@router.get(
    "/assignees",
    response_model=list[AssigneeRead],
)
def get_assignees(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.MANAGER,
            UserRole.ADMIN,
        )
    ),
):
    """
    Return all active users who can be assigned to cases.

    SALES, MANAGER and ADMIN users are eligible.
    """

    statement = (
        select(User)
        .where(User.is_active.is_(True))
        .order_by(
            User.role.asc(),
            User.full_name.asc(),
        )
    )

    return db.scalars(statement).all()


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_roles(UserRole.ADMIN.value))
    ],
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> User:

    email = str(payload.email).strip().lower()
    nickname = payload.nickname.strip()

    user = User(
        full_name=payload.full_name,
        email=email,
        nickname=nickname,
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

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or nickname already exists",
        ) from None

    return user


@router.patch(
    "/{user_id}/role",
    response_model=UserRead,
)
def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN.value)
    ),
    db: Session = Depends(get_db),
) -> User:

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent administrators from changing their own role.
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    # Protect the last active administrator.
    if (
        user.role == UserRole.ADMIN.value
        and user.is_active
        and payload.role != UserRole.ADMIN
    ):
        active_admins = get_active_admins(db)

        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The system must have at least one active administrator",
            )

    user.role = payload.role.value

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user


@router.patch(
    "/{user_id}/status",
    response_model=UserRead,
)
def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN.value)
    ),
    db: Session = Depends(get_db),
) -> User:

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent administrators from deactivating themselves.
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    # Protect the last active administrator.
    if (
        user.role == UserRole.ADMIN.value
        and user.is_active
        and not payload.is_active
    ):
        active_admins = get_active_admins(db)

        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The system must have at least one active administrator",
            )

    user.is_active = payload.is_active

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user
