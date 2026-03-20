-- =============================================================================
-- 012_create_auth_tokens.sql
-- Domain   : Auth & Reference
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
-- Creates  : password_reset_tokens, verification_tokens
-- See also : auth_flow.md § 7 (verification), § 8 (password reset)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- password_reset_tokens
-- Single-use tokens for the "forgot password" flow.
-- Lifecycle: user requests reset → token created → email sent with raw token
-- → user clicks link → backend verifies → password updated → used_at set.
--
-- token_hash — bcrypt hash of the raw token sent in the email link.
--   Raw token never stored. Same pattern as sessions.refresh_token_hash.
--
-- Expiry: 1 hour (expired_at = created_at + 1 hour), set by the backend.
--   Backend checks: token exists AND expired_at > now() AND used_at IS NULL.
--   All three conditions must hold before accepting a reset.
--
-- used_at — set when the token is consumed. NULL = unused, non-NULL = spent.
--   Tokens are NOT deleted after use — used_at provides an audit record of
--   when the password was last reset. Cleanup job removes old used rows.
--
-- Single-use enforcement: once used_at is set, the token is rejected even if
--   expired_at has not been reached. This prevents replay attacks if an email
--   is accessed after the password was already reset.
--
-- user_id CASCADE — user deleted → their pending reset tokens deleted.
-- No updated_at — token state changes only via used_at.
-- -----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expired_at timestamptz NOT NULL,
  used_at    timestamptz
);

CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expired_at ON password_reset_tokens(expired_at);


-- -----------------------------------------------------------------------------
-- verification_tokens
-- Single-use tokens for the email verification flow after registration.
-- Lifecycle: user registers → token created → verification email sent
-- → user clicks link → backend verifies → users.is_verified = true → token consumed.
--
-- Structurally identical to password_reset_tokens except:
--   - No used_at column — once verified, users.is_verified = true is the
--     canonical record. The token row is deleted after successful verification
--     (unlike password_reset_tokens which are kept for audit).
--   - Expiry: 24 hours (longer than reset tokens — users may not check email
--     immediately after registration).
--
-- Backend checks: token exists AND expired_at > now().
-- After verification: DELETE the token row, UPDATE users SET is_verified = true.
--
-- user_id CASCADE — user deleted → their pending verification tokens deleted.
-- No updated_at — tokens are created then deleted, never mutated.
-- -----------------------------------------------------------------------------
CREATE TABLE verification_tokens (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expired_at timestamptz NOT NULL
);

CREATE INDEX idx_verification_tokens_user_id    ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token_hash ON verification_tokens(token_hash);
CREATE INDEX idx_verification_tokens_expired_at ON verification_tokens(expired_at);