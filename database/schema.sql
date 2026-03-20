-- =============================================================================
-- Transaction Tracker — Full Database Schema
-- PostgreSQL
-- 18 tables across 6 domains:
--   1. Users & Settings
--   2. Accounts & Transactions
--   3. Categories
--   4. Receipts & AI
--   5. Budgets
--   6. Auth & Reference
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 1. USERS & SETTINGS
-- =============================================================================

CREATE TABLE users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        NOT NULL,
  password_hash   text        NOT NULL,
  is_verified     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id          uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme            text        NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  cycle_start_day  date,
  target_currency  text        NOT NULL DEFAULT 'JPY',
  system_language  text        NOT NULL DEFAULT 'en',
  time_zone        text        NOT NULL DEFAULT 'Asia/Tokyo',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 2. ACCOUNTS & TRANSACTIONS
-- =============================================================================

CREATE TABLE accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  type         text        NOT NULL,
  currency     text        NOT NULL,
  balance      numeric     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- categories must exist before transactions (FK below)
-- defined in section 3, but transactions references it via transaction_splits

CREATE TABLE merchants (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  normalized_name     text        NOT NULL,
  default_category_id uuid        REFERENCES categories(id) ON DELETE SET NULL,
  country             text,
  logo_url            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE merchant_aliases (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  alias_name  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id       uuid        NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type             text        NOT NULL CHECK (type IN ('income', 'expense', 'investment', 'saving')),
  amount           numeric     NOT NULL CHECK (amount > 0),
  currency         text        NOT NULL,
  merchant_id      uuid        REFERENCES merchants(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'confirmed')),
  -- 'ready' default is for receipt_scan flow; manual transactions are set to 'confirmed' by the backend service layer
  source           text        NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receipt_scan')),
  transaction_date date        NOT NULL,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transaction_splits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id    uuid        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount         numeric     NOT NULL CHECK (amount >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 3. CATEGORIES
-- =============================================================================

CREATE TABLE categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  type       text        NOT NULL CHECK (type IN ('income', 'expense', 'investment', 'saving')),
  icon       text,       -- nullable per data_models.md § 2
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE category_keywords (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);



-- =============================================================================
-- 4. RECEIPTS & AI
-- =============================================================================

CREATE TABLE receipts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        REFERENCES transactions(id) ON DELETE SET NULL,
  image_url      text        NOT NULL,
  ocr_status     text        NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'done')),
  scan_data      json,
  category_id    uuid        REFERENCES categories(id) ON DELETE SET NULL,
  merchant_id    uuid        REFERENCES merchants(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receipt_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid        NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_name  text        NOT NULL,
  price      numeric     NOT NULL CHECK (price >= 0),
  quantity   numeric     NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_predictions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_item_id        uuid        NOT NULL REFERENCES receipt_items(id) ON DELETE CASCADE,
  predicted_category_id  uuid        REFERENCES categories(id) ON DELETE SET NULL,
  confidence_score       numeric     NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version          text        NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_corrections (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id           uuid        NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  field_name           text        NOT NULL,
  ai_value             text,
  corrected_value      text,
  corrected_by_user_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 5. BUDGETS
-- =============================================================================

CREATE TABLE budget_periods (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date date        NOT NULL,
  end_date   date        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_budget_period_dates CHECK (end_date > start_date)
);

CREATE TABLE budgets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid        NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id uuid        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount      numeric     NOT NULL CHECK (amount > 0),
  currency    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 6. AUTH & REFERENCE
-- =============================================================================

CREATE TABLE sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  text        NOT NULL,
  device_info         text,
  ip_address          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  expired_at          timestamptz NOT NULL,
  revoked_at          timestamptz
);

CREATE TABLE password_reset_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expired_at  timestamptz NOT NULL,
  used_at     timestamptz
);

CREATE TABLE verification_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expired_at  timestamptz NOT NULL
);

CREATE TABLE exchange_rates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   text        NOT NULL,
  target_currency text        NOT NULL,
  rate            numeric     NOT NULL CHECK (rate > 0),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exchange_rates UNIQUE (base_currency, target_currency)
);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- users
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- merchants
CREATE INDEX idx_merchants_normalized_name      ON merchants(normalized_name);
CREATE INDEX idx_merchant_aliases_merchant_id   ON merchant_aliases(merchant_id);
CREATE INDEX idx_merchant_aliases_alias_name    ON merchant_aliases(alias_name);

-- transactions
CREATE INDEX idx_transactions_user_id          ON transactions(user_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_merchant_id      ON transactions(merchant_id);
CREATE INDEX idx_transactions_status           ON transactions(status);

-- transaction_splits
CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_category_id    ON transaction_splits(category_id);

-- receipts
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_category_id    ON receipts(category_id);
CREATE INDEX idx_receipts_merchant_id    ON receipts(merchant_id);
CREATE INDEX idx_receipts_ocr_status     ON receipts(ocr_status);

-- receipt_items
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- category_keywords
CREATE INDEX idx_category_keywords_category_id ON category_keywords(category_id);

-- ai_predictions
CREATE INDEX idx_ai_predictions_receipt_item_id    ON ai_predictions(receipt_item_id);
CREATE INDEX idx_ai_predictions_predicted_category ON ai_predictions(predicted_category_id);

-- ai_corrections
CREATE INDEX idx_ai_corrections_receipt_id           ON ai_corrections(receipt_id);
CREATE INDEX idx_ai_corrections_corrected_by_user_id ON ai_corrections(corrected_by_user_id);

-- exchange_rates
CREATE INDEX idx_exchange_rates_base_target ON exchange_rates(base_currency, target_currency);

-- budget_periods
CREATE INDEX idx_budget_periods_user_id ON budget_periods(user_id);

-- budgets
CREATE INDEX idx_budgets_period_id   ON budgets(period_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE UNIQUE INDEX idx_budgets_period_category ON budgets(period_id, category_id);

-- sessions
CREATE INDEX idx_sessions_user_id            ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expired_at         ON sessions(expired_at);

-- password_reset_tokens
CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expired_at ON password_reset_tokens(expired_at);

-- verification_tokens
CREATE INDEX idx_verification_tokens_user_id    ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token_hash ON verification_tokens(token_hash);
CREATE INDEX idx_verification_tokens_expired_at ON verification_tokens(expired_at);