from sqlalchemy import text
from sqlalchemy.orm import Session


def generate_case_number(db: Session) -> str:
    """
    Generate a globally unique case number using PostgreSQL sequence.

    Example:
        CASE-000001
        CASE-000002
        CASE-000003
    """

    sequence_value = db.execute(
        text("SELECT nextval('case_number_seq')")
    ).scalar_one()

    if sequence_value > 999999:
        raise RuntimeError(
            "Maximum case number limit has been reached."
        )

    return f"CASE-{sequence_value:06d}"