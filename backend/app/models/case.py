from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    case_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )

    status_id: Mapped[UUID] = mapped_column(
        ForeignKey("case_statuses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    assigned_to_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped["CaseStatus"] = relationship(
        back_populates="cases",
    )

    assigned_to: Mapped["User | None"] = relationship(
        back_populates="assigned_cases",
        foreign_keys=[assigned_to_id],
    )

    created_by: Mapped["User"] = relationship(
        back_populates="created_cases",
        foreign_keys=[created_by_id],
    )

    documents: Mapped[list["CaseDocument"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
    )

    comments: Mapped[list["CaseComment"]] = relationship(
        back_populates="case",
        passive_deletes=True,
    )

    activities: Mapped[list["CaseActivity"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
    )