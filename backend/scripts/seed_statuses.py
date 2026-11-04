from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.case_status import CaseStatus


DEFAULT_STATUSES = [
    {"code": "PENDING", "name": "Pending", "position": 1},
    {"code": "IN_PROGRESS", "name": "In Progress", "position": 2},
    {"code": "IN_REVIEW", "name": "In Review", "position": 3},
    {"code": "COMPLETED", "name": "Completed", "position": 4},
]


def main() -> None:
    with SessionLocal() as db:
        try:
            for item in DEFAULT_STATUSES:
                existing = db.scalar(
                    select(CaseStatus).where(
                        CaseStatus.code == item["code"]
                    )
                )

                if existing is None:
                    db.add(
                        CaseStatus(
                            code=item["code"],
                            name=item["name"],
                            position=item["position"],
                            is_active=True,
                        )
                    )

            db.commit()
            print("Case statuses initialized successfully.")

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    main()