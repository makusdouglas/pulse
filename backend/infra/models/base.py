"""SQLAlchemy 2.0 declarative base and shared mixins."""

from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Adds created_at only."""

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )


class UpdatableMixin(TimestampMixin):
    """Adds created_at + updated_at with auto-update."""

    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )


class TenantMixin:
    """gym_id FK for all tenant-scoped tables."""

    gym_id: Mapped[uuid.UUID] = mapped_column(
        sa.UUID(as_uuid=True),
        sa.ForeignKey("gyms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
