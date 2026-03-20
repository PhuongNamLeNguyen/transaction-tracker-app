-- =============================================================================
-- 006_create_transactions.sql
-- Domain   : Transactions
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
--            003_create_accounts.sql     (accounts.id)
--            004_create_categories.sql   (categories.id)
--            005_create_merchants.sql    (merchants.id)
-- Creates  : transactions, transaction_splits
-- =============================================================================


-- -----------------------------------------------------------------------------
-- transactions
-- Core financial event record — the most queried table in the system.
-- Every income, expense, investment, and saving entry is a row here.
--
-- FK strategy:
--   user_id    CASCADE  — user deleted → all their transactions deleted.
--   account_id RESTRICT — account cannot be deleted while transactions exist;
--                         backend must reassign or delete transactions first.
--   merchant_id SET NULL — merchant deleted → transaction kept, merchant unlinked.
--
-- amount > 0 enforced at DB level — matches CreateTransactionDto validation
-- (see data_models.md § 3). Zero-amount transactions are meaningless.
--
-- status flow:
--   manual entry   : backend sets 'confirmed' directly on INSERT (skips 'ready').
--   receipt_scan   : starts 'processing' → 'ready' after AI draft → 'confirmed'
--                    after user confirmation. Default 'ready' is a safe middle
--                    ground; the backend service overrides as needed.
--
-- transaction_date is type DATE (not timestamptz) — we record the calendar day
-- of the transaction, not the exact time. Time-of-day is irrelevant for
-- personal finance tracking and avoids timezone edge cases on date bucketing.
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  account_id       uuid        NOT NULL REFERENCES accounts(id)  ON DELETE RESTRICT,
  type             text        NOT NULL CHECK (type IN ('income', 'expense', 'investment', 'saving')),
  amount           numeric     NOT NULL CHECK (amount > 0),
  currency         text        NOT NULL,
  merchant_id      uuid        REFERENCES merchants(id)          ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'ready'
                               CHECK (status IN ('processing', 'ready', 'confirmed')),
  source           text        NOT NULL DEFAULT 'manual'
                               CHECK (source IN ('manual', 'receipt_scan')),
  transaction_date date        NOT NULL,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id          ON transactions(user_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_merchant_id      ON transactions(merchant_id);
CREATE INDEX idx_transactions_status           ON transactions(status);


-- -----------------------------------------------------------------------------
-- transaction_splits
-- Decomposes one transaction across multiple categories.
-- Example: a ¥5,000 supermarket receipt split as:
--   ¥3,000 → Food & Dining
--   ¥2,000 → Household
--
-- Business rule: SUM(splits.amount) must equal transactions.amount.
-- This is NOT enforced at the DB level (no trigger here) — it is enforced
-- by the backend service layer on every INSERT/UPDATE of splits.
-- Rationale: a DB-level check would require a trigger or deferred constraint
-- with significant complexity; the service layer validation is simpler and
-- sufficient given the single write path through the backend.
--
-- amount >= 0 (not > 0): a split of ¥0 is technically valid as a placeholder
-- while the user is still filling in the split form, before confirming.
--
-- category_id RESTRICT — a category cannot be deleted while splits reference
-- it. Backend must reassign splits before deleting a category.
--
-- No direct user_id FK — user ownership is inferred through the parent
-- transaction. Querying splits always goes through transactions first.
-- -----------------------------------------------------------------------------
CREATE TABLE transaction_splits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id    uuid        NOT NULL REFERENCES categories(id)   ON DELETE RESTRICT,
  amount         numeric     NOT NULL CHECK (amount >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_category_id    ON transaction_splits(category_id);