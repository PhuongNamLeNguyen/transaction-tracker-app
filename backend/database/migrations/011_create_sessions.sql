-- =============================================================================
-- 011_create_sessions.sql
-- Domain   : Auth & Reference
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
-- Creates  : sessions
-- See also : auth_flow.md § 5 — refresh token lifecycle
-- =============================================================================


-- -----------------------------------------------------------------------------
-- sessions
-- Stores refresh tokens issued at login. One row = one active device session.
-- A user can have multiple concurrent sessions (multiple devices/browsers).
--
-- JWT access tokens are stateless and NOT stored here — they are verified
-- by the backend using JWT_SECRET alone. Only refresh tokens are persisted
-- because they are long-lived and must be revocable.
--
-- refresh_token_hash — bcrypt hash of the refresh token string.
--   The raw token is sent to the client and never stored.
--   On each refresh request: client sends raw token → backend hashes it →
--   compares with stored hash → issues new access token if valid.
--
-- user_id CASCADE — user deleted → all their sessions deleted automatically.
--   Ensures no orphaned refresh tokens can be used after account deletion.
--
-- expired_at — set at creation time (e.g. now() + 30 days).
--   Backend checks expired_at < now() before accepting a refresh request.
--
-- revoked_at — NULL means the session is still active.
--   Set when the user logs out, changes password, or an admin revokes access.
--   Keeping revoked rows (rather than deleting) provides an audit trail of
--   past sessions. A separate cleanup job can hard-delete old revoked rows.
--
-- device_info / ip_address — optional metadata for the session list UI
--   ("Logged in from iPhone, Tokyo, 2026-03-01"). Not used for auth decisions.
--
-- No updated_at — sessions are created and then either expire or are revoked.
--   revoked_at itself acts as the mutation timestamp.
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
  id                 uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text  NOT NULL,
  device_info        text,
  ip_address         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  expired_at         timestamptz NOT NULL,
  revoked_at         timestamptz
);

CREATE INDEX idx_sessions_user_id            ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expired_at         ON sessions(expired_at);