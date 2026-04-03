-- =============================================================================
-- 018_alter_receipts_ocr_status.sql
-- Adds 'error' to the ocr_status CHECK constraint on receipts.
-- Previously only ('pending', 'processing', 'done') were allowed;
-- 'error' is needed when the AI pipeline fails to process an image.
-- =============================================================================

ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_ocr_status_check;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_ocr_status_check
  CHECK (ocr_status IN ('pending', 'processing', 'done', 'error'));
