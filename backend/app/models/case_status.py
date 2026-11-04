from uuid import UUID, uuid4

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class CaseStatus(Base):
    __tablename__ = "case_statuses"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    cases: Mapped[list["Case"]] = relationship(
        back_populates="status",
    )