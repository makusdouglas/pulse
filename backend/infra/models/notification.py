"""Notification ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from infra.models.base import Base, TenantMixin


class Notification(TenantMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        sa.CheckConstraint(
            "type IN ('churn_alert', 'action_result', 'payment_alert', 'system')",
            name="ck_notifications_type",
        ),
        sa.Index("idx_notifications_gym", "gym_id", sa.text("created_at DESC")),
        sa.Index(
            "idx_notifications_gym_unread", "gym_id", "is_read",
            postgresql_where=sa.text("is_read = false"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"),
    )
    type: Mapped[str] = mapped_column(sa.String(30), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text)
    is_read: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.text("false"),
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
    )
