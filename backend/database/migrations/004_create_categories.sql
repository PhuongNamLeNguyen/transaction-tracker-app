-- =============================================================================
-- 004_create_categories.sql
-- Domain   : Categories
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
-- Creates  : categories, category_keywords
-- Note     : No FK to users — categories are global, shared across all users.
--            Downstream tables that FK here:
--              merchants.default_category_id   (added in 005)
--              transaction_splits.category_id  (added in 006)
--              receipts.category_id            (added in 007)
--              ai_predictions.predicted_category_id (added in 009)
--              budgets.category_id             (added in 010)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- categories
-- Global lookup table — not owned by any user.
-- Seeded with default categories (see seeds/01_categories.sql).
-- type mirrors TransactionType enum: income | expense | investment | saving.
-- icon is nullable — some dynamically created categories may not have one yet.
-- No parent_id / tree structure — categories are flat in this version.
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  type       text        NOT NULL
                         CHECK (type IN ('income', 'expense', 'investment', 'saving')),
  icon       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- category_keywords
-- Used by the AI pipeline to auto-assign a category to a receipt line item.
-- Each keyword belongs to exactly one category.
-- Multiple keywords can map to the same category (one-to-many).
-- Example: category "Food & Dining" → keywords: ["restaurant", "cafe", "lunch"]
-- Seeded alongside categories in seeds/01_categories.sql.
-- -----------------------------------------------------------------------------
CREATE TABLE category_keywords (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_keywords_category_id ON category_keywords(category_id);