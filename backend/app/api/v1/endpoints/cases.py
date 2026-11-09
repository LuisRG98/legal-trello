
from math import ceil
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import func, select
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
    CaseListItem,
    CaseListResponse,
    CaseRead,
    CaseStatusUpdate,
)
from app.services.cases import (
    assign_case,
    create_case,
    get_role_value,
    get_visible_case_or_none,
    update_case_status,
)


router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)


# =========================================================
# LIST CASES WITH FILTERS AND PAGINATION
# =========================================================

@router.get(
    "",
    response_model=CaseListResponse,
)
def list_cases(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),

    status_code: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
    ),

    case_number: str | None = Query(
        default=None,
        min_length=1,
        max_length=20,
    ),

    assigned_to_id: UUID | None = Query(default=None),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseListResponse:

    # -----------------------------------------------------
    # 1. Validate user role.
    # -----------------------------------------------------

    role = get_role_value(current_user)

    allowed_roles = {
        UserRole.SALES.value,
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }

    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to view cases.",
        )

    # -----------------------------------------------------
    # 2. Build base query.
    # -----------------------------------------------------

    statement = select(Case).options(
        joinedload(Case.status),
        joinedload(Case.assigned_to),
    )

    count_statement = select(func.count(Case.id))

    # -----------------------------------------------------
    # 3. Apply mandatory visibility restrictions.
    # -----------------------------------------------------

    if role == UserRole.SALES.value:
        statement = statement.where(
            Case.assigned_to_id == current_user.id
        )

        count_statement = count_statement.where(
            Case.assigned_to_id == current_user.id
        )

    # -----------------------------------------------------
    # 4. Apply optional filters.
    # -----------------------------------------------------

    if status_code:
        normalized_status = status_code.strip().upper()

        statement = statement.where(
            Case.status.has(
                CaseStatus.code == normalized_status
            )
        )

        count_statement = count_statement.where(
            Case.status.has(
                CaseStatus.code == normalized_status
            )
        )

    if case_number:
        search_value = f"%{case_number.strip()}%"

        statement = statement.where(
            Case.case_number.ilike(search_value)
        )

        count_statement = count_statement.where(
            Case.case_number.ilike(search_value)
        )

    if assigned_to_id is not None:

        if (
            role == UserRole.SALES.value
            and assigned_to_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot filter cases assigned to another user.",
            )

        statement = statement.where(
            Case.assigned_to_id == assigned_to_id
        )

        count_statement = count_statement.where(
            Case.assigned_to_id == assigned_to_id
        )

    # -----------------------------------------------------
    # 5. Count matching cases.
    # -----------------------------------------------------

    total = db.scalar(count_statement) or 0

    # -----------------------------------------------------
    # 6. Apply pagination and stable ordering.
    # -----------------------------------------------------

    offset = (page - 1) * page_size

    statement = (
        statement
        .order_by(
            Case.created_at.desc(),
            Case.id.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    cases = db.scalars(statement).all()

    # -----------------------------------------------------
    # 7. Calculate total pages.
    # -----------------------------------------------------

    total_pages = ceil(total / page_size) if total else 0

    # -----------------------------------------------------
    # 8. Build response.
    # -----------------------------------------------------

    items = [
        CaseListItem(
            id=case.id,
            case_number=case.case_number,
            status_id=case.status_id,
            status_code=case.status.code,
            assigned_to_id=case.assigned_to_id,
            created_by_id=case.created_by_id,
            created_at=case.created_at,
            updated_at=case.updated_at,
            completed_at=case.completed_at,
        )
        for case in cases
    ]

    return CaseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=total_pages,
    )


# =========================================================
# GET CASE BY ID
# =========================================================

@router.get(
    "/{case_id}",
    response_model=CaseRead,
)
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    return case


# =========================================================
# CREATE CASE
# =========================================================

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Case:
    """
    Create a case with an automatically generated case number.

    The initial status is PENDING.
    """

    try:
        return create_case(
            db=db,
            current_user=current_user,
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The case could not be created because of a database conflict.",
        ) from None

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# =========================================================
# UPDATE CASE STATUS
# =========================================================

@router.patch(
    "/{case_id}/status",
    response_model=CaseRead,
    dependencies=[
        Depends(
            require_roles(
                UserRole.MANAGER.value,
                UserRole.ADMIN.value,
                UserRole.SALES.value,
            )
        )
    ],
)
def change_case_status(
    case_id: UUID,
    payload: CaseStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Case:
    """
    Update the status of a case.

    SALES can only update cases assigned to them.
    MANAGER and ADMIN can update any case.
    """

    case = get_visible_case_or_none(
        db=db,
        case_id=case_id,
        current_user=current_user,
    )

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    try:
        return update_case_status(
            db=db,
            case=case,
            status_code=payload.status_code,
            actor=current_user,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


# =========================================================
# ASSIGN OR UNASSIGN CASE
# =========================================================

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
    """
    Assign a case to a SALES user or remove its assignment.

    Only MANAGER and ADMIN can assign cases.
    """

    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
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
