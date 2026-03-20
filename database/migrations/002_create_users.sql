-- =============================================================================
-- 002_create_users.sql
-- Domain   : Users & Settings
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
-- Creates  : users, user_settings
-- =============================================================================


-- -----------------------------------------------------------------------------
-- users
-- Core identity table. Every other table with a user_id FK points here.
-- password_hash is bcrypt — never store or expose plain-text passwords.
-- is_verified gates access until email confirmation completes (see auth_flow.md § 7).
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        NOT NULL,
  password_hash   text        NOT NULL,
  is_verified     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);


-- -----------------------------------------------------------------------------
-- user_settings
-- 1-to-1 with users (user_id is both PK and FK).
-- Row is created immediately after user registration with safe defaults.
-- theme         : drives CSS data-theme attribute on the frontend.
-- cycle_start_day : the date income/budget cycles reset (e.g. the 1st or 25th).
-- target_currency : display currency for converted totals on the dashboard.
-- system_language : BCP 47 locale — sets document.documentElement.lang.
-- time_zone     : IANA timezone — used for transaction_date bucketing.
-- -----------------------------------------------------------------------------
CREATE TABLE user_settings (
  user_id          uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme            text        NOT NULL DEFAULT 'light'
                               CHECK (theme IN ('light', 'dark')),
  cycle_start_day  date,
  target_currency  text        NOT NULL DEFAULT 'JPY',
  system_language  text        NOT NULL DEFAULT 'en',
  time_zone        text        NOT NULL DEFAULT 'Asia/Tokyo',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);