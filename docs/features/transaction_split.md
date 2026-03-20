# Transaction Split

> The authoritative reference for `transaction_splits`: the data model, split generation rules, interface display, and how users manually add splits. For the creation flows that produce splits see **transaction_create.md**. For pre-save (draft) editing and post-save split editing / deletion see **transaction_edit.md**. For how splits feed into the dashboard see **dashboard.md**. For relevant table definitions see **database_schema.md § 3–4**.

---

## Table of Contents

- [Transaction Split](#transaction-split)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Purpose of Transaction Splits](#2-purpose-of-transaction-splits)
  - [3. Split Generation Rules](#3-split-generation-rules)
    - [3.1 Manual Entry — Always One Split](#31-manual-entry--always-one-split)
    - [3.2 AI Scan — Single Category](#32-ai-scan--single-category)
    - [3.3 AI Scan — Multiple Categories](#33-ai-scan--multiple-categories)
  - [4. Data Model](#4-data-model)
  - [5. Interface Display](#5-interface-display)
    - [5.1 Single-Split Display](#51-single-split-display)
    - [5.2 Multi-Split Display](#52-multi-split-display)
    - [5.3 Split Detail List](#53-split-detail-list)
  - [6. Manually Adding Splits](#6-manually-adding-splits)
    - [6.1 When a User Splits a Transaction](#61-when-a-user-splits-a-transaction)
    - [6.2 Add Split Form](#62-add-split-form)
    - [6.3 Validation Rules](#63-validation-rules)
    - [6.4 Database Writes](#64-database-writes)
  - [7. Split Invariants](#7-split-invariants)

---

## 1. Overview

Every confirmed transaction has at least one `transaction_splits` row. A split binds a portion of the transaction's total amount to a single category. The number of splits depends on the entry method and how many distinct categories are identified.

```text
Transaction confirmed
     ↓
     ├── Manual entry         → always 1 split (full amount, user-selected category)
     ├── AI scan, 1 category  → 1 split (full amount, AI-identified category)
     └── AI scan, N categories → N splits (one per distinct category, amounts summing to total)
```

Splits are the **atomic unit of categorisation** in the system. All dashboard aggregations, budget comparisons, and category breakdowns are computed from `transaction_splits`, not from `transactions` directly.

---

## 2. Purpose of Transaction Splits

**Accurate dashboard and budget tracking.** A single real-world receipt can contain items from multiple spending categories (e.g. groceries and stationery in the same store). Splitting ensures each category's total reflects only the spending that genuinely belongs to it.

**User-initiated separation.** Users can manually split any confirmed transaction from the detail screen — for example, separating a shared dinner bill into a personal food portion and a reimbursable work expense.

**AI training signal.** Category corrections made during the draft review stage are written to `ai_corrections`. The split structure provides labelled training data used to improve future AI extraction accuracy (see **ai_receipt_pipeline.md**).

---

## 3. Split Generation Rules

### 3.1 Manual Entry — Always One Split

When a user creates a transaction via manual entry, they select one category for the entire transaction. The backend generates a single `transaction_splits` row covering the full amount.

```text
User selects:
  Amount   : ¥3,500
  Category : Food & Dining

Result:
  transaction_splits
  ┌─────────────────────────────────────────┐
  │ category_id : Food & Dining             │
  │ amount      : ¥3,500                    │
  └─────────────────────────────────────────┘
```

The user can later add more splits from the detail screen (see Section 6).

### 3.2 AI Scan — Single Category

When the AI reads a receipt and all items resolve to the **same category**, a single `transaction_splits` row is created.

```text
Receipt items:
  Onigiri ×2    → Food & Dining
  Coffee ×1     → Food & Dining
  Green tea ×1  → Food & Dining

→ 1 split: Food & Dining, ¥1,020 (full total)
```

### 3.3 AI Scan — Multiple Categories

When the AI identifies items belonging to **different categories**, items are grouped by `predicted_category_id`. One `transaction_splits` row is created per distinct category; its `amount` equals the sum of all item prices in that group.

```text
Receipt items (5 items, 2 categories):
  Onigiri ×2    ¥320  → Food & Beverages
  Coffee ×1     ¥220  → Food & Beverages
  Textbook ×1   ¥800  → Education
  Notebook ×1   ¥280  → Education

→ 2 splits:
  Food & Beverages : ¥540   (¥320 + ¥220)
  Education        : ¥1,080 (¥800 + ¥280)

  transactions.amount = ¥1,620
```

If the user corrects a category during Time 1 draft editing (see **transaction_edit.md § 2**), the grouping is recalculated before splits are written to the database.

---

## 4. Data Model

```text
transaction_splits
┌──────────────────┬──────────┬─────────────────────────────────────┐
│ Column           │ Type     │ Notes                               │
├──────────────────┼──────────┼─────────────────────────────────────┤
│ id               │ uuid     │ PK                                  │
│ transaction_id   │ uuid     │ FK → transactions                   │
│ category_id      │ uuid     │ FK → categories                     │
│ amount           │ numeric  │ Portion of the transaction total    │
│ created_at       │ timestamp│                                     │
│ updated_at       │ timestamp│                                     │
│ deleted_at       │ timestamp│ NULL = active; set = soft-deleted   │
└──────────────────┴──────────┴─────────────────────────────────────┘
```

Each split stores only `category_id` and `amount`. All other display fields (date, note, merchant, account, type) are read from the parent `transactions` row.

**Relationship:**

```text
transactions (1)
  ├── amount  ← must equal SUM(transaction_splits.amount WHERE deleted_at IS NULL)
  └── ...

     ↕  one-to-many

transaction_splits (N)
  ├── transaction_id  → FK to transactions.id
  ├── category_id     → FK to categories.id
  └── amount
```

---

## 5. Interface Display

### 5.1 Single-Split Display

When a transaction has exactly one active split, the transaction row shows the category of that split directly.

```text
┌──────────────────────────────────────────────────────┐
│  🍔 Food & Dining                                    │
│  Lunch with team                    ¥3,500           │
│  2026-03-16  ·  Main Wallet                          │
└──────────────────────────────────────────────────────┘
```

### 5.2 Multi-Split Display

When a transaction has **two or more** active splits, the category field is replaced with **"Multiple items"**. The total shown is still `transactions.amount`.

```text
┌──────────────────────────────────────────────────────┐
│  📦 Multiple items                                   │
│  Lawson                             ¥1,620           │
│  2026-03-16  ·  Main Wallet                          │
└──────────────────────────────────────────────────────┘
```

Tapping the row navigates to the split detail list (Section 5.3).

### 5.3 Split Detail List

Tapping a transaction row (single or multi-split) opens the split detail list.

```text
─────────────────────────────────────────
  Lawson                       [Expense]
  2026-03-16  ·  Main Wallet
  Total: ¥1,620
─────────────────────────────────────────
  Splits:
  ┌──────────────────────┬──────────────┐
  │ 🍔 Food & Beverages  │  ¥540        │
  ├──────────────────────┼──────────────┤
  │ 📚 Education         │  ¥1,080      │
  └──────────────────────┴──────────────┘
  + Add split
─────────────────────────────────────────
```

From this screen the user can:

- **Tap a split row** — edit the category or amount (see **transaction_edit.md § 3.2**)
- **Swipe left on a split row** — soft-delete it (see **transaction_edit.md § 4**)
- **Tap "+ Add split"** — manually add a new split (see Section 6 below)

---

## 6. Manually Adding Splits

### 6.1 When a User Splits a Transaction

Users can divide any confirmed transaction into additional splits at any time from the split detail list, regardless of the original entry method. This is useful when a single payment covers expenses from multiple categories that were not separated at creation time.

### 6.2 Add Split Form

Tapping **+ Add split** opens a form with two required fields:

| Field | DB column | UI control | Notes |
| --- | --- | --- | --- |
| Category | `transaction_splits.category_id` | Dropdown filtered by `transactions.type` | |
| Amount | `transaction_splits.amount` | Numeric input | Must be positive and ≤ remaining unallocated amount |

The form shows the **remaining unallocated amount** as a hint:

```text
Remaining: ¥780  (¥1,620 total − ¥840 already split)
```

### 6.3 Validation Rules

| Rule | Error message |
| --- | --- |
| Category must be selected | `Please select a category` |
| Amount must be a positive number | `Amount must be greater than 0` |
| Amount must not exceed remaining unallocated amount | `Amount exceeds the remaining unallocated balance of ¥[X]` |
| After adding, all split amounts must sum to `transactions.amount` | `Split amounts must add up to the transaction total of ¥[X]` |

The final invariant check is enforced backend-side on every write.

### 6.4 Database Writes

```text
POST /transactions/:id/splits
Content-Type: application/json
{ categoryId, amount }
```

```text
Verify transaction belongs to req.user.id
     ↓
Validate amount > 0
     ↓
Validate SUM(existing active splits) + amount = transactions.amount
     ↓
INSERT INTO transaction_splits
  → transaction_id, category_id, amount, created_at, updated_at
     ↓
201 Created — { success: true, data: { splitId } }
```

The split detail list refreshes on success and the new split appears as an additional row.

---

## 7. Split Invariants

The following rules are enforced on all confirmed transactions.

**Sum invariant.** The sum of all active (non-deleted) splits must equal `transactions.amount`:

```sql
SUM(transaction_splits.amount)
  WHERE transaction_id = :id
  AND   deleted_at IS NULL
= transactions.amount
```

Validated backend-side on every write that creates, updates, or deletes a split. Violations are rejected with `400 VALIDATION_ERROR`.

**Minimum one split.** A confirmed transaction must always have at least one active split. Attempting to delete the last remaining split returns `400 VALIDATION_ERROR`:

```text
"A transaction must have at least one split.
To remove this transaction entirely, delete the transaction itself."
```

**Category type alignment.** A split's `category_id` must reference a `categories` row whose `type` matches `transactions.type`. For example, a Food & Dining category (`type: expense`) cannot be assigned to a split on a `saving` transaction.

**Amount must be positive.** `transaction_splits.amount > 0` is enforced at the database level and re-validated in the backend before every write.
