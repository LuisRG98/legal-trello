
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
    CaseAssigneeRead,
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

from app.schemas.activity import CaseActivityListResponse
from app.services.activity import get_case_activities

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
    assigned_to_role: str | None = Query(
        default=None,
        pattern="^(SALES|MANAGER|ADMIN)$",
    ),
    unassigned_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseListResponse:

    # 1. Normalize and validate the authenticated user's role.
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

    is_sales = role == UserRole.SALES.value
    is_admin = role == UserRole.ADMIN.value

    # 2. Only ADMIN can use administrative assignment filters.
    if not is_admin and (
        assigned_to_role is not None or unassigned_only
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use these filters.",
        )

    if assigned_to_id is not None and not is_admin:
        if is_sales and assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot view cases assigned to another user.",
            )

        if not is_sales:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only ADMIN can filter cases by assigned user.",
            )

    # 3. Reject contradictory filters.
    if assigned_to_role and unassigned_only:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role filter cannot be combined with unassigned filter.",
        )

    if assigned_to_id and unassigned_only:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="User filter cannot be combined with unassigned filter.",
        )

    # 4. Build one shared set of conditions.
    conditions = []

    # Mandatory visibility restriction for SALES.
    if is_sales:
        conditions.append(
            Case.assigned_to_id == current_user.id
        )

    # General filters.
    if status_code:
        normalized_status = status_code.strip().upper()

        conditions.append(
            Case.status.has(
                CaseStatus.code == normalized_status
            )
        )

    if case_number:
        search_value = f"%{case_number.strip()}%"

        conditions.append(
            Case.case_number.ilike(search_value)
        )

    # Administrative assignment filters.
    if is_admin:
        if assigned_to_id is not None:
            conditions.append(
                Case.assigned_to_id == assigned_to_id
            )

        if assigned_to_role is not None:
            conditions.append(
                Case.assigned_to.has(
                    User.role == assigned_to_role
                )
            )

        if unassigned_only:
            conditions.append(
                Case.assigned_to_id.is_(None)
            )

    # 5. Apply exactly the same conditions to both queries.
    statement = (
        select(Case)
        .options(
            joinedload(Case.status),
            joinedload(Case.assigned_to),
        )
        .where(*conditions)
    )

    count_statement = (
        select(func.count(Case.id))
        .where(*conditions)
    )

    # 6. Count matching records before pagination.
    total = db.scalar(count_statement) or 0

    # 7. Apply stable ordering and pagination.
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

    # 8. Calculate pages.
    total_pages = ceil(total / page_size) if total else 0

    # 9. Build response, including assigned user information.
    items = [
        CaseListItem(
            id=case.id,
            case_number=case.case_number,
            status_id=case.status_id,
            status_code=case.status.code,
            assigned_to_id=case.assigned_to_id,
            assigned_to=(
                CaseAssigneeRead.model_validate(case.assigned_to)
                if case.assigned_to is not None
                else None
            ),
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


# =========================================================
# GET CASE ACTIVITY HISTORY
# =========================================================

@router.get(
    "/{case_id}/activities",
    response_model=CaseActivityListResponse,
)
def list_case_activities(
    case_id: UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseActivityListResponse:
    """
    Retrieve a paginated activity history for a case.

    SALES:
        Can only view activities for cases assigned to them.

    MANAGER / ADMIN:
        Can view activities for all cases.
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

    activities, total = get_case_activities(
        db=db,
        case_id=case_id,
        skip=skip,
        limit=limit,
    )

    return CaseActivityListResponse(
        items=activities,
        total=total,
        skip=skip,
        limit=limit,
    )
