-- Migration 002: Create notifications table
-- Supports in-app notifications for gym staff (churn alerts, action results, payment alerts)

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

-- Row-Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_notifications ON notifications
    USING (gym_id = current_setting('app.current_gym_id')::UUID);
