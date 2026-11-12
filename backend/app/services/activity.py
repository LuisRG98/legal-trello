
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.case_activity import CaseActivity


def record_case_activity(
    db: Session,
    *,
    case_id: UUID,
    actor_id: UUID,
    action: str,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
) -> None:
    """
    Add an activity entry to the current database transaction.

    This function intentionally does not commit.
    The caller commits the business operation and its
    audit activity together.
    """

    activity = CaseActivity(
        case_id=case_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )

    db.add(activity)


def get_case_activities(
    db: Session,
    case_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[CaseActivity], int]:
    """
    Retrieve a paginated case activity history.

    Activities are ordered from newest to oldest.
    The actor relationship is loaded to avoid N+1 queries.
    """

    count_statement = (
        select(func.count(CaseActivity.id))
        .where(CaseActivity.case_id == case_id)
    )

    total = db.scalar(count_statement) or 0

    statement = (
        select(CaseActivity)
        .options(
            selectinload(CaseActivity.actor),
        )
        .where(
            CaseActivity.case_id == case_id,
        )
        .order_by(
            CaseActivity.created_at.desc(),
            CaseActivity.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    activities = list(db.scalars(statement).all())

    return activities, total
