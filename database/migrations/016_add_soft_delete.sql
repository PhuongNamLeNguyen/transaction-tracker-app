-- =============================================================================
-- 016_add_soft_delete.sql
-- Adds soft-delete support to transactions and transaction_splits.
-- =============================================================================

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE transaction_splits
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at
    ON transactions(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_splits_deleted_at
    ON transaction_splits(deleted_at)
    WHERE deleted_at IS NULL;
