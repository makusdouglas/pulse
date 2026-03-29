"""Core ORM models: Gym, Member, Checkin, Payment, MemberFeature, ChurnScore, ActionLog."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from infra.models.base import Base, TenantMixin, TimestampMixin, UpdatableMixin


class Gym(UpdatableMixin, Base):
    __tablename__ = "gyms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(sa.String(255))
    phone: Mapped[str | None] = mapped_column(sa.String(30))
    clerk_org_id: Mapped[str | None] = mapped_column(sa.String(255), unique=True)
    timezone: Mapped[str] = mapped_column(
        sa.String(50), nullable=False, server_default="America/Sao_Paulo",
    )


class Member(TenantMixin, UpdatableMixin, Base):
    __tablename__ = "members"
    __table_args__ = (
        sa.CheckConstraint("status IN ('active', 'inactive', 'cancelled')", name="ck_members_status"),
        sa.Index("idx_members_gym_status", "gym_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(sa.String(255))
    phone: Mapped[str | None] = mapped_column(sa.String(30))
    enrolled_at: Mapped[date] = mapped_column(
        sa.Date, nullable=False, server_default=sa.text("CURRENT_DATE"),
    )
    cancelled_at: Mapped[date | None] = mapped_column(sa.Date)
    status: Mapped[str] = mapped_column(
        sa.String(20), nullable=False, server_default="active",
    )


class Checkin(TenantMixin, Base):
    __tablename__ = "checkins"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", "ts"),
        sa.Index("idx_checkins_gym_id", "gym_id", sa.text("ts DESC")),
        sa.Index("idx_checkins_member", "member_id", sa.text("ts DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False,
    )
    ts: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
    )
    duration_min: Mapped[int | None] = mapped_column(sa.Integer)


class Payment(TenantMixin, TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        sa.CheckConstraint("status IN ('pending', 'paid', 'overdue', 'cancelled')", name="ck_payments_status"),
        sa.Index("idx_payments_member", "member_id", sa.text("due_date DESC")),
        sa.Index("idx_payments_gym_status", "gym_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False,
    )
    due_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    paid_at: Mapped[date | None] = mapped_column(sa.Date)
    amount: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        sa.String(20), nullable=False, server_default="pending",
    )


class MemberFeature(TenantMixin, Base):
    __tablename__ = "member_features"
    __table_args__ = (
        sa.UniqueConstraint("member_id", "computed_at", name="uq_member_features_member_date"),
        sa.Index("idx_member_features_gym", "gym_id", sa.text("computed_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False,
    )
    computed_at: Mapped[date] = mapped_column(
        sa.Date, nullable=False, server_default=sa.text("CURRENT_DATE"),
    )
    days_without_checkin: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    freq_last_30d: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    freq_prev_30d: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    freq_trend: Mapped[Decimal] = mapped_column(sa.Numeric(5, 2), nullable=False, server_default="0")
    avg_duration_min: Mapped[Decimal | None] = mapped_column(sa.Numeric(5, 1))
    overdue_payments: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    months_enrolled: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")


class ChurnScore(TenantMixin, TimestampMixin, Base):
    __tablename__ = "churn_scores"
    __table_args__ = (
        sa.CheckConstraint("score >= 0 AND score <= 100", name="ck_churn_scores_score"),
        sa.CheckConstraint("tier IN ('critical', 'medium', 'low', 'safe')", name="ck_churn_scores_tier"),
        sa.CheckConstraint("origin IN ('rules', 'ml')", name="ck_churn_scores_origin"),
        sa.UniqueConstraint("member_id", "computed_at", name="uq_churn_scores_member_date"),
        sa.Index("idx_churn_scores_gym", "gym_id", sa.text("computed_at DESC")),
        sa.Index("idx_churn_scores_gym_tier", "gym_id", "tier"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False,
    )
    computed_at: Mapped[date] = mapped_column(
        sa.Date, nullable=False, server_default=sa.text("CURRENT_DATE"),
    )
    score: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    tier: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    reasons: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'"))
    origin: Mapped[str] = mapped_column(sa.String(10), nullable=False, server_default=sa.text("'rules'"))


class ActionLog(TenantMixin, TimestampMixin, Base):
    __tablename__ = "actions_log"
    __table_args__ = (
        sa.CheckConstraint(
            "channel IN ('whatsapp', 'email', 'phone', 'in_person', 'other')",
            name="ck_actions_log_channel",
        ),
        sa.CheckConstraint(
            "result IS NULL OR result IN ('delivered', 'read', 'replied', 'failed', 'pending')",
            name="ck_actions_log_result",
        ),
        sa.Index("idx_actions_log_member", "member_id", sa.text("sent_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False,
    )
    action_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    channel: Mapped[str] = mapped_column(
        sa.String(30), nullable=False, server_default=sa.text("'whatsapp'"),
    )
    message: Mapped[str | None] = mapped_column(sa.Text)
    sent_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
    )
    result: Mapped[str | None] = mapped_column(sa.String(30))
