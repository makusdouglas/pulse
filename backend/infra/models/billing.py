"""Billing ORM models: Plan, Subscription, Invoice, Coupon, CouponUsage, Promotion."""

from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from infra.models.base import Base, TenantMixin, TimestampMixin, UpdatableMixin


class Plan(TimestampMixin, Base):
    __tablename__ = "plans"
    __table_args__ = (
        sa.CheckConstraint("interval IN ('month', 'year')", name="ck_plans_interval"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(50), unique=True, nullable=False)
    stripe_price_id: Mapped[str | None] = mapped_column(sa.String(255))
    price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    currency: Mapped[str] = mapped_column(sa.String(3), nullable=False, server_default=sa.text("'BRL'"))
    interval: Mapped[str] = mapped_column(sa.String(10), nullable=False, server_default=sa.text("'month'"))
    max_members: Mapped[int | None] = mapped_column(sa.Integer)
    features: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'"))
    active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))


class Subscription(TenantMixin, UpdatableMixin, Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        sa.CheckConstraint(
            "status IN ('active', 'past_due', 'cancelled', 'trialing')",
            name="ck_subscriptions_status",
        ),
        sa.Index("idx_subscriptions_gym", "gym_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("plans.id"), nullable=False,
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(sa.String(255), unique=True)
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, server_default=sa.text("'active'"))
    current_period_start: Mapped[date] = mapped_column(sa.Date, nullable=False)
    current_period_end: Mapped[date] = mapped_column(sa.Date, nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.text("false"),
    )


class Invoice(TenantMixin, TimestampMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (
        sa.CheckConstraint(
            "status IN ('draft', 'open', 'paid', 'void', 'uncollectible')",
            name="ck_invoices_status",
        ),
        sa.Index("idx_invoices_gym", "gym_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"),
    )
    stripe_invoice_id: Mapped[str | None] = mapped_column(sa.String(255), unique=True)
    amount_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    currency: Mapped[str] = mapped_column(sa.String(3), nullable=False, server_default=sa.text("'BRL'"))
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, server_default=sa.text("'draft'"))
    due_date: Mapped[date | None] = mapped_column(sa.Date)
    paid_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))


class Coupon(TimestampMixin, Base):
    __tablename__ = "coupons"
    __table_args__ = (
        sa.CheckConstraint("discount_pct >= 1 AND discount_pct <= 100", name="ck_coupons_discount_pct"),
        sa.CheckConstraint(
            "discount_pct IS NOT NULL OR discount_cents IS NOT NULL",
            name="ck_coupons_has_discount",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    code: Mapped[str] = mapped_column(sa.String(50), unique=True, nullable=False)
    discount_pct: Mapped[int | None] = mapped_column(sa.Integer)
    discount_cents: Mapped[int | None] = mapped_column(sa.Integer)
    max_uses: Mapped[int | None] = mapped_column(sa.Integer)
    used_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    valid_from: Mapped[date] = mapped_column(
        sa.Date, nullable=False, server_default=sa.text("CURRENT_DATE"),
    )
    valid_until: Mapped[date | None] = mapped_column(sa.Date)
    active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))


class CouponUsage(Base):
    __tablename__ = "coupon_usage"
    __table_args__ = (
        sa.Index("idx_coupon_usage_gym", "gym_id"),
        sa.Index("idx_coupon_usage_coupon", "coupon_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    coupon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("coupons.id"), nullable=False,
    )
    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False,
    )
    applied_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
    )


class Promotion(TimestampMixin, Base):
    __tablename__ = "promotions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("plans.id"),
    )
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("coupons.id"),
    )
    starts_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
