# Dashboard

> Covers all four dashboard sections: monthly summary totals, category breakdown charts, budget progress bars, and the daily transaction log. All figures are scoped to the active budget period defined by `budget_periods.start_date` / `end_date` and displayed in `user_settings.target_currency`. For budget period setup and alert thresholds see **budget_management.md**. For currency conversion logic see **multi_currency.md**. For account balance maintenance see **settings.md § 5**. For relevant table definitions see **database_schema.md § 3–6**.

---

## Table of Contents

- [Dashboard](#dashboard)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Data Scope \& Period Filtering](#2-data-scope--period-filtering)
  - [3. Widget 1 — Monthly Summary](#3-widget-1--monthly-summary)
    - [3.1 Display](#31-display)
    - [3.2 Data Query](#32-data-query)
  - [4. Widget 2 — Category Breakdown](#4-widget-2--category-breakdown)
    - [4.1 Display](#41-display)
    - [4.2 Per-Type Pie Chart](#42-per-type-pie-chart)
    - [4.3 Data Query](#43-data-query)
  - [5. Widget 3 — Budget Progress](#5-widget-3--budget-progress)
    - [5.1 Display](#51-display)
    - [5.2 Bar States](#52-bar-states)
    - [5.3 Data Query](#53-data-query)
  - [6. Widget 4 — Daily Transaction Log](#6-widget-4--daily-transaction-log)
    - [6.1 Display](#61-display)
    - [6.2 Filters](#62-filters)
    - [6.3 Data Query](#63-data-query)
  - [7. Dashboard API Endpoint](#7-dashboard-api-endpoint)

---

## 1. Overview

The dashboard is the home screen of the application. It is composed of four vertically stacked widgets, each presenting a progressively more granular view of the user's financial data for the current budget cycle.

```text
┌──────────────────────────────────────┐
│  Widget 1 — Monthly Summary          │  ← Total income / expense / investment / saving
│                                      │     Current account balance
├──────────────────────────────────────┤
│  Widget 2 — Category Breakdown       │  ← Pie chart per transaction type
│                                      │     Amount + percentage per category
├──────────────────────────────────────┤
│  Widget 3 — Budget Progress          │  ← Horizontal bar per expense category
│                                      │     Actual vs budget, over-budget highlight
├──────────────────────────────────────┤
│  Widget 4 — Daily Transaction Log    │  ← Transactions grouped by day
│                                      │     Filterable by type, category, date range
└──────────────────────────────────────┘
```

All four widgets read from confirmed transactions (`transactions.status = 'confirmed'`) only. Drafts (`status = 'ready'`) and soft-deleted records (`deleted_at IS NOT NULL`) are excluded from all calculations.

All monetary values are converted to `user_settings.target_currency` at display time — see **multi_currency.md** for conversion logic and fallback behaviour.

---

## 2. Data Scope & Period Filtering

All dashboard widgets are scoped to the **active budget period** unless the user applies a custom date filter (Widget 4 only).

```sql
-- Active period lookup
SELECT start_date, end_date FROM budget_periods
WHERE user_id = req.user.id
  AND start_date <= CURRENT_DATE
  AND end_date   >= CURRENT_DATE;

-- Period filter applied to transactions
WHERE transactions.user_id        = req.user.id
  AND transactions.status          = 'confirmed'
  AND transactions.transaction_date BETWEEN bp.start_date AND bp.end_date
```

---

## 3. Widget 1 — Monthly Summary

### 3.1 Display

```text
─────────────────────────────────────────
  March 2026  (Mar 1 – Mar 31)
─────────────────────────────────────────
  Income        ¥320,000
  Expenses      ¥148,200
  Investments    ¥50,000
  Savings        ¥80,000
─────────────────────────────────────────
  Balance       ¥254,600
─────────────────────────────────────────
```

- **Period label** — derived from `budget_periods.start_date` / `end_date`, formatted per `user_settings.system_language`
- **Income / Expenses / Investments / Savings** — sum of all confirmed transaction amounts for the period, grouped by `transactions.type`
- **Balance** — `accounts.balance` (the stored running total from **settings.md § 5.4**); reflects the user's net position across all time, not just the current period

### 3.2 Data Query

```sql
-- Type totals for the current period
SELECT t.type, SUM(t.amount) AS total
FROM transactions t
JOIN budget_periods bp
  ON bp.user_id = t.user_id
  AND t.transaction_date BETWEEN bp.start_date AND bp.end_date
  AND bp.start_date <= CURRENT_DATE
  AND bp.end_date   >= CURRENT_DATE
WHERE t.user_id = :userId
  AND t.status  = 'confirmed'
GROUP BY t.type;

-- Account balance (read directly)
SELECT balance, currency FROM accounts WHERE user_id = :userId;
```

---

## 4. Widget 2 — Category Breakdown

### 4.1 Display

One pie chart per transaction type. The user switches between types via a segmented control:

```text
  [ Income ]  [ Expenses ]  [ Investments ]  [ Savings ]
```

### 4.2 Per-Type Pie Chart

```text
─────────────────────────────────────────
  Expenses — March 2026
─────────────────────────────────────────
       [  Pie chart  ]

  ● Food & Dining        ¥42,000   28.3%
  ● Transportation       ¥18,500   12.5%
  ● Housing & Utilities  ¥40,000   27.0%
  ● Healthcare            ¥5,200    3.5%
  ● Shopping             ¥15,000   10.1%
  ● Entertainment         ¥8,000    5.4%
  ● Education             ¥5,500    3.7%
  ● Personal Care         ¥3,200    2.2%
  ● Sports                ¥2,800    1.9%
  ● Other                 ¥8,000    5.4%
─────────────────────────────────────────
  Total                 ¥148,200  100%
─────────────────────────────────────────
```

- Categories with zero spend in the current period are hidden
- Tapping a category row navigates to the filtered transaction log (Widget 4) scoped to that category

### 4.3 Data Query

```sql
SELECT
  c.id           AS category_id,
  c.name         AS category_name,
  c.icon         AS category_icon,
  SUM(ts.amount) AS total,
  ROUND(SUM(ts.amount) * 100.0 / SUM(SUM(ts.amount)) OVER (), 1) AS percentage
FROM transaction_splits ts
JOIN transactions t  ON ts.transaction_id = t.id
JOIN categories c    ON ts.category_id    = c.id
JOIN budget_periods bp
  ON bp.user_id = t.user_id
  AND t.transaction_date BETWEEN bp.start_date AND bp.end_date
  AND bp.start_date <= CURRENT_DATE
  AND bp.end_date   >= CURRENT_DATE
WHERE t.user_id     = :userId
  AND t.type        = :type    -- 'income' | 'expense' | 'investment' | 'saving'
  AND t.status      = 'confirmed'
  AND ts.deleted_at IS NULL
GROUP BY c.id, c.name, c.icon
ORDER BY total DESC;
```

---

## 5. Widget 3 — Budget Progress

### 5.1 Display

Scoped exclusively to `type = 'expense'`. One horizontal bar per expense category that has a budget allocation for the current period.

```text
─────────────────────────────────────────
  Budget Progress — March 2026
─────────────────────────────────────────

  🍔 Food & Dining
  [████████████████░░░░]  80%       ¥42,000 / ¥52,500

  🚌 Transportation
  [████████████░░░░░░░░]  62%       ¥18,500 / ¥30,000

  🏠 Housing & Utilities
  [████████████████████]  100%      ¥40,000 / ¥40,000

  🛒 Shopping
  [████████████████████████▌]  110% ¥16,500 / ¥15,000
                               ↑ excess shown in red beyond boundary

  📚 Education
  [████░░░░░░░░░░░░░░░░]  27%        ¥5,500 / ¥20,000
─────────────────────────────────────────
```

Categories with a budget but zero spend show an empty bar at 0%. Categories with spend but no budget allocation appear in a separate **Unbudgeted** section below the main list.

### 5.2 Bar States

Alert thresholds align with **budget_management.md § 5**.

| Utilisation | Bar rendering | Label colour |
| --- | --- | --- |
| 0% – 79% | Solid fill; remainder dashed | Normal |
| 80% – 99% | Solid amber fill; remainder dashed | Amber — approaching limit |
| 100% | Fully filled | Normal |
| > 100% | Filled to 100% in base colour; excess segment extends beyond boundary in bold red | Red — over budget |

**Over-budget rendering:**

```text
[████████████████████|██▌  ]
 ← budget amount →  ↑ excess (bold, red)
                    boundary marker
```

The label shows the full actual amount in red (e.g. `¥16,500 / ¥15,000`).

### 5.3 Data Query

```sql
SELECT
  c.id                        AS category_id,
  c.name                      AS category_name,
  c.icon                      AS category_icon,
  b.amount                    AS budget_amount,
  b.currency                  AS budget_currency,
  COALESCE(SUM(ts.amount), 0) AS actual_amount,
  ROUND(COALESCE(SUM(ts.amount), 0) * 100.0 / NULLIF(b.amount, 0), 1) AS utilisation_pct
FROM budgets b
JOIN budget_periods bp
  ON b.period_id = bp.id
  AND bp.user_id = :userId
  AND bp.start_date <= CURRENT_DATE
  AND bp.end_date   >= CURRENT_DATE
JOIN categories c ON b.category_id = c.id
LEFT JOIN transaction_splits ts
  ON ts.category_id = c.id AND ts.deleted_at IS NULL
LEFT JOIN transactions t
  ON ts.transaction_id = t.id
  AND t.user_id  = :userId
  AND t.type     = 'expense'
  AND t.status   = 'confirmed'
  AND t.transaction_date BETWEEN bp.start_date AND bp.end_date
GROUP BY c.id, c.name, c.icon, b.amount, b.currency
ORDER BY utilisation_pct DESC NULLS LAST;
```

Results are ordered by utilisation descending so over-budget categories appear at the top.

---

## 6. Widget 4 — Daily Transaction Log

### 6.1 Display

All confirmed transactions for the active period, grouped by `transaction_date` with the most recent day at the top.

```text
─────────────────────────────────────────
  Transaction Log
  [ Filters ▼ ]
─────────────────────────────────────────

  Monday, Mar 16                  −¥5,200
  ┌─────────────────────────────────────┐
  │ 📦 Multiple items   Lawson  ¥1,620  │
  │ 🍔 Food & Dining    Lunch   ¥3,500  │
  │ 🚌 Transportation   Suica     ¥230  │
  └─────────────────────────────────────┘

  Sunday, Mar 15                 +¥320,000
  ┌─────────────────────────────────────┐
  │ 💰 Salary          Deposit ¥320,000 │
  └─────────────────────────────────────┘
─────────────────────────────────────────
```

Each transaction row shows: category icon (or "📦 Multiple items" for multi-split — see **transaction_split.md § 5.2**), category name, merchant name / note, and amount.

Tapping a transaction row navigates to the transaction detail screen (see **transaction_split.md § 5.3**).

**Day subtotal sign convention:** income contributes positively; expense, investment, and saving contribute negatively.

### 6.2 Filters

| Filter | Options | Default |
| --- | --- | --- |
| **Transaction type** | All / Income / Expenses / Investments / Savings | All |
| **Category** | All, or one or more specific categories | All |
| **Date range** | Current period / Last 3 months / Last 6 months / Last 12 months / Custom | Current period |
| **Source** | All / Manual / Receipt scan | All |

A date range outside the current budget period overrides the default period scope for Widget 4 only — the other three widgets are not affected.

Active filters appear as dismissible chips below the filter button:

```text
  [ Filters ▼ ]  [× Expenses]  [× Food & Dining]  [× Last 3 months]
```

### 6.3 Data Query

```sql
SELECT
  t.id, t.transaction_date, t.type, t.amount, t.currency, t.note, t.source,
  m.name                                              AS merchant_name,
  COUNT(ts.id)                                        AS split_count,
  CASE WHEN COUNT(ts.id) = 1 THEN MIN(c.name) END     AS category_name,
  CASE WHEN COUNT(ts.id) = 1 THEN MIN(c.icon) END     AS category_icon,
  r.image_url                                         AS receipt_image_url
FROM transactions t
LEFT JOIN merchants m          ON t.merchant_id      = m.id
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id AND ts.deleted_at IS NULL
LEFT JOIN categories c         ON ts.category_id     = c.id
LEFT JOIN receipts r           ON r.transaction_id   = t.id
JOIN budget_periods bp
  ON bp.user_id = t.user_id
  AND t.transaction_date BETWEEN bp.start_date AND bp.end_date
  AND bp.start_date <= CURRENT_DATE
  AND bp.end_date   >= CURRENT_DATE
WHERE t.user_id    = :userId
  AND t.status     = 'confirmed'
  AND t.deleted_at IS NULL
  AND (:type     IS NULL OR t.type   = :type)
  AND (:source   IS NULL OR t.source = :source)
  AND (:dateFrom IS NULL OR t.transaction_date >= :dateFrom)
  AND (:dateTo   IS NULL OR t.transaction_date <= :dateTo)
GROUP BY t.id, t.transaction_date, t.type, t.amount, t.currency,
         t.note, t.source, m.name, r.image_url
ORDER BY t.transaction_date DESC, t.created_at DESC;
```

Category filter (when active):

```sql
AND t.id IN (
  SELECT transaction_id FROM transaction_splits
  WHERE category_id = ANY(:categoryIds) AND deleted_at IS NULL
)
```

---

## 7. Dashboard API Endpoint

All dashboard data is fetched in a single request on app load.

```text
GET /dashboard
```

**Response shape:**

```json
{
  "period": { "startDate": "2026-03-01", "endDate": "2026-03-31", "label": "March 2026" },
  "summary": {
    "income": 320000, "expense": 148200, "investment": 50000, "saving": 80000,
    "balance": 254600, "currency": "JPY"
  },
  "categoryBreakdown": {
    "expense":     [{ "categoryId": "uuid", "name": "Food & Dining", "icon": "food", "total": 42000, "percentage": 28.3 }, "..."],
    "income":      ["..."],
    "investment":  ["..."],
    "saving":      ["..."]
  },
  "budgetProgress": [
    { "categoryId": "uuid", "name": "Food & Dining", "icon": "food",
      "budgetAmount": 52500, "actualAmount": 42000, "utilisationPct": 80.0, "currency": "JPY" },
    "..."
  ],
  "transactions": [
    { "transactionId": "uuid", "transactionDate": "2026-03-16", "type": "expense",
      "amount": 1620, "currency": "JPY", "merchantName": "Lawson", "note": null,
      "source": "receipt_scan", "splitCount": 2, "categoryName": null,
      "categoryIcon": null, "receiptImageUrl": "https://..." },
    "..."
  ]
}
```

Widget 4 supports independent pagination and filtering:

```text
GET /dashboard/transactions?type=expense&categoryId=uuid&dateFrom=2026-01-01&dateTo=2026-03-31&page=1&limit=20
```
