# Budget Management

> Covers the first-login budget setup wizard and ongoing budget editing. Budget data is stored across `user_settings`, `budget_periods`, `budgets`, and `categories` (see **database_schema.md § 2, 4, 6**). Categories are global and seeded — users select from the existing list, they do not create new ones (see **business_rules.md § 4**). Budget alerts feed into the notification system — see **notification.md § 4** for delivery specs. For dashboard display of budget progress see **dashboard.md § 5**.

---

## Table of Contents

- [Budget Management](#budget-management)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. First-Login Setup Wizard](#2-first-login-setup-wizard)
    - [Trigger Condition](#trigger-condition)
    - [Step 1 — Account Settings](#step-1--account-settings)
    - [Step 2 — Budget Entry](#step-2--budget-entry)
    - [Step 3 — Review \& Confirm](#step-3--review--confirm)
  - [3. Database Writes on Submit](#3-database-writes-on-submit)
  - [4. Editing Budgets After Setup](#4-editing-budgets-after-setup)
  - [5. Budget Alerts](#5-budget-alerts)

---

## 1. Overview

The first time a verified user logs in, the app detects that no `budget_periods` record exists for their account and launches a **three-step setup wizard** before they reach the main dashboard. The wizard collects:

1. Account preferences (`cycle_start_day`, `target_currency`) saved to `user_settings`
2. Per-category budget allocations saved to `budget_periods` + `budgets`

Once setup is complete, the wizard does not appear again. Users can revisit and update their budget at any time via **Settings → Edit Budget**.

---

## 2. First-Login Setup Wizard

### Trigger Condition

```text
User logs in → Backend checks: does a budget_periods row exist for user_id?
     ↓
No  → Redirect to /onboarding/budget-setup
Yes → Proceed to dashboard as normal
```

### Step 1 — Account Settings

| Field | DB Column | Description |
| --- | --- | --- |
| Cycle start date | `user_settings.cycle_start_day` | Day of the month the budget cycle resets (1–28; typically aligns with payday) |
| Display currency | `user_settings.target_currency` | Currency all budget amounts and dashboard totals are displayed in |

Values are held in frontend wizard state until final submission in Step 3.

### Step 2 — Budget Entry

Presents the global `categories` list (seeded via `npm run seed`) filtered to `type = 'expense'`. Users cannot create new categories — only include or exclude existing ones.

**Default pre-selected categories (~10 items):**

| # | Category |
| --- | --- |
| 1 | Food & Dining |
| 2 | Transportation |
| 3 | Housing & Utilities |
| 4 | Health & Medical |
| 5 | Shopping |
| 6 | Entertainment |
| 7 | Education |
| 8 | Personal Care |
| 9 | Travel |
| 10 | Miscellaneous |

Additional seeded expense categories are available via **Add category** (lists all not yet included).

**User interactions:**

- **Enter amount** — budget value next to each category, in `target_currency`
- **Add category** — opens picker; selecting a category adds a row with an empty amount field
- **Remove item** — removes the category from this budget; global `categories` table is unchanged

**Summary bar (live):**

```text
Total categories: 10     Total estimated budget: ¥120,000
```

**Validation:**

- At least one budget item must be present
- Each amount must be a positive number
- All included categories must have an amount (no blanks)

### Step 3 — Review & Confirm

Read-only summary of all entries before committing to the database.

```text
─────────────────────────────────────────
  Account Settings
─────────────────────────────────────────
  Cycle start date     : 1st of each month
  Display currency     : JPY (¥)

─────────────────────────────────────────
  Budget Allocations
─────────────────────────────────────────
  Food & Dining        : ¥30,000
  Transportation       : ¥15,000
  Housing & Utilities  : ¥40,000
  Health & Medical     : ¥5,000
  Shopping             : ¥10,000
  Entertainment        : ¥8,000
  Education            : ¥5,000
  Personal Care        : ¥3,000
  Travel               : ¥2,000
  Miscellaneous        : ¥2,000
─────────────────────────────────────────
  Total categories     : 10
  Total budget         : ¥120,000
─────────────────────────────────────────
```

**Back** returns to the previous step. **Confirm & Save** triggers the database write.

---

## 3. Database Writes on Submit

```text
POST /onboarding/budget-setup
```

**Request body:**

```json
{
  "cycleStartDay": 1,
  "targetCurrency": "JPY",
  "budgets": [
    { "categoryId": "uuid-food",      "amount": 30000 },
    { "categoryId": "uuid-transport", "amount": 15000 },
    { "categoryId": "uuid-housing",   "amount": 40000 },
    { "categoryId": "uuid-health",    "amount": 5000  },
    { "categoryId": "uuid-shopping",  "amount": 10000 },
    { "categoryId": "uuid-entertain", "amount": 8000  },
    { "categoryId": "uuid-education", "amount": 5000  },
    { "categoryId": "uuid-personal",  "amount": 3000  },
    { "categoryId": "uuid-travel",    "amount": 2000  },
    { "categoryId": "uuid-misc",      "amount": 2000  }
  ]
}
```

`categoryId` must reference an existing row in `categories`. `categoryName` is not accepted.

**Backend write sequence:**

```text
1. Validate all budget entries
   → each categoryId must exist in categories
   → each amount must be > 0
   → no duplicate categoryId in the request
     ↓
2. UPDATE user_settings
   → cycle_start_day = cycleStartDay
   → target_currency = targetCurrency
   → updated_at = now()
     ↓
3. INSERT INTO budget_periods
   → user_id    = req.user.id
   → start_date = most recent occurrence of cycleStartDay on or before today
   → end_date   = start_date + 1 month − 1 day
   → created_at = now()
     ↓
4. For each entry in budgets:
   INSERT INTO budgets
   → period_id, category_id, amount, currency = targetCurrency, created_at
     ↓
5. 201 Created — { success: true }
```

The frontend redirects to the main dashboard on success.

---

## 4. Editing Budgets After Setup

Accessible via **Settings → Edit Budget**. The edit screen is identical to Steps 1–3 of the wizard, pre-populated with current values. The same rule applies: only existing seeded categories may be added.

```text
PATCH /settings/budget
```

**Request body:** same shape as the onboarding request — full list of `{ categoryId, amount }` representing the desired final state.

**On submit:**

```text
1. Validate all budget entries (same rules as creation)
     ↓
2. UPDATE user_settings (cycle_start_day, target_currency) if changed
     ↓
3. For the current active budget_period:
   → Upsert each categoryId (UPDATE if exists, INSERT if new)
   → DELETE budgets rows for any categoryId not in the request
     ↓
4. If cycle_start_day changed:
   → Recalculate start_date / end_date on the active budget_periods row
     (see settings.md § 4.5 for the recalculation formula)
   → Historical budget_periods rows are not modified
     ↓
5. 200 OK — { success: true }
```

---

## 5. Budget Alerts

Budget alerts are evaluated after every confirmed transaction write. The backend checks the utilisation of each affected category against its allocated budget for the active period.

**Alert thresholds:**

| Threshold | Condition | Alert type |
| --- | --- | --- |
| 80% | `SUM(split amounts for category in period) / budgets.amount >= 0.80 AND < 1.00` | Warning |
| 100% | `SUM(split amounts for category in period) / budgets.amount >= 1.00` | Over budget |

**Alert logic:**

```text
New transaction confirmed
     ↓
For each transaction_splits row on the new transaction:
  Look up budgets WHERE category_id = split.category_id
                    AND period_id   = active budget_periods.id
     ↓
  If no budgets row → skip (unbudgeted category)
     ↓
  SUM all confirmed expense transaction_splits amounts
    WHERE category_id      = split.category_id
      AND transaction_date BETWEEN period.start_date AND period.end_date
      AND status            = 'confirmed'
      AND split.deleted_at  IS NULL
     ↓
  utilisation = SUM / budgets.amount
     ↓
  >= 0.80 AND < 1.00 → fire warning notification  (once per threshold crossing per period)
  >= 1.00            → fire over-budget notification (once per threshold crossing per period)
```

Each threshold fires **at most once per category per budget period** — subsequent transactions that remain in the same utilisation band do not re-fire the alert. Alerts are scoped to the active `budget_periods` window; spending from previous periods does not carry over.

For notification delivery (toast + bell content, message templates), see **notification.md § 4**.
