-- =============================================================================
-- 015_add_name_to_users.sql
-- Adds name column to users table if it does not already exist.
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
