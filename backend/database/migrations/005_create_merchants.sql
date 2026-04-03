-- =============================================================================
-- 005_create_merchants.sql
-- Domain   : Merchants
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            004_create_categories.sql   (categories.id)
-- Creates  : merchants, merchant_aliases
-- Note     : merchants.default_category_id FK to categories is declared here
--            directly — categories already exists at this point in the run order.
--            Downstream tables that FK to merchants:
--              transactions.merchant_id  (added in 006)
--              receipts.merchant_id      (added in 007)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- merchants
-- Shared reference table — not owned by any user.
-- Stores real-world vendors that appear on receipts or are entered manually.
-- normalized_name is a lowercase, stripped version of name used for
-- deduplication and fuzzy matching in the AI pipeline
-- (e.g. "Starbucks Coffee #32" → "starbucks coffee").
-- default_category_id is a soft suggestion — the AI uses it as a prior when
-- no stronger signal (keyword match, user history) is available.
-- logo_url and country are optional enrichment fields populated over time.
-- -----------------------------------------------------------------------------
CREATE TABLE merchants (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text  NOT NULL,
  normalized_name     text  NOT NULL,
  default_category_id uuid  REFERENCES categories(id) ON DELETE SET NULL,
  country             text,
  logo_url            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchants_normalized_name ON merchants(normalized_name);


-- -----------------------------------------------------------------------------
-- merchant_aliases
-- Maps OCR variant spellings back to a canonical merchant.
-- The same physical merchant can appear as many different strings in receipt
-- text depending on the store, printer, or OCR quality:
--   "STARBUCKS"  /  "Starbucks Coffee"  /  "SBX #0421"
-- Each alias_name is a raw OCR string; merchant_id is the canonical record.
-- The AI pipeline queries this table first before falling back to fuzzy search.
-- No updated_at — aliases are created and deleted, never edited in place.
-- -----------------------------------------------------------------------------
CREATE TABLE merchant_aliases (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid  NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  alias_name  text  NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_aliases_merchant_id ON merchant_aliases(merchant_id);
CREATE INDEX idx_merchant_aliases_alias_name  ON merchant_aliases(alias_name);