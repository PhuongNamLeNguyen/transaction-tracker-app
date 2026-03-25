-- =============================================================================
-- 020_alter_transaction_date_to_timestamptz.sql
-- Alters transactions.transaction_date from DATE to TIMESTAMPTZ so that
-- receipt-scanned transactions can store the exact time read from the receipt.
-- Manual transactions will retain midnight (00:00:00 UTC) from the cast.
-- =============================================================================

ALTER TABLE transactions
    ALTER COLUMN transaction_date TYPE timestamptz
    USING transaction_date::timestamptz;
