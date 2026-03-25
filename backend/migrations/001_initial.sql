-- Migration 001: Initial schema
-- Idempotent — safe to re-run.
-- Applies the full Pulse DDL: core, billing, admin tables + RLS + hypertable.

BEGIN;

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS gyms (
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

CREATE TABLE IF NOT EXISTS members (
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

CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON members(gym_id, status);

CREATE TABLE IF NOT EXISTS checkins (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_min INTEGER,
    PRIMARY KEY (id, ts)
);

CREATE INDEX IF NOT EXISTS idx_checkins_gym_id ON checkins(gym_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id, ts DESC);

-- Hypertable (idempotent: only create if not already a hypertable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'checkins'
    ) THEN
        PERFORM create_hypertable('checkins', 'ts', chunk_time_interval => INTERVAL '7 days');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
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

CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_gym_status ON payments(gym_id, status);

CREATE TABLE IF NOT EXISTS member_features (
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

CREATE INDEX IF NOT EXISTS idx_member_features_gym ON member_features(gym_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS churn_scores (
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

CREATE INDEX IF NOT EXISTS idx_churn_scores_gym ON churn_scores(gym_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_scores_gym_tier ON churn_scores(gym_id, tier);

CREATE TABLE IF NOT EXISTS actions_log (
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

CREATE INDEX IF NOT EXISTS idx_actions_log_gym ON actions_log(gym_id);
CREATE INDEX IF NOT EXISTS idx_actions_log_member ON actions_log(member_id, sent_at DESC);

-- ============================================================
-- Billing Tables (SaaS — Stripe-backed)
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
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

CREATE TABLE IF NOT EXISTS subscriptions (
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_gym ON subscriptions(gym_id);

CREATE TABLE IF NOT EXISTS invoices (
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

CREATE INDEX IF NOT EXISTS idx_invoices_gym ON invoices(gym_id);

CREATE TABLE IF NOT EXISTS coupons (
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

CREATE TABLE IF NOT EXISTS coupon_usage (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   UUID NOT NULL REFERENCES coupons(id),
    gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_gym ON coupon_usage(gym_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);

CREATE TABLE IF NOT EXISTS promotions (
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

CREATE TABLE IF NOT EXISTS admin_users (
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

CREATE TABLE IF NOT EXISTS admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policies (DROP IF EXISTS + CREATE for idempotency)
DO $$
DECLARE
    _policies TEXT[] := ARRAY[
        'tenant_members', 'tenant_checkins', 'tenant_payments',
        'tenant_member_features', 'tenant_churn_scores', 'tenant_actions_log',
        'tenant_subscriptions', 'tenant_invoices', 'tenant_coupon_usage'
    ];
    _tables TEXT[] := ARRAY[
        'members', 'checkins', 'payments',
        'member_features', 'churn_scores', 'actions_log',
        'subscriptions', 'invoices', 'coupon_usage'
    ];
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(_policies, 1) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', _policies[i], _tables[i]);
        EXECUTE format(
            'CREATE POLICY %I ON %I USING (gym_id = current_setting(''app.current_gym_id'')::UUID)',
            _policies[i], _tables[i]
        );
    END LOOP;
END $$;

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    _triggers TEXT[][] := ARRAY[
        ARRAY['trg_gyms_updated_at', 'gyms'],
        ARRAY['trg_members_updated_at', 'members'],
        ARRAY['trg_subscriptions_updated_at', 'subscriptions'],
        ARRAY['trg_admin_users_updated_at', 'admin_users']
    ];
    t TEXT[];
BEGIN
    FOREACH t SLICE 1 IN ARRAY _triggers LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t[1], t[2]);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t[1], t[2]
        );
    END LOOP;
END $$;

-- ============================================================
-- Migration tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS _migrations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) UNIQUE NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO _migrations (name)
VALUES ('001_initial')
ON CONFLICT (name) DO NOTHING;

COMMIT;
