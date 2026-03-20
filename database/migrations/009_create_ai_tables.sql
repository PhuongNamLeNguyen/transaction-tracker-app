-- =============================================================================
-- 009_create_ai_tables.sql
-- Domain   : Receipts & AI
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
--            004_create_categories.sql   (categories.id)
--            007_create_receipts.sql     (receipts.id)
--            008_create_receipt_items.sql (receipt_items.id)
-- Creates  : ai_predictions, ai_corrections
-- Note     : Final file in the Receipts & AI domain.
--            ai_predictions sits at the deepest level of the chain:
--            receipts → receipt_items → ai_predictions
--            ai_corrections links directly to receipts (not items) — it is
--            a flat audit log, not part of the item hierarchy.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ai_predictions
-- One row per receipt line item per model run — the AI's category guess.
-- Created by the AI service after OCR is done and item extraction is complete.
--
-- receipt_item_id CASCADE — prediction is owned by its line item.
--   If the item is deleted (e.g. receipt cleanup), the prediction goes with it.
--
-- predicted_category_id SET NULL — if a category is deleted from the system,
--   the prediction row is kept for audit purposes; category ref becomes NULL.
--   A NULL predicted_category_id means the AI found no matching category.
--
-- confidence_score is a float in [0, 1]:
--   >= 0.9  → AI auto-assigns category without user prompt
--   0.5–0.9 → shown as suggestion, user confirms
--   < 0.5   → AI abstains, user picks manually
--   These thresholds are enforced in the AI service layer, not the DB.
--
-- model_version records which version of the AI model produced this prediction.
--   Enables A/B analysis and rollback auditing when the model is updated.
--   Format is defined by the AI service (e.g. "gpt-4o-2024-11-20").
--
-- No updated_at — predictions are immutable. A new model run produces a new
--   row, not an update to the existing one. This preserves the full history
--   of model outputs across pipeline upgrades.
-- -----------------------------------------------------------------------------
CREATE TABLE ai_predictions (
  id                    uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_item_id       uuid     NOT NULL REFERENCES receipt_items(id) ON DELETE CASCADE,
  predicted_category_id uuid     REFERENCES categories(id)             ON DELETE SET NULL,
  confidence_score      numeric  NOT NULL
                                 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version         text     NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_predictions_receipt_item_id    ON ai_predictions(receipt_item_id);
CREATE INDEX idx_ai_predictions_predicted_category ON ai_predictions(predicted_category_id);


-- -----------------------------------------------------------------------------
-- ai_corrections
-- Audit log — records every field the user overrode after AI extraction.
-- One row per corrected field per receipt review session.
--
-- This table is append-only — rows are never updated or deleted by the app.
-- It serves two purposes:
--   1. Training signal: corrections feed back into future model fine-tuning.
--   2. Accountability: full audit trail of what the AI produced vs what
--      the user actually confirmed.
--
-- receipt_id CASCADE — corrections are scoped to a receipt; if the receipt
--   is deleted, its correction log goes with it.
--
-- corrected_by_user_id CASCADE — if a user is deleted (GDPR), their
--   correction history is also removed to avoid retaining personal data.
--
-- field_name identifies which field was corrected — e.g.:
--   'merchant_name', 'total_amount', 'transaction_date', 'category_id'
--   The set of valid field_names is enforced by the backend, not the DB.
--
-- ai_value and corrected_value are both text (nullable):
--   ai_value       : what the model produced — NULL if AI had no prediction.
--   corrected_value: what the user entered  — NULL if user cleared the field.
--   Storing both as text allows any field type to be captured uniformly
--   without needing a separate column per field. The backend casts as needed.
--
-- No updated_at — corrections are immutable once written.
-- -----------------------------------------------------------------------------
CREATE TABLE ai_corrections (
  id                   uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id           uuid  NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  field_name           text  NOT NULL,
  ai_value             text,
  corrected_value      text,
  corrected_by_user_id uuid  NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_corrections_receipt_id           ON ai_corrections(receipt_id);
CREATE INDEX idx_ai_corrections_corrected_by_user_id ON ai_corrections(corrected_by_user_id);