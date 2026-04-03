-- =============================================================================
-- seeds/03_exchange_rates.sql
-- Domain   : Reference Data
-- Inserts  : exchange_rates (16 pairs)
-- Depends  : 013_create_exchange_rates.sql
-- Idempotent: INSERT ... ON CONFLICT DO UPDATE — updates rate on re-run.
--
-- Pairs covered:
--   JPY as both base and target against: VND, USD, EUR, THB, SGD, KRW, GBP
--   USD → VND (common cross-rate for Vietnamese users)
--
-- Rates here are SEED / PLACEHOLDER values — approximate as of early 2026.
-- The background job (api_spec.md § 7) overwrites these with live rates
-- on first run. The seed exists so the dashboard works immediately after
-- deploy, before the first background job fires.
--
-- Rate semantics:
--   1 unit of base_currency = rate units of target_currency
--   e.g. base=USD, target=JPY, rate=149.50 → $1 = ¥149.50
-- =============================================================================

BEGIN;

INSERT INTO exchange_rates (base_currency, target_currency, rate, updated_at) VALUES

  -- ── JPY → others ──────────────────────────────────────────────────────────
  -- 1 JPY = x VND  (~160 VND per 1 JPY)
  ('JPY', 'VND', 160.00,   now()),
  -- 1 JPY = x USD
  ('JPY', 'USD', 0.0067,   now()),
  -- 1 JPY = x EUR
  ('JPY', 'EUR', 0.0061,   now()),
  -- 1 JPY = x THB  (~0.24 THB per 1 JPY)
  ('JPY', 'THB', 0.24,     now()),
  -- 1 JPY = x SGD
  ('JPY', 'SGD', 0.0089,   now()),
  -- 1 JPY = x KRW  (~8.8 KRW per 1 JPY)
  ('JPY', 'KRW', 8.80,     now()),
  -- 1 JPY = x GBP
  ('JPY', 'GBP', 0.0053,   now()),

  -- ── others → JPY ──────────────────────────────────────────────────────────
  -- 1 VND = x JPY
  ('VND', 'JPY', 0.00625,  now()),
  -- 1 USD = x JPY
  ('USD', 'JPY', 149.50,   now()),
  -- 1 EUR = x JPY
  ('EUR', 'JPY', 163.00,   now()),
  -- 1 THB = x JPY
  ('THB', 'JPY', 4.15,     now()),
  -- 1 SGD = x JPY
  ('SGD', 'JPY', 112.00,   now()),
  -- 1 KRW = x JPY
  ('KRW', 'JPY', 0.1136,   now()),
  -- 1 GBP = x JPY
  ('GBP', 'JPY', 189.00,   now()),

  -- ── common cross-rates ────────────────────────────────────────────────────
  -- 1 USD = x VND
  ('USD', 'VND', 25300.00,       now()),
  -- 1 VND = x USD
  ('VND', 'USD', 0.0000395,      now()),
  -- 1 EUR = x VND
  ('EUR', 'VND', 27500.00,       now()),
  -- 1 VND = x EUR
  ('VND', 'EUR', 0.0000364,      now()),
  -- 1 GBP = x VND
  ('GBP', 'VND', 32000.00,       now()),
  -- 1 VND = x GBP
  ('VND', 'GBP', 0.0000313,      now()),
  -- 1 SGD = x VND
  ('SGD', 'VND', 18900.00,       now()),
  -- 1 VND = x SGD
  ('VND', 'SGD', 0.0000529,      now()),
  -- 1 THB = x VND
  ('THB', 'VND', 700.00,         now()),
  -- 1 VND = x THB
  ('VND', 'THB', 0.00143,        now()),
  -- 1 KRW = x VND
  ('KRW', 'VND', 18.00,          now()),
  -- 1 VND = x KRW
  ('VND', 'KRW', 0.0556,         now()),
  -- 1 CNY = x VND
  ('CNY', 'VND', 3500.00,        now()),
  -- 1 VND = x CNY
  ('VND', 'CNY', 0.000286,       now()),
  -- 1 AUD = x VND
  ('AUD', 'VND', 16000.00,       now()),
  -- 1 VND = x AUD
  ('VND', 'AUD', 0.0000625,      now())

ON CONFLICT (base_currency, target_currency)
DO UPDATE SET
  rate       = EXCLUDED.rate,
  updated_at = now();

COMMIT;