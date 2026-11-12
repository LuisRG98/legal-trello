
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.roles import UserRole
from app.models.case import Case
from app.models.case_status import CaseStatus
from app.models.user import User

from app.services.activity import record_case_activity
from app.services.case_numbers import generate_case_number


# =========================================================
# ROLE HELPERS
# =========================================================

def get_role_value(user: User) -> str:
    """
    Normalize the user's role to a string.

    Supports both Python Enum values and database strings.
    """
    role = user.role

    return role.value if hasattr(role, "value") else str(role)


def is_manager_or_admin(user: User) -> bool:
    """
    Check whether the user has management permissions.
    """
    return get_role_value(user) in {
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }


# =========================================================
# CASE PERMISSIONS
# =========================================================

def can_access_case(
    case: Case,
    current_user: User,
) -> bool:
    """
    Check whether a user can access a case.

    SALES:
        Can only access cases assigned to them.

    MANAGER / ADMIN:
        Can access all cases.
    """

    role = get_role_value(current_user)

    if role in {
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }:
        return True

    if role == UserRole.SALES.value:
        return case.assigned_to_id == current_user.id

    return False


# =========================================================
# CASE QUERIES
# =========================================================

def get_case_or_none(
    db: Session,
    case_id: UUID,
) -> Case | None:
    """
    Retrieve a case by ID, including its status.
    """

    statement = (
        select(Case)
        .options(
            joinedload(Case.status),
            joinedload(Case.assigned_to),
        )
        .where(Case.id == case_id)
    )

    return db.scalar(statement)


def get_visible_case_or_none(
    db: Session,
    case_id: UUID,
    current_user: User,
) -> Case | None:
    """
    Retrieve a case only if the user is authorized.

    Unauthorized and nonexistent cases both return None.
    """

    role = get_role_value(current_user)

    if role not in {
        UserRole.SALES.value,
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }:
        return None

    statement = (
        select(Case)
        .options(
            joinedload(Case.status),
            joinedload(Case.assigned_to),
        )
        .where(Case.id == case_id)
    )

    # Enforce SALES visibility directly in the database query.
    if role == UserRole.SALES.value:
        statement = statement.where(
            Case.assigned_to_id == current_user.id
        )

    return db.scalar(statement)


# =========================================================
# CASE CREATION
# =========================================================


def create_case(
    db: Session,
    current_user: User,
) -> Case:
    """
    Create a case with an automatically generated case number.

    The case and its audit activity are committed together.
    """

    pending_status = db.scalar(
        select(CaseStatus).where(
            CaseStatus.code == "PENDING",
            CaseStatus.is_active.is_(True),
        )
    )

    if pending_status is None:
        raise ValueError(
            "The PENDING status has not been initialized."
        )

    case = Case(
        case_number=generate_case_number(db),
        status_id=pending_status.id,
        assigned_to_id=None,
        created_by_id=current_user.id,
    )

    try:
        db.add(case)

        # Generate the case UUID before recording its activity.
        db.flush()

        record_case_activity(
            db,
            case_id=case.id,
            actor_id=current_user.id,
            action="CASE_CREATED",
            old_value=None,
            new_value={
                "case_number": case.case_number,
                "status": "PENDING",
            },
        )

        db.commit()
        db.refresh(case)

        return case

    except Exception:
        db.rollback()
        raise



# =========================================================
# CASE STATUS
# =========================================================

def update_case_status(
    db: Session,
    case: Case,
    status_code: str,
    actor: User,
) -> Case:
    """
    Update a case status and record the activity.
    """

    new_status = db.scalar(
        select(CaseStatus).where(
            CaseStatus.code == status_code,
            CaseStatus.is_active.is_(True),
        )
    )

    if new_status is None:
        raise ValueError("Invalid or inactive case status.")

    old_status = case.status

    if old_status.code == new_status.code:
        return case

    record_case_activity(
        db,
        case_id=case.id,
        actor_id=actor.id,
        action="STATUS_CHANGED",
        old_value={"status": old_status.code},
        new_value={"status": new_status.code},
    )

    case.status_id = new_status.id

    if new_status.code == "COMPLETED":
        case.completed_at = datetime.now(timezone.utc)
    else:
        case.completed_at = None

    try:
        db.commit()
        db.refresh(case)

        return case

    except Exception:
        db.rollback()
        raise


# =========================================================
# CASE ASSIGNMENT
# =========================================================

def assign_case(
    db: Session,
    case: Case,
    assigned_to_id: UUID | None,
    actor: User,
) -> Case:
    """
    Assign or unassign a case.

    Any active user with a valid role can be assigned.

    Only MANAGER and ADMIN can perform assignments.
    The endpoint enforces this permission.
    """

    if assigned_to_id is None:
        new_assignee = None

    else:
        new_assignee = db.get(User, assigned_to_id)

        allowed_roles = {
            UserRole.SALES.value,
            UserRole.MANAGER.value,
            UserRole.ADMIN.value,
        }

        if new_assignee is None:
            raise ValueError("The selected assignee does not exist.")

        if not new_assignee.is_active:
            raise ValueError("The selected assignee is inactive.")

        if get_role_value(new_assignee) not in allowed_roles:
            raise ValueError("The selected assignee has an invalid role.")

    old_assignee_id = (
        str(case.assigned_to_id)
        if case.assigned_to_id is not None
        else None
    )

    new_assignee_id = (
        str(new_assignee.id)
        if new_assignee is not None
        else None
    )

    if old_assignee_id == new_assignee_id:
        return case

    record_case_activity(
        db,
        case_id=case.id,
        actor_id=actor.id,
        action="ASSIGNMENT_CHANGED",
        old_value={
            "assigned_to_id": old_assignee_id,
        },
        new_value={
            "assigned_to_id": new_assignee_id,
        },
    )

    case.assigned_to_id = (
        new_assignee.id
        if new_assignee is not None
        else None
    )

    try:
        db.commit()
        db.refresh(case)

        return case

    except Exception:
        db.rollback()
        raise