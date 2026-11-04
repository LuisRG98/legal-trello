from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case_status import CaseStatus


DEFAULT_STATUSES = [
    {
        "code": "PENDING",
        "name": "Pending",
        "position": 1,
    },
    {
        "code": "IN_PROGRESS",
        "name": "In Progress",
        "position": 2,
    },
    {
        "code": "IN_REVIEW",
        "name": "In Review",
        "position": 3,
    },
    {
        "code": "COMPLETED",
        "name": "Completed",
        "position": 4,
    },
]


def initialize_case_statuses(db: Session) -> None:
    """
    Ensure all default case statuses exist.

    Existing statuses are preserved.
    Missing statuses are created.
    """

    try:
        existing_codes = set(
            db.scalars(
                select(CaseStatus.code)
            ).all()
        )

        for status_data in DEFAULT_STATUSES:
            if status_data["code"] not in existing_codes:
                db.add(
                    CaseStatus(**status_data)
                )

        db.commit()

    except Exception:
        db.rollback()
        raise