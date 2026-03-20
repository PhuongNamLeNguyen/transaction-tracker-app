# Transaction Edit

> Covers all editing scenarios across two stages: pre-save draft editing (before a transaction is committed to the database) and post-save editing (after a confirmed transaction exists). Also covers split item deletion, soft-delete behaviour, and the Deleted Transactions management screen. For the creation flows that produce the initial draft see **transaction_create.md**. For split display and manual split management see **transaction_split.md**. For relevant table definitions see **database_schema.md § 3–5**.

---

## Table of Contents

- [Transaction Edit](#transaction-edit)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Time 1 — Pre-Save Draft Editing](#2-time-1--pre-save-draft-editing)
    - [2.1 When This Applies](#21-when-this-applies)
    - [2.2 Editable Fields](#22-editable-fields)
    - [2.3 ai\_corrections Write](#23-ai_corrections-write)
    - [2.4 Validation Rules](#24-validation-rules)
    - [2.5 Database Writes on Confirm](#25-database-writes-on-confirm)
  - [3. Time 2 — Post-Save Editing](#3-time-2--post-save-editing)
    - [3.1 When This Applies](#31-when-this-applies)
    - [3.2 Editable Fields](#32-editable-fields)
    - [3.3 Image Edit Restriction](#33-image-edit-restriction)
    - [3.4 Validation Rules](#34-validation-rules)
    - [3.5 Database Writes on Save](#35-database-writes-on-save)
  - [4. Split Item Deletion](#4-split-item-deletion)
    - [4.1 Swipe-to-Delete Gesture](#41-swipe-to-delete-gesture)
    - [4.2 Soft-Delete Behaviour](#42-soft-delete-behaviour)
    - [4.3 Split Amount Reconciliation](#43-split-amount-reconciliation)
  - [5. Deleted Transactions Screen](#5-deleted-transactions-screen)
    - [5.1 Accessing the Screen](#51-accessing-the-screen)
    - [5.2 Single-Item Actions](#52-single-item-actions)
    - [5.3 Bulk Actions](#53-bulk-actions)
    - [5.4 Permanent Delete](#54-permanent-delete)
    - [5.5 Restore](#55-restore)

---

## 1. Overview

Editing can occur at two distinct stages in a transaction's lifecycle:

```text
[Time 1]  AI draft generated (transactions.status = 'ready')
               ↓
          User reviews draft → edits fields → ai_corrections written
               ↓
          User confirms → transactions(status = confirmed) + transaction_splits written
               ↓
[Time 2]  Transaction confirmed (transactions.status = 'confirmed')
               ↓
          User opens transaction detail → edits amount / category / note
               ↓
          PATCH /transactions/:id → DB updated
               ↓
          User swipes left on a split item → soft-deleted
               ↓
          Soft-deleted items visible in Settings → Deleted Transactions
               ↓
          User permanently deletes or restores from Deleted Transactions screen
```

| | Time 1 — Pre-save | Time 2 — Post-save |
| --- | --- | --- |
| `transactions.status` | `ready` | `confirmed` |
| Entry point | Draft review screen (AI scan flow) | Transaction detail screen |
| Applies to | Receipt scan source only | All sources (manual + receipt scan) |
| Image editable | N/A | Not editable |
| Corrections logged | `ai_corrections` | Not logged (direct update) |

---

## 2. Time 1 — Pre-Save Draft Editing

### 2.1 When This Applies

Time 1 editing only applies to the **photo upload and camera scan** entry methods, where the AI produces a draft before anything is confirmed. It is triggered by tapping **Edit** on the draft review screen (see **transaction_create.md § 6.6**).

Manual entry transactions are confirmed directly and do not have a draft editing stage.

### 2.2 Editable Fields

| Field | DB column updated | UI control | Notes |
| --- | --- | --- | --- |
| Total amount | `transactions.amount` | Numeric input | Changing the total does not auto-redistribute split amounts — the user adjusts item amounts manually |
| Date | `transactions.transaction_date` | Date-time picker | |
| Merchant | `transactions.merchant_id` | Free-text input | Resolved against `merchants` table on save; new row created if no match |
| Note | `transactions.note` | Free-text input | Optional |
| Per-item category | `ai_predictions.predicted_category_id` | Dropdown filtered by transaction type | Affects which split group the item lands in at confirm |
| Per-item amount | `receipt_items.price` | Numeric input | |

After editing, the user taps **Done** to return to the draft review screen. Multiple rounds of editing are allowed before confirming; each changed field produces its own `ai_corrections` row (see Section 2.3).

### 2.3 ai_corrections Write

Every field the user modifies during Time 1 editing is recorded as an audit entry, used to improve AI accuracy over time (see **ai_receipt_pipeline.md**).

```text
For each edited field:
INSERT INTO ai_corrections
  → receipt_id           = receipts.id
  → field_name           = <name of the changed field, e.g. "category_id", "amount">
  → ai_value             = <original value returned by AI>
  → corrected_value      = <user's new value>
  → corrected_by_user_id = req.user.id
  → created_at           = now()
```

A separate row is inserted per distinct field changed. If the user edits the same field across multiple edit sessions before confirming, each change produces its own row.

### 2.4 Validation Rules

| Field | Rule | Error |
| --- | --- | --- |
| Total amount | Must be a positive number | `Amount must be greater than 0` |
| Date | Must be a valid datetime | `Please enter a valid date and time` |
| Per-item amount | Each item amount must be positive | `Item amount must be greater than 0` |
| Split total | Sum of all item amounts must equal total amount | `Item amounts do not add up to the total amount` |

### 2.5 Database Writes on Confirm

When the user taps **Confirm & Save** on the draft review screen:

```text
PATCH /transactions/:id/confirm
Content-Type: application/json

{ splits: [ { categoryId, amount }, ... ] }
```

```text
1. UPDATE transactions
   → amount, transaction_date, merchant_id, note
   → status = 'confirmed', updated_at = now()

2. For each category group in the final item list:
   INSERT INTO transaction_splits
   → transaction_id, category_id, amount, created_at, updated_at

3. 200 OK — { success: true, data: { transactionId } }
```

`transactions.status` moves from `'ready'` → `'confirmed'` only at this step. The frontend navigates to the transaction detail screen on success.

For how items are grouped into splits by category, see **transaction_split.md § 3**.

---

## 3. Time 2 — Post-Save Editing

### 3.1 When This Applies

Time 2 editing applies to **all confirmed transactions**, regardless of creation method. It is accessed from the **transaction detail screen** by tapping the edit button on a transaction header or an individual split row.

### 3.2 Editable Fields

**Transaction-level fields** (accessed via **Edit** on the transaction header):

| Field | DB column | UI control | Notes |
| --- | --- | --- | --- |
| Amount | `transactions.amount` | Numeric input | Does not auto-adjust split amounts — update splits individually |
| Date & Time | `transactions.transaction_date` | Date-time picker | |
| Note | `transactions.note` | Free-text input | Optional |
| Account | `transactions.account_id` | Dropdown | All accounts belonging to the user |

**Split-level fields** (accessed by tapping a split row):

| Field | DB column | UI control | Notes |
| --- | --- | --- | --- |
| Category | `transaction_splits.category_id` | Dropdown filtered by transaction type | |
| Amount | `transaction_splits.amount` | Numeric input | Sum of all splits must equal `transactions.amount` |

### 3.3 Image Edit Restriction

Receipt images **cannot be edited or replaced** after the transaction is confirmed. `receipts.image_url` is read-only once `receipts.ocr_status = 'done'`. If the image is incorrect, the user must delete the transaction and create a new one.

### 3.4 Validation Rules

| Field | Rule | Error |
| --- | --- | --- |
| Amount | Must be a positive number | `Amount must be greater than 0` |
| Date & Time | Must be a valid datetime | `Please enter a valid date and time` |
| Account | Must be selected | `Please select an account` |
| Category (split) | Must be selected | `Please select a category` |
| Split amount | Must be a positive number | `Split amount must be greater than 0` |
| Split total | Sum of all split amounts must equal `transactions.amount` | `Split amounts do not add up to the transaction total` |

### 3.5 Database Writes on Save

**Transaction-level edit:**

```text
PATCH /transactions/:id
Content-Type: application/json
{ amount, transactionDate, note, accountId }
```

```text
UPDATE transactions
  SET amount, transaction_date, note, account_id (changed fields only)
      updated_at = now()

200 OK — { success: true }
```

**Split-level edit:**

```text
PATCH /transactions/:id/splits/:splitId
Content-Type: application/json
{ categoryId, amount }
```

```text
UPDATE transaction_splits
  SET category_id, amount (changed fields only)
      updated_at = now()

200 OK — { success: true }
```

Both endpoints re-validate that the sum of all `transaction_splits.amount` values equals `transactions.amount` before committing.

---

## 4. Split Item Deletion

### 4.1 Swipe-to-Delete Gesture

Split items in the transaction detail screen support a swipe-left gesture to delete.

```text
┌──────────────────────────────────────────┐
│  Food & Dining          ¥540             │  ← resting state
└──────────────────────────────────────────┘

     swipe left ──────────────────►

┌────────────────────────────────┬─────────┐
│  Food & Dining          ¥540   │ Delete  │  ← < 50% swiped: action revealed
└────────────────────────────────┴─────────┘

     swipe past 50% threshold ──►

        [ item removed from list ]          ← ≥ 50% swiped: item soft-deleted
```

- **< 50% swipe:** a red **Delete** button is revealed; tap to confirm, or swipe back to cancel.
- **≥ 50% swipe on release:** item is deleted immediately.
- An undo toast ("Item deleted · Undo") may appear; tapping **Undo** within the timeout reverses the soft-delete without a server call.

### 4.2 Soft-Delete Behaviour

Split items are **soft-deleted**, not permanently removed.

```text
DELETE /transactions/:id/splits/:splitId
```

```text
Verify transaction belongs to req.user.id
     ↓
UPDATE transaction_splits SET deleted_at = now()
     ↓
200 OK — { success: true }
```

> **Note:** The `transaction_splits` table requires a `deleted_at` timestamp column. Rows where `deleted_at IS NOT NULL` are excluded from all normal queries (detail view, dashboard aggregations, budget calculations).

Soft-deleted splits are surfaced in **Settings → Deleted Transactions** (see Section 5).

### 4.3 Split Amount Reconciliation

When a split is deleted, remaining splits may no longer sum to `transactions.amount`. The backend does **not** auto-redistribute the deleted amount.

The detail screen displays a reconciliation warning in this case:

```text
⚠  Split amounts (¥700) do not match the transaction total (¥1,240).
   Tap a split to adjust the amounts.
```

The transaction remains valid and confirmed in the interim — the warning is informational only and does not block usage.

---

## 5. Deleted Transactions Screen

### 5.1 Accessing the Screen

```text
Settings → Deleted Transactions
```

Lists all `transaction_splits` rows where `deleted_at IS NOT NULL` for the current user, ordered by `deleted_at DESC`. Each row displays: transaction date, category name and icon, split amount and currency, and date deleted.

### 5.2 Single-Item Actions

**Swipe left — Permanent delete:**

```text
┌───────────────────────────────┬───────────────────┐
│  Food & Dining  ¥540  Mar 16  │ Delete Permanently│
└───────────────────────────────┴───────────────────┘
```

Tapping (or swiping past 50%) triggers a confirmation dialog:

```text
"Permanently delete this item? This cannot be undone."
[ Cancel ]   [ Delete Permanently ]
```

On confirmation, the row is hard-deleted (see Section 5.4).

**Swipe right — Restore:**

```text
┌──────────┬───────────────────────────────┐
│ Restore  │  Food & Dining  ¥540  Mar 16  │
└──────────┴───────────────────────────────┘
```

Tapping (or swiping past 50% right) immediately restores the split. No confirmation dialog is shown for restore.

### 5.3 Bulk Actions

Tap **Select** (top-right) to enter multi-select mode:

- Tap a row to toggle its selection checkbox
- **Select All** selects all visible items
- Two action buttons appear at the bottom:

```text
[ Delete Permanently (N) ]     [ Restore (N) ]
```

- **Delete Permanently (N)** — shows a confirmation dialog before hard-deleting all selected rows
- **Restore (N)** — immediately restores all selected rows, no confirmation required

### 5.4 Permanent Delete

Hard-deleting removes the row from the database entirely and cannot be undone.

**Single:**

```text
DELETE /transactions/:transactionId/splits/:splitId/permanent
```

```text
Verify split belongs to req.user.id AND deleted_at IS NOT NULL
     ↓
DELETE FROM transaction_splits WHERE id = splitId
     ↓
200 OK — { success: true }
```

**Bulk:**

```text
DELETE /transactions/splits/permanent
Content-Type: application/json
{ splitIds: ["uuid-1", "uuid-2", ...] }
```

```text
Verify all splitIds belong to req.user.id AND deleted_at IS NOT NULL
     ↓
DELETE FROM transaction_splits WHERE id = ANY(splitIds)
     ↓
200 OK — { success: true, deleted: N }
```

### 5.5 Restore

Restoring clears `deleted_at`, making the split visible again in the transaction detail screen.

**Single:**

```text
PATCH /transactions/:transactionId/splits/:splitId/restore
```

```text
Verify split belongs to req.user.id AND deleted_at IS NOT NULL
     ↓
UPDATE transaction_splits SET deleted_at = NULL, updated_at = now()
     ↓
200 OK — { success: true }
```

**Bulk:**

```text
PATCH /transactions/splits/restore
Content-Type: application/json
{ splitIds: ["uuid-1", "uuid-2", ...] }
```

```text
Verify all splitIds belong to req.user.id
     ↓
UPDATE transaction_splits SET deleted_at = NULL, updated_at = now()
  WHERE id = ANY(splitIds)
     ↓
200 OK — { success: true, restored: N }
```

After a restore, the reconciliation check (Section 4.3) is re-evaluated on the detail screen.
