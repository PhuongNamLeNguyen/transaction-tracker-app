-- Users
CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  is_verified   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- User settings (tạo kèm khi register)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id          uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme            text        NOT NULL DEFAULT 'light',
  cycle_start_day  date,
  target_currency  text        NOT NULL DEFAULT 'JPY',
  system_language  text        NOT NULL DEFAULT 'ja',
  time_zone        text        NOT NULL DEFAULT 'Asia/Tokyo',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Sessions (refresh token store)
CREATE TABLE IF NOT EXISTS sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  text        NOT NULL,
  device_info         text,
  ip_address          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  expired_at          timestamptz NOT NULL,
  revoked_at          timestamptz
);

-- Verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expired_at  timestamptz NOT NULL
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expired_at  timestamptz NOT NULL,
  used_at     timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email               ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id          ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash       ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_user_id      ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id    ON password_reset_tokens(user_id);