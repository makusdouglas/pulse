-- Pulse — Reference DDL
-- All tables use UUIDs, gym_id for multi-tenant, RLS enforced.
-- TimescaleDB hypertable on checkins for time-series queries.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "timescaledb";    -- hypertables

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE gyms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(30),
    clerk_org_id VARCHAR(255) UNIQUE,
    timezone    VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(30),
    enrolled_at     DATE NOT NULL DEFAULT CURRENT_DATE,
    cancelled_at    DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_gym_status ON members(gym_id, status);

CREATE TABLE checkins (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_min INTEGER,
    PRIMARY KEY (id, ts)
);

CREATE INDEX idx_checkins_gym_id ON checkins(gym_id, ts DESC);
CREATE INDEX idx_checkins_member ON checkins(member_id, ts DESC);

-- TimescaleDB hypertable (chunk interval 7 days for gym-scale data)
SELECT create_hypertable('checkins', 'ts', chunk_time_interval => INTERVAL '7 days');

CREATE TABLE payments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    due_date    DATE NOT NULL,
    paid_at     DATE,
    amount      NUMERIC(10,2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member ON payments(member_id, due_date DESC);
CREATE INDEX idx_payments_gym_status ON payments(gym_id, status);

CREATE TABLE member_features (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id           UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    computed_at         DATE NOT NULL DEFAULT CURRENT_DATE,
    days_without_checkin INTEGER NOT NULL DEFAULT 0,
    freq_last_30d       INTEGER NOT NULL DEFAULT 0,
    freq_prev_30d       INTEGER NOT NULL DEFAULT 0,
    freq_trend          NUMERIC(5,2) NOT NULL DEFAULT 0,
    avg_duration_min    NUMERIC(5,1),
    overdue_payments    INTEGER NOT NULL DEFAULT 0,
    months_enrolled     INTEGER NOT NULL DEFAULT 0,
    UNIQUE (member_id, computed_at)
);

CREATE INDEX idx_member_features_gym ON member_features(gym_id, computed_at DESC);

CREATE TABLE churn_scores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    computed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    score       INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    tier        VARCHAR(10) NOT NULL
                    CHECK (tier IN ('critical', 'medium', 'low', 'safe')),
    reasons     JSONB NOT NULL DEFAULT '[]',
    origin      VARCHAR(10) NOT NULL DEFAULT 'rules'
                    CHECK (origin IN ('rules', 'ml')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, computed_at)
);

CREATE INDEX idx_churn_scores_gym ON churn_scores(gym_id, computed_at DESC);
CREATE INDEX idx_churn_scores_gym_tier ON churn_scores(gym_id, tier);

CREATE TABLE actions_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    channel     VARCHAR(30) NOT NULL DEFAULT 'whatsapp'
                    CHECK (channel IN ('whatsapp', 'email', 'phone', 'in_person', 'other')),
    message     TEXT,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    result      VARCHAR(30)
                    CHECK (result IS NULL OR result IN ('delivered', 'read', 'replied', 'failed', 'pending')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_log_gym ON actions_log(gym_id);
CREATE INDEX idx_actions_log_member ON actions_log(member_id, sent_at DESC);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL
                    CHECK (type IN ('churn_alert', 'action_result', 'payment_alert', 'system')),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_gym ON notifications(gym_id, created_at DESC);
CREATE INDEX idx_notifications_gym_unread ON notifications(gym_id, read) WHERE read = false;

-- ============================================================
-- Billing Tables (SaaS — Stripe-backed)
-- ============================================================

CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255),
    price_cents     INTEGER NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'BRL',
    interval        VARCHAR(10) NOT NULL DEFAULT 'month'
                        CHECK (interval IN ('month', 'year')),
    max_members     INTEGER,
    features        JSONB NOT NULL DEFAULT '{}',
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
    current_period_start DATE NOT NULL,
    current_period_end   DATE NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_gym ON subscriptions(gym_id);

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    subscription_id     UUID REFERENCES subscriptions(id),
    stripe_invoice_id   VARCHAR(255) UNIQUE,
    amount_cents        INTEGER NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    due_date            DATE,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_gym ON invoices(gym_id);

CREATE TABLE coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    discount_pct    INTEGER CHECK (discount_pct >= 1 AND discount_pct <= 100),
    discount_cents  INTEGER,
    max_uses        INTEGER,
    used_count      INTEGER NOT NULL DEFAULT 0,
    valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until     DATE,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (discount_pct IS NOT NULL OR discount_cents IS NOT NULL)
);

CREATE TABLE coupon_usage (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   UUID NOT NULL REFERENCES coupons(id),
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_usage_gym ON coupon_usage(gym_id);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);

CREATE TABLE promotions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    plan_id     UUID REFERENCES plans(id),
    coupon_id   UUID REFERENCES coupons(id),
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Admin Tables (separate auth, not Clerk)
-- ============================================================

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'support'
                        CHECK (role IN ('superadmin', 'finance', 'support')),
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================
-- RLS policies use: current_setting('app.current_gym_id')::UUID
-- The TenantMiddleware sets this per-session via SET LOCAL.

-- Tables that need RLS (all tenant-scoped tables)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_members ON members
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_checkins ON checkins
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_payments ON payments
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_member_features ON member_features
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_churn_scores ON churn_scores
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_actions_log ON actions_log
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_subscriptions ON subscriptions
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_invoices ON invoices
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_coupon_usage ON coupon_usage
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

CREATE POLICY tenant_notifications ON notifications
    USING (gym_id = current_setting('app.current_gym_id')::UUID);

-- ============================================================
-- Updated_at trigger (auto-update on row modification)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gyms_updated_at
    BEFORE UPDATE ON gyms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
