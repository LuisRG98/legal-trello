import re
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.core.roles import UserRole
from app.db.database import get_db
from app.models.case import Case
from app.models.case_status import CaseStatus
from app.models.user import User
from app.schemas.case import (
    CaseAssignmentUpdate,
    CaseCreate,
    CaseRead,
    CaseStatusUpdate,
)
from app.services.cases import (
    assign_case,
    create_case,
    get_visible_case_or_none,
    update_case_status,
)


router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)


CASE_NUMBER_PATTERN = re.compile(r"^[0-9]{4}-[0-9]{8}$")


@router.get("", response_model=list[CaseRead])
def list_cases(
    search: str | None = Query(default=None, max_length=100),
    status_code: str | None = Query(default=None, max_length=50),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Case]:
    statement = (
        select(Case)
        .options(joinedload(Case.status))
        .order_by(Case.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    if current_user.role == UserRole.SALES.value:
        statement = statement.where(
            Case.assigned_to_id == current_user.id
        )

    if search:
        statement = statement.where(
            Case.case_number.ilike(f"%{search.strip()}%")
        )

    if status_code:
        statement = statement.join(Case.status).where(
            CaseStatus.code == status_code
        )

    return list(db.scalars(statement).unique().all())


@router.get("/{case_id}", response_model=CaseRead)
def get_case(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Case:
    case = get_visible_case_or_none(
        db=db,
        case_id=case_id,
        current_user=current_user,
    )

    if case is None:
        # A SALES user cannot use this endpoint to discover
        # cases assigned to other users.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    return case


@router.post(
    "",
    response_model=CaseRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.MANAGER.value,
                UserRole.ADMIN.value,
            )
        )
    ],
)
def create_case_endpoint(
    payload: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Case:
    if not CASE_NUMBER_PATTERN.fullmatch(payload.case_number):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid case number format",
        )

    try:
        return create_case(
            db=db,
            case_number=payload.case_number,
            current_user=current_user,
        )

    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A case with this number already exists",
        ) from None

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc



@router.patch(
    "/{case_id}/assignment",
    response_model=CaseRead,
    dependencies=[
        Depends(
            require_roles(
                UserRole.MANAGER.value,
                UserRole.ADMIN.value,
            )
        )
    ],
)
def change_case_assignment(
    case_id: UUID,
    payload: CaseAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Case:
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    try:
        return assign_case(
            db=db,
            case=case,
            assigned_to_id=payload.assigned_to_id,
            actor=current_user,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc



@router.patch(
    "/{case_id}/assignment",
    response_model=CaseRead,
    dependencies=[
        Depends(
            require_roles(
                UserRole.MANAGER.value,
                UserRole.ADMIN.value,
            )
        )
    ],
)
def change_case_assignment(
    case_id: UUID,
    payload: CaseAssignmentUpdate,
    db: Session = Depends(get_db),
) -> Case:
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    try:
        return assign_case(
            db=db,
            case=case,
            assigned_to_id=payload.assigned_to_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc