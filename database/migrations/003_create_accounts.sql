-- =============================================================================
-- 003_create_accounts.sql
-- Domain   : Accounts
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
-- Creates  : accounts
-- =============================================================================


-- -----------------------------------------------------------------------------
-- accounts
-- A financial container owned by a user (cash wallet, bank account, e-wallet).
-- Each transaction belongs to exactly one account via account_id FK.
-- balance reflects the current net amount in the account's own currency.
-- currency is stored per-account because a user may hold multiple currencies
-- (e.g. a JPY bank account + a USD investment account).
-- balance has no CHECK constraint — investment/saving accounts can go negative
-- (e.g. a margin account or a saving account with an overdraft facility).
-- -----------------------------------------------------------------------------
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

CREATE INDEX idx_accounts_user_id ON accounts(user_id);