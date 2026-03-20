-- =============================================================================
-- 013_create_exchange_rates.sql
-- Domain   : Reference Data
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
-- Creates  : exchange_rates
-- Note     : Standalone table — no FK to users or any other domain.
--            Last migration in the series; safe to run in any order after 001.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- exchange_rates
-- Lookup table for currency conversion used by the dashboard and reports.
-- Rows are upserted by a background job that fetches live rates from an
-- external provider (e.g. Open Exchange Rates, ECB).
--
-- base_currency / target_currency — ISO 4217 codes (e.g. 'JPY', 'USD', 'EUR').
--   The pair (base_currency, target_currency) is UNIQUE — no duplicate pairs.
--   To convert amount from A to B: amount × rate WHERE base = A AND target = B.
--
-- rate — the multiplier: 1 unit of base_currency = rate units of target_currency.
--   Example: base='USD', target='JPY', rate=149.50 → $1 = ¥149.50.
--   CHECK (rate > 0) prevents zero or negative rates from being stored,
--   which would produce nonsensical conversion results.
--
-- updated_at — timestamp of the last rate fetch. Used by the dashboard to
--   display "Rates as of [date]" and by the background job to decide whether
--   a rate is stale and needs refreshing.
--   Unlike other tables, exchange_rates has NO created_at — rows are
--   upserted (INSERT ... ON CONFLICT DO UPDATE), so created_at would only
--   reflect the first insert and mislead about rate freshness.
--   updated_at alone is sufficient.
--
-- UPSERT pattern used by the background job:
--   INSERT INTO exchange_rates (base_currency, target_currency, rate, updated_at)
--   VALUES ($1, $2, $3, now())
--   ON CONFLICT (base_currency, target_currency)
--   DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();
--
-- No user_id — rates are global reference data shared across all users.
-- No CASCADE — standalone table; nothing depends on it via FK.
-- -----------------------------------------------------------------------------
CREATE TABLE exchange_rates (
  id              uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   text     NOT NULL,
  target_currency text     NOT NULL,
  rate            numeric  NOT NULL CHECK (rate > 0),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exchange_rates UNIQUE (base_currency, target_currency)
);

CREATE INDEX idx_exchange_rates_base_target
  ON exchange_rates(base_currency, target_currency);