"""baseline

Revision ID: 9fc75edaf798
Revises:
Create Date: 2026-03-29 13:03:40.312101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID


revision: str = "9fc75edaf798"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# -- Tables with RLS policies ------------------------------------------------
_RLS_TABLES = [
    "members", "checkins", "payments", "member_features",
    "churn_scores", "actions_log", "subscriptions", "invoices",
    "coupon_usage", "notifications",
]

# -- Tables with updated_at trigger ------------------------------------------
_UPDATED_AT_TABLES = ["gyms", "members", "subscriptions", "admin_users"]


def upgrade() -> None:
    # ── Extensions ──────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    # ── gyms ────────────────────────────────────────────────────────────
    op.create_table(
        "gyms",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(30)),
        sa.Column("clerk_org_id", sa.String(255)),
        sa.Column("timezone", sa.String(50), server_default="America/Sao_Paulo", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        sa.UniqueConstraint("clerk_org_id"),
    )

    # ── members ─────────────────────────────────────────────────────────
    op.create_table(
        "members",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(30)),
        sa.Column("enrolled_at", sa.Date, server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("cancelled_at", sa.Date),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.CheckConstraint("status IN ('active', 'inactive', 'cancelled')", name="ck_members_status"),
    )
    op.create_index("idx_members_gym_id", "members", ["gym_id"])
    op.create_index("idx_members_gym_status", "members", ["gym_id", "status"])

    # ── checkins (TimescaleDB hypertable) ───────────────────────────────
    op.create_table(
        "checkins",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("duration_min", sa.Integer),
        sa.PrimaryKeyConstraint("id", "ts"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
    )
    op.execute("""
        SELECT create_hypertable('checkins', 'ts',
            chunk_time_interval => INTERVAL '7 days',
            if_not_exists => TRUE
        )
    """)
    op.create_index("idx_checkins_gym_id", "checkins", ["gym_id", sa.text("ts DESC")])
    op.create_index("idx_checkins_member", "checkins", ["member_id", sa.text("ts DESC")])

    # ── payments ────────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("paid_at", sa.Date),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.CheckConstraint("status IN ('pending', 'paid', 'overdue', 'cancelled')", name="ck_payments_status"),
    )
    op.create_index("idx_payments_gym_id", "payments", ["gym_id"])
    op.create_index("idx_payments_member", "payments", ["member_id", sa.text("due_date DESC")])
    op.create_index("idx_payments_gym_status", "payments", ["gym_id", "status"])

    # ── member_features ─────────────────────────────────────────────────
    op.create_table(
        "member_features",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("computed_at", sa.Date, server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("days_without_checkin", sa.Integer, server_default="0", nullable=False),
        sa.Column("freq_last_30d", sa.Integer, server_default="0", nullable=False),
        sa.Column("freq_prev_30d", sa.Integer, server_default="0", nullable=False),
        sa.Column("freq_trend", sa.Numeric(5, 2), server_default="0", nullable=False),
        sa.Column("avg_duration_min", sa.Numeric(5, 1)),
        sa.Column("overdue_payments", sa.Integer, server_default="0", nullable=False),
        sa.Column("months_enrolled", sa.Integer, server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("member_id", "computed_at", name="uq_member_features_member_date"),
    )
    op.create_index("idx_member_features_gym", "member_features", ["gym_id", sa.text("computed_at DESC")])

    # ── churn_scores ────────────────────────────────────────────────────
    op.create_table(
        "churn_scores",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("computed_at", sa.Date, server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("tier", sa.String(10), nullable=False),
        sa.Column("reasons", JSONB, server_default=sa.text("'[]'"), nullable=False),
        sa.Column("origin", sa.String(10), server_default=sa.text("'rules'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.CheckConstraint("score >= 0 AND score <= 100", name="ck_churn_scores_score"),
        sa.CheckConstraint("tier IN ('critical', 'medium', 'low', 'safe')", name="ck_churn_scores_tier"),
        sa.CheckConstraint("origin IN ('rules', 'ml')", name="ck_churn_scores_origin"),
        sa.UniqueConstraint("member_id", "computed_at", name="uq_churn_scores_member_date"),
    )
    op.create_index("idx_churn_scores_gym", "churn_scores", ["gym_id", sa.text("computed_at DESC")])
    op.create_index("idx_churn_scores_gym_tier", "churn_scores", ["gym_id", "tier"])

    # ── actions_log ─────────────────────────────────────────────────────
    op.create_table(
        "actions_log",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("channel", sa.String(30), server_default=sa.text("'whatsapp'"), nullable=False),
        sa.Column("message", sa.Text),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("result", sa.String(30)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.CheckConstraint("channel IN ('whatsapp', 'email', 'phone', 'in_person', 'other')", name="ck_actions_log_channel"),
        sa.CheckConstraint("result IS NULL OR result IN ('delivered', 'read', 'replied', 'failed', 'pending')", name="ck_actions_log_result"),
    )
    op.create_index("idx_actions_log_gym", "actions_log", ["gym_id"])
    op.create_index("idx_actions_log_member", "actions_log", ["member_id", sa.text("sent_at DESC")])

    # ── notifications ───────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", UUID(as_uuid=True)),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("is_read", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.CheckConstraint("type IN ('churn_alert', 'action_result', 'payment_alert', 'system')", name="ck_notifications_type"),
    )
    op.create_index("idx_notifications_gym", "notifications", ["gym_id", sa.text("created_at DESC")])
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_gym_unread "
        "ON notifications (gym_id, is_read) WHERE is_read = false"
    )

    # ── plans ───────────────────────────────────────────────────────────
    op.create_table(
        "plans",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("stripe_price_id", sa.String(255)),
        sa.Column("price_cents", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(3), server_default=sa.text("'BRL'"), nullable=False),
        sa.Column("interval", sa.String(10), server_default=sa.text("'month'"), nullable=False),
        sa.Column("max_members", sa.Integer),
        sa.Column("features", JSONB, server_default=sa.text("'{}'"), nullable=False),
        sa.Column("active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        sa.CheckConstraint("interval IN ('month', 'year')", name="ck_plans_interval"),
    )

    # ── subscriptions ───────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255)),
        sa.Column("status", sa.String(20), server_default=sa.text("'active'"), nullable=False),
        sa.Column("current_period_start", sa.Date, nullable=False),
        sa.Column("current_period_end", sa.Date, nullable=False),
        sa.Column("cancel_at_period_end", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
        sa.UniqueConstraint("stripe_subscription_id"),
        sa.CheckConstraint("status IN ('active', 'past_due', 'cancelled', 'trialing')", name="ck_subscriptions_status"),
    )
    op.create_index("idx_subscriptions_gym", "subscriptions", ["gym_id"])

    # ── invoices ────────────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", UUID(as_uuid=True)),
        sa.Column("stripe_invoice_id", sa.String(255)),
        sa.Column("amount_cents", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(3), server_default=sa.text("'BRL'"), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("due_date", sa.Date),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.UniqueConstraint("stripe_invoice_id"),
        sa.CheckConstraint("status IN ('draft', 'open', 'paid', 'void', 'uncollectible')", name="ck_invoices_status"),
    )
    op.create_index("idx_invoices_gym", "invoices", ["gym_id"])

    # ── coupons ─────────────────────────────────────────────────────────
    op.create_table(
        "coupons",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("discount_pct", sa.Integer),
        sa.Column("discount_cents", sa.Integer),
        sa.Column("max_uses", sa.Integer),
        sa.Column("used_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("valid_from", sa.Date, server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("valid_until", sa.Date),
        sa.Column("active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
        sa.CheckConstraint("discount_pct >= 1 AND discount_pct <= 100", name="ck_coupons_discount_pct"),
        sa.CheckConstraint("discount_pct IS NOT NULL OR discount_cents IS NOT NULL", name="ck_coupons_has_discount"),
    )

    # ── coupon_usage ────────────────────────────────────────────────────
    op.create_table(
        "coupon_usage",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("coupon_id", UUID(as_uuid=True), nullable=False),
        sa.Column("gym_id", UUID(as_uuid=True), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"]),
        sa.ForeignKeyConstraint(["gym_id"], ["gyms.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_coupon_usage_gym", "coupon_usage", ["gym_id"])
    op.create_index("idx_coupon_usage_coupon", "coupon_usage", ["coupon_id"])

    # ── promotions ──────────────────────────────────────────────────────
    op.create_table(
        "promotions",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("plan_id", UUID(as_uuid=True)),
        sa.Column("coupon_id", UUID(as_uuid=True)),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"]),
    )

    # ── admin_users ─────────────────────────────────────────────────────
    op.create_table(
        "admin_users",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default=sa.text("'support'"), nullable=False),
        sa.Column("active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.CheckConstraint("role IN ('superadmin', 'finance', 'support')", name="ck_admin_users_role"),
    )

    # ── admin_sessions ──────────────────────────────────────────────────
    op.create_table(
        "admin_sessions",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("admin_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(500), nullable=False),
        sa.Column("ip_address", INET),
        sa.Column("user_agent", sa.Text),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["admin_user_id"], ["admin_users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("idx_admin_sessions_user", "admin_sessions", ["admin_user_id"])
    op.create_index("idx_admin_sessions_token", "admin_sessions", ["token"])

    # ── Migration tracking (compatibility) ──────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # ── Row-Level Security ──────────────────────────────────────────────
    for table in _RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS tenant_{table} ON {table}")
        op.execute(
            f"CREATE POLICY tenant_{table} ON {table} "
            f"USING (gym_id = current_setting('app.current_gym_id')::UUID)"
        )

    # ── updated_at trigger function ─────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    for table in _UPDATED_AT_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at "
            f"BEFORE UPDATE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION update_updated_at()"
        )


def downgrade() -> None:
    # Triggers
    for table in _UPDATED_AT_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at()")

    # RLS
    for table in _RLS_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    # Tables (reverse order)
    op.execute("DROP TABLE IF EXISTS _migrations")
    op.drop_table("admin_sessions")
    op.drop_table("admin_users")
    op.drop_table("promotions")
    op.drop_table("coupon_usage")
    op.drop_table("coupons")
    op.drop_table("invoices")
    op.drop_table("subscriptions")
    op.drop_table("plans")
    op.drop_table("notifications")
    op.drop_table("actions_log")
    op.drop_table("churn_scores")
    op.drop_table("member_features")
    op.drop_table("payments")
    op.drop_table("checkins")
    op.drop_table("members")
    op.drop_table("gyms")
