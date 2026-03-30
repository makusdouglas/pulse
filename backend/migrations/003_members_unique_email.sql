-- Add unique constraint on (gym_id, email) to support bulk upsert
-- via INSERT ... ON CONFLICT (gym_id, email) DO UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_gym_email
    ON members (gym_id, email);
