"""update case number format and sequence

Revision ID: 86508703604b
Revises: 7a6c2a12f041
Create Date: 2026-11-03 23:53:29.903425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '86508703604b'
down_revision: Union[str, Sequence[str], None] = '7a6c2a12f041'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the old case number format constraint.
    op.drop_constraint(
        "ck_cases_case_number_format",
        "cases",
        type_="check",
    )

    # Increase case_number column length.
    op.alter_column(
        "cases",
        "case_number",
        existing_type=sa.String(length=13),
        type_=sa.String(length=20),
        existing_nullable=False,
    )

    # Create the global case number sequence.
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS case_number_seq
        START WITH 1
        INCREMENT BY 1
    """)

    # Synchronize the sequence with existing CASE-XXXXXX records.
    op.execute("""
        SELECT setval(
            'case_number_seq',
            COALESCE(
                MAX(
                    substring(
                        case_number
                        FROM '^CASE-([0-9]+)$'
                    )::BIGINT
                ),
                1
            ),
            COUNT(
                substring(
                    case_number
                    FROM '^CASE-([0-9]+)$'
                )
            ) > 0
        )
        FROM cases
    """)


def downgrade() -> None:
    # Do not recreate the old format check: existing CASE numbers
    # would violate it. A deliberate data migration is required
    # before restoring that old constraint.
    op.alter_column(
        "cases",
        "case_number",
        existing_type=sa.String(length=20),
        type_=sa.String(length=20),
        existing_nullable=False,
    )