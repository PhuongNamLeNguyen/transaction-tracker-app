-- =============================================================================
-- 008_create_receipt_items.sql
-- Domain   : Receipts & AI
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            007_create_receipts.sql     (receipts.id)
-- Creates  : receipt_items
-- Note     : ai_predictions FK to receipt_items is added in 009.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- receipt_items
-- Line items extracted from a receipt by the OCR + AI pipeline.
-- Each row is one product/service line on the physical receipt.
-- Example: a convenience store receipt with 3 items → 3 rows here.
--
-- receipt_id CASCADE — items are owned by their receipt; if the receipt is
-- deleted (e.g. orphan cleanup job), all its items are deleted automatically.
--
-- item_name  : raw text from OCR — not normalized or deduplicated.
--              The AI pipeline reads this to predict a category via
--              category_keywords matching (see 004_create_categories.sql).
--
-- price      : unit price of the item, >= 0.
--              Price of 0 is valid — some receipt lines are free items,
--              loyalty rewards, or voided entries with ¥0 value.
--
-- quantity   : number of units, >= 0, DEFAULT 1.
--              0 is valid for voided/cancelled line items on receipts.
--              Stored as numeric (not integer) to handle fractional quantities
--              (e.g. deli items sold by weight: 0.35 kg of cheese).
--
-- No currency column — receipt_items inherit currency from their parent
-- receipt → transaction. All items on a single receipt share one currency.
--
-- No updated_at — line items are extracted once and never edited in place.
-- If the user corrects a line item, the correction is recorded in
-- ai_corrections (009), not by mutating this row.
-- =============================================================================
CREATE TABLE receipt_items (
  id         uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid     NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_name  text     NOT NULL,
  price      numeric  NOT NULL CHECK (price >= 0),
  quantity   numeric  NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);