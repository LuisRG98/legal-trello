
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_  
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

from app.schemas.user import PasswordResetResponse

from app.services.email import EmailDeliveryError
from app.services.password_reset import (
    generate_temporary_password,
    prepare_temporary_password,
    send_temporary_password_email,
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
    search: str = Query(
        ...,
        min_length=2,
        max_length=100,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.MANAGER,
            UserRole.ADMIN,
        )
    ),
):
    search_term = search.strip()

    if len(search_term) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search must contain at least 2 characters.",
        )

    pattern = f"%{search_term}%"

    statement = (
        select(User)
        .where(
            User.is_active.is_(True),
            or_(
                User.full_name.ilike(pattern),
                User.nickname.ilike(pattern),
                User.email.ilike(pattern),
            ),
        )
        .order_by(User.full_name.asc())
        .limit(limit)
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



@router.post(
    "/{user_id}/password-reset",
    response_model=PasswordResetResponse,
)
def admin_reset_user_password(
    user_id: UUID,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN.value)
    ),
    db: Session = Depends(get_db),
) -> PasswordResetResponse:
    """
    Allow administrators to reset a user's password.

    A temporary password is generated and sent by email.
    The user must replace it before accessing the platform.
    """

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot reset the password of an inactive user",
        )

    temporary_password = generate_temporary_password()

    prepare_temporary_password(
        user=user,
        temporary_password=temporary_password,
    )

    try:
        # Flush validates pending database changes without committing.
        db.flush()

        # Send before committing so a delivery failure does not
        # leave the account with an unknown temporary password.
        send_temporary_password_email(
            email=user.email,
            full_name=user.full_name,
            temporary_password=temporary_password,
        )

        db.commit()

    except EmailDeliveryError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to deliver the temporary password email",
        ) from None

    except Exception:
        db.rollback()
        raise

    return PasswordResetResponse(
        message=(
            "A temporary password has been generated "
            "and sent to the user's email address."
        )
    )
