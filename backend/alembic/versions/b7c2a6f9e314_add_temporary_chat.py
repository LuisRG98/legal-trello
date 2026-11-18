"""add temporary chat messages

Revision ID: b7c2a6f9e314
Revises: f40d81b561ae
Create Date: 2026-11-18 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c2a6f9e314"
down_revision: Union[str, Sequence[str], None] = "f40d81b561ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room", sa.String(length=20), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("author_name", sa.String(length=150), nullable=False),
        sa.Column("author_role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "room IN ('general', 'management')",
            name="ck_chat_messages_room",
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_chat_messages_room",
        "chat_messages",
        ["room"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_room_created_at",
        "chat_messages",
        ["room", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_expires_at",
        "chat_messages",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_expires_at", table_name="chat_messages")
    op.drop_index("ix_chat_messages_room_created_at", table_name="chat_messages")
    op.drop_index("ix_chat_messages_room", table_name="chat_messages")
    op.drop_table("chat_messages")
