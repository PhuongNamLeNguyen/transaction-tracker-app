-- =============================================================================
-- 007_create_receipts.sql
-- Domain   : Receipts & AI
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            004_create_categories.sql   (categories.id)
--            005_create_merchants.sql    (merchants.id)
--            006_create_transactions.sql (transactions.id)
-- Creates  : receipts
-- Note     : receipt_items → 008, ai_predictions + ai_corrections → 009
--            Split across 3 files because of the dependency chain:
--            receipts ← receipt_items ← ai_predictions
-- =============================================================================


-- -----------------------------------------------------------------------------
-- receipts
-- Stores the uploaded image and OCR output for a scanned receipt.
-- Created at upload time (POST /receipts/upload) — before a transaction exists.
-- Linked to a transaction only after the user confirms the AI draft
-- (POST /transactions), at which point transaction_id is populated.
--
-- FK strategy:
--   transaction_id  SET NULL  — receipt persists if transaction is deleted;
--                               orphaned receipts are cleaned up by the weekly
--                               background job (see api_spec.md § 7).
--   category_id     SET NULL  — AI-suggested category; nullable, soft reference.
--   merchant_id     SET NULL  — AI-identified merchant; nullable, soft reference.
--
-- transaction_id is nullable at the model level (no NOT NULL) because a receipt
-- exists in an unlinked state between upload and user confirmation.
--
-- scan_data JSON stores the raw OCR engine output verbatim — not parsed,
-- not structured. Downstream tables (receipt_items, ai_predictions) hold
-- the structured extraction. Keeping raw output allows re-processing if
-- the AI pipeline changes without re-uploading the image.
--
-- ocr_status lifecycle:
--   'pending'    → image uploaded, OCR not yet started
--   'processing' → OCR in progress
--   'done'       → OCR complete, scan_data populated
-- -----------------------------------------------------------------------------
CREATE TABLE receipts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        REFERENCES transactions(id) ON DELETE SET NULL,
  image_url      text        NOT NULL,
  ocr_status     text        NOT NULL DEFAULT 'pending'
                             CHECK (ocr_status IN ('pending', 'processing', 'done')),
  scan_data      json,
  category_id    uuid        REFERENCES categories(id)   ON DELETE SET NULL,
  merchant_id    uuid        REFERENCES merchants(id)    ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_category_id    ON receipts(category_id);
CREATE INDEX idx_receipts_merchant_id    ON receipts(merchant_id);
CREATE INDEX idx_receipts_ocr_status     ON receipts(ocr_status);