-- =============================================================================
-- 010_create_budgets.sql
-- Domain   : Budgets
-- Depends  : 001_create_extensions.sql  (gen_random_uuid)
--            002_create_users.sql        (users.id)
--            004_create_categories.sql   (categories.id)
-- Creates  : budget_periods, budgets
-- =============================================================================


-- -----------------------------------------------------------------------------
-- budget_periods
-- Defines the time window a user's budget applies to.
-- A user can have multiple non-overlapping periods (e.g. monthly).
-- Overlap enforcement is NOT at the DB level — handled by the backend service
-- layer to avoid complex exclusion constraint setup.
--
-- user_id CASCADE — user deleted → all their budget periods and child
--   budgets are removed automatically via the cascade chain:
--   users → budget_periods → budgets.
--
-- start_date / end_date are DATE (not timestamptz) — budget periods are
--   calendar-day ranges, not timestamp ranges. Consistent with
--   transactions.transaction_date (see 006).
--
-- chk_budget_period_dates enforces end_date > start_date at DB level —
--   a period where end <= start is always a data entry error.
--   A single-day period (start = end) is also invalid since end > start
--   requires at least a 1-day span.
--
-- No updated_at — if a period needs to change, the user deletes and
--   recreates it. Mutable periods would invalidate historical budget
--   comparisons (actual spend vs. budget for a past period).
-- -----------------------------------------------------------------------------
CREATE TABLE budget_periods (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date date  NOT NULL,
  end_date   date  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_budget_period_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_budget_periods_user_id ON budget_periods(user_id);


-- -----------------------------------------------------------------------------
-- budgets
-- One row = one category allocation within a budget period.
-- A period can have many budgets (one per category the user wants to track).
-- Example: March 2026 period → Food ¥52,500 + Transport ¥15,000 + ...
--
-- period_id CASCADE — budget_period deleted → all its allocations deleted.
--
-- category_id RESTRICT — a category cannot be deleted while a budget
--   references it. Backend must delete or reassign the budget first.
--   Prevents silently losing budget allocation data.
--
-- amount > 0 — a zero budget allocation is meaningless; enforces that the
--   user has explicitly set a non-trivial spending limit.
--
-- currency is stored per-budget (not per-period) to support a future
--   multi-currency budget scenario — e.g. a JPY budget for local expenses
--   and a USD budget for international subscriptions within the same period.
--   Currently all budgets in a period are expected to share the user's
--   target_currency (user_settings.target_currency), but the schema does
--   not enforce this constraint to remain extensible.
--
-- No updated_at — budget amounts are replaced, not updated. If a user
--   wants to change a budget amount mid-period, the service layer deletes
--   the old row and inserts a new one, preserving the audit trail.
-- -----------------------------------------------------------------------------
CREATE TABLE budgets (
  id          uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid     NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id uuid     NOT NULL REFERENCES categories(id)     ON DELETE RESTRICT,
  amount      numeric  NOT NULL CHECK (amount > 0),
  currency    text     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_period_id   ON budgets(period_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE UNIQUE INDEX idx_budgets_period_category
  ON budgets(period_id, category_id);