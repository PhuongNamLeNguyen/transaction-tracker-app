-- Migration 019: Add Google OAuth support
-- Adds google_id column to users, makes password_hash nullable (OAuth users have no password)

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
