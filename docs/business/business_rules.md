# Business Rules

> Service-layer rules for Transaction Tracker. All backend services must enforce every rule in this file.
> For data shapes — see **data_models.md**.
> For DB tables — see **database_schema.md**.
> For API endpoint signatures — see **api_spec.md**.

---

## Table of Contents

- [Business Rules](#business-rules)
  - [Table of Contents](#table-of-contents)
  - [1. Transactions](#1-transactions)
    - [Creation](#creation)
    - [Status transitions](#status-transitions)
    - [Update](#update)
    - [Deletion](#deletion)
  - [2. Transaction Splits](#2-transaction-splits)
    - [Invariants](#invariants)
    - [Soft-delete](#soft-delete)
    - [Permanent delete](#permanent-delete)
    - [Restore](#restore)
  - [3. Accounts \& Balances](#3-accounts--balances)
    - [Balance updates](#balance-updates)
    - [Account management](#account-management)
  - [4. Categories](#4-categories)
  - [5. Receipts \& AI Pipeline](#5-receipts--ai-pipeline)
  - [6. Budgets](#6-budgets)
    - [Period rules](#period-rules)
    - [Budget allocation rules](#budget-allocation-rules)
  - [7. Merchants](#7-merchants)
  - [8. Currency \& Exchange Rates](#8-currency--exchange-rates)
  - [9. Users \& Settings](#9-users--settings)
  - [10. Data Ownership \& Scoping](#10-data-ownership--scoping)

---

## 1. Transactions

### Creation

- `amount` must be > 0 — reject `VALIDATION_ERROR`
- `type` must be one of `income | expense | investment | saving` — reject `VALIDATION_ERROR`
- `transactionDate` must be a valid ISO 8601 date — future dates are allowed
- `accountId` must belong to the authenticated user — reject `RESOURCE_NOT_FOUND` if not found or owned by another user
- `categoryId` must exist and its `type` must match the transaction `type` (e.g. an `expense` transaction must use an `expense` category)
- Manual entry: `source = manual`, `status = confirmed` immediately on creation
- Receipt scan: `source = receipt_scan`, `status = confirmed` immediately on user confirmation — no `transactions` row exists before the user taps **Confirm & Save**

### Status transitions

`TransactionStatus` values `processing` and `ready` are **not used** on the `transactions` table — reserved for future use. A transaction row is created once and is immediately `confirmed`; status is never updated after creation.

Receipt scan progress is tracked via `receipts.ocr_status` (`pending → processing → done`), not on `transactions`.

Only `confirmed` transactions count toward account balances, budget totals, and dashboard charts.

### Update

- `amount`, `type`, `accountId`, `currency`, `transactionDate`, `note` may be updated on a `confirmed` transaction
- `source` and `status` are not updatable via the API
- When `amount` changes: reverse the original amount effect on the account balance, then apply the new amount
- When `accountId` changes: reverse the old account balance and update the new account balance in the same DB transaction
- When `type` changes: validate that all existing active `transaction_splits` category types still match the new type — reject `VALIDATION_ERROR` if any mismatch

### Deletion

- Hard-deletes the `transactions` row
- All associated `transaction_splits` (active and soft-deleted) are cascade hard-deleted
- The associated `receipts` row is **not deleted** — `transaction_id` is set to `null` for the weekly cleanup job to handle
- Account balance is reversed: income amount subtracted; expense/investment/saving amounts added back
- Permanent — cannot be undone

---

## 2. Transaction Splits

### Invariants

Every write that creates, updates, or deletes a split must satisfy all three invariants — reject `VALIDATION_ERROR` on any violation:

- **Sum invariant** — `SUM(amount WHERE deleted_at IS NULL) = transactions.amount`
- **Minimum one active split** — soft-deleting the last active split returns `VALIDATION_ERROR`: *"A transaction must have at least one split. To remove this transaction entirely, delete the transaction itself."*
- **Category type alignment** — each split's `category_id` must reference a `categories` row whose `type` matches `transactions.type`
- **Positive amount** — `transaction_splits.amount > 0`, enforced at DB level and re-validated on every write

When a split is soft-deleted the sum invariant temporarily does not hold. The backend does not auto-redistribute — it shows a reconciliation warning. The invariant is re-enforced when the user adjusts the remaining splits, permanently deletes, or restores the soft-deleted split.

### Soft-delete

Sets `deleted_at = now()`. Soft-deleted rows are excluded from all queries, the sum invariant check, dashboard aggregations, and budget calculations. Accessible in **Settings → Deleted Transactions**.

Before soft-deleting: verify the split belongs to `req.user.id` and at least one other active split exists on the transaction.

### Permanent delete

Hard-deletes the row. Only permitted when `deleted_at IS NOT NULL`. Verify ownership before deleting. Bulk permanent delete supported — see **transaction_edit.md § 5.4**.

### Restore

Clears `deleted_at`. After restore, the sum invariant is re-evaluated and a reconciliation warning is shown if the restored split causes a mismatch.

---

## 3. Accounts & Balances

### Balance updates

`accounts.balance` is a running total maintained by the service on every transaction create, update, or delete — never recalculated from scratch on read. All balance updates run in the same DB transaction as the triggering write.

| Event | `income` | `expense / investment / saving` |
| --- | --- | --- |
| Transaction created | `balance + amount` | `balance − amount` |
| Amount updated | `balance − old + new` | `balance + old − new` |
| Transaction deleted | `balance − amount` | `balance + amount` |

Additional rules:

- Balance may go negative — no floor enforced
- Only `confirmed` transactions affect balance
- When `accountId` is updated, old account is reversed and new account is updated atomically
- Balance is always stored in the account's native `currency` — no conversion applied

### Account management

- Each user has exactly one account, created during onboarding
- `accounts.currency` cannot be changed once any transactions have been recorded — reject `VALIDATION_ERROR`; if no transactions exist, currency may be updated freely
- A second account cannot be created — `POST /accounts` rejects `VALIDATION_ERROR` if a row already exists for `req.user.id`
- Accounts cannot be deleted via the user-facing API

---

## 4. Categories

- Categories are global (not per-user) — seeded by `npm run seed`, not user-created
- A category's `type` must match the transaction `type` it is used with
- Categories cannot be deleted if any `transaction_splits` or `budgets` reference them
- `category_keywords` are used exclusively by the AI service — not exposed in the public API

---

## 5. Receipts & AI Pipeline

- A receipt is created at upload time with `ocr_status: pending` and `transaction_id: null`
- A receipt is linked to a transaction only after the user confirms the AI draft
- Only one receipt may be linked to a transaction — a second link attempt returns `VALIDATION_ERROR`
- A receipt with `ocr_status: processing` cannot be re-scanned — return `VALIDATION_ERROR`
- If the AI returns `AI_NOT_A_RECEIPT` or `AI_IMAGE_TOO_BLURRY`, the receipt is retained with `ocr_status: pending` so the user can retry
- `ai_corrections` records are created for every field the user edits after an AI draft is returned — including edits that restore the AI's original value
- `ai_predictions` are created per `receipt_item` — if confidence is below **0.70**, `predicted_category_id` is set to `null` and the user must select a category manually before confirming
- Orphaned receipts (no `transaction_id` after 7 days) are permanently deleted by the weekly cleanup job

---

## 6. Budgets

### Period rules

- `startDate` must be before `endDate` — reject `VALIDATION_ERROR`
- Budget periods for the same user must not overlap — reject `VALIDATION_ERROR` if any date range intersection exists
- A budget period cannot be deleted if it has any `budgets` rows — delete allocations first
- When `user_settings.cycle_start_day` changes, the active period's `start_date` and `end_date` are recalculated immediately — historical periods are not modified

### Budget allocation rules

- At most one budget per `categoryId` per `budget_period` per user — reject duplicates with `VALIDATION_ERROR`
- `amount` must be > 0 — reject `VALIDATION_ERROR`
- Budget `currency` must match `user_settings.targetCurrency`
- Only `expense` categories may have a budget allocation — income, investment, and saving are not budgeted
- Budget consumption = sum of all `confirmed`, active (non-soft-deleted) `transaction_splits` in the active period whose `category_id` matches the budget's `categoryId`
- Overspending is allowed — surfaced as a notification and dashboard warning, not a rejection

---

## 7. Merchants

- Merchant records are global (not user-scoped) — shared across all users
- When a transaction is confirmed with a `merchantId`, the service validates the `merchants` row exists
- If no merchant match is found during AI extraction, a new `merchants` row is created at confirmation time
- OCR variant spellings (e.g. `"FAMILYMART"`, `"Family Mart"`, `"ファミリーマート"`) are stored in `merchant_aliases` and resolved to the canonical `merchants` row on next match
- `merchants.default_category_id` is used as a fallback category suggestion when the AI has low confidence across all items for that merchant

---

## 8. Currency & Exchange Rates

- Each account's `currency` is set at creation — cannot change once any transactions are recorded; may be changed freely before the first transaction
- Each transaction stores the `currency` it was entered in — may differ from the account currency
- Dashboard and budget consumption always convert amounts to `user_settings.targetCurrency` using the latest `exchange_rates` row for each pair
- If no direct rate exists, the service attempts a cross-rate via a common intermediate (e.g. USD)
- If no rate can be found, the amount is returned unconverted with its original currency code and a visual indicator is shown in the UI
- Exchange rates are external data — read-only; never updated by the application itself

---

## 9. Users & Settings

- `user_settings` is created automatically on registration with defaults: `theme: light`, `system_language` from registration locale (fallback `en`), `time_zone` from device (fallback `UTC`); `targetCurrency` and `cycleStartDay` are `null` until onboarding completes
- The app redirects to the onboarding screen on every login until both `targetCurrency` and `cycleStartDay` are set
- `cycleStartDay` determines the boundaries of every `budget_periods` row — changing it recalculates the active period immediately; historical periods are not modified
- Changing `targetCurrency` affects all dashboard and budget displays immediately — no historical data is altered

---

## 10. Data Ownership & Scoping

These rules apply across every service without exception.

- Every DB query that fetches user data must include `WHERE user_id = $userId`
- A user may only read, update, or delete their own `transactions`, `accounts`, `receipts`, and `budgets`
- `categories`, `merchants`, `merchant_aliases`, `category_keywords`, and `exchange_rates` are global — readable by any authenticated user
- `sessions`, `password_reset_tokens`, and `verification_tokens` are scoped to their `user_id` and are **never** returned in API responses — internal to the auth layer only
- A service receiving a resource ID must always verify ownership before operating on it — a valid UUID does not imply the resource belongs to the current user
