from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

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

    This function intentionally does not commit. The caller should
    commit the business change and its audit entry together.
    """

    activity = CaseActivity(
        case_id=case_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )

    db.add(activity)