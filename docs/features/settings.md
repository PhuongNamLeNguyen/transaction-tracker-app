# Settings

> Covers all user-configurable settings: personal preferences stored in `user_settings` and the single account stored in `accounts`. For the first-login onboarding wizard that first populates `cycle_start_day`, `target_currency`, and the account see **budget_management.md § 2**. For how the account balance and budget cycle feed into the dashboard see **dashboard.md**. For relevant table definitions see **database_schema.md § 2–3**.

---

## Table of Contents

- [Settings](#settings)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Settings Screen Layout](#2-settings-screen-layout)
  - [3. Preferences](#3-preferences)
    - [3.1 Display Theme](#31-display-theme)
    - [3.2 Display Currency](#32-display-currency)
    - [3.3 Budget Cycle Start Date](#33-budget-cycle-start-date)
    - [3.4 System Language](#34-system-language)
    - [3.5 Timezone](#35-timezone)
  - [4. Preferences — Initialisation \& Editing](#4-preferences--initialisation--editing)
    - [4.1 Initialisation](#41-initialisation)
    - [4.2 Editing Preferences](#42-editing-preferences)
    - [4.3 Validation Rules](#43-validation-rules)
    - [4.4 Database Writes](#44-database-writes)
    - [4.5 Downstream Effects](#45-downstream-effects)
  - [5. Account](#5-account)
    - [5.1 Overview](#51-overview)
    - [5.2 Account Creation — Onboarding](#52-account-creation--onboarding)
    - [5.3 Viewing the Account](#53-viewing-the-account)
    - [5.4 Balance Calculation](#54-balance-calculation)
    - [5.5 Editing the Account](#55-editing-the-account)

---

## 1. Overview

The Settings screen covers two distinct data domains:

**Preferences** (`user_settings` — one row per user): display theme, display currency, budget cycle start date, system language, and timezone. Changes are purely presentational and do not modify any financial data.

**Account** (`accounts` — one row per user): a single financial container with a display name and a running balance. Every transaction is linked to this account via `transactions.account_id`. It is not selected per transaction — it is fixed and transparent.

```text
user_settings (one row per user)
  ├── theme            → light / dark mode
  ├── target_currency  → display currency for all amounts
  ├── cycle_start_day  → budget period boundary
  ├── system_language  → UI locale
  └── time_zone        → date-time defaults and display

accounts (one row per user)
  ├── name             → display label
  ├── currency         → native currency of the balance
  └── balance          → running total updated on every confirmed transaction
```

---

## 2. Settings Screen Layout

```text
─────────────────────────────────────────
  Settings
─────────────────────────────────────────

  PREFERENCES
  ┌─────────────────────────────────────┐
  │ Display Theme          Light    ›   │
  │ Display Currency       JPY      ›   │
  │ Budget Cycle Start     1st      ›   │
  │ Language               English  ›   │
  │ Timezone               Asia/Tokyo › │
  └─────────────────────────────────────┘

  ACCOUNT
  ┌─────────────────────────────────────┐
  │ My Account             ¥254,600 ›   │
  │ Edit Budget                     ›   │
  └─────────────────────────────────────┘

  DATA
  ┌─────────────────────────────────────┐
  │ Deleted Transactions            ›   │
  └─────────────────────────────────────┘

  PROFILE
  ┌─────────────────────────────────────┐
  │ Change Password                 ›   │
  │ Log Out                             │
  └─────────────────────────────────────┘
```

---

## 3. Preferences

### 3.1 Display Theme

| DB column | `user_settings.theme` |
| --- | --- |
| Type | `text` — `light` or `dark` |
| Default | `light` |
| UI control | Segmented toggle: Light / Dark |

Takes effect immediately on toggle — no save action required.

### 3.2 Display Currency

| DB column | `user_settings.target_currency` |
| --- | --- |
| Type | `text` — ISO 4217 code (e.g. `JPY`, `USD`, `EUR`) |
| Default | Set during first-login onboarding |
| UI control | Searchable dropdown of supported currency codes |

Determines how all monetary totals are presented throughout the app. Amounts in a different currency are converted at display time using the latest rate from `exchange_rates` — see **multi_currency.md** for conversion logic. Changing the display currency does **not** modify any stored amounts.

### 3.3 Budget Cycle Start Date

| DB column | `user_settings.cycle_start_day` |
| --- | --- |
| Type | `text` — day-of-month integer stored as text (1–28) |
| Default | Set during first-login onboarding |
| UI control | Numeric picker: 1–28 |

Defines the day of the month on which a new budget period begins (e.g. `25` means each period runs from the 25th to the 24th of the following month). Capped at 28 to avoid ambiguity in shorter months.

Changing this value recalculates the active `budget_periods` row — see Section 4.5.

### 3.4 System Language

| DB column | `user_settings.system_language` |
| --- | --- |
| Type | `text` — IETF language tag (e.g. `en`, `ja`, `th`) |
| Default | Detected from device locale at registration; fallback `en` |
| UI control | Dropdown of supported languages |

Controls locale for all UI text, date formats, number formats, and currency symbol placement. Takes effect on the next screen navigation after saving. Missing translation keys fall back to English.

### 3.5 Timezone

| DB column | `user_settings.time_zone` |
| --- | --- |
| Type | `text` — IANA identifier (e.g. `Asia/Tokyo`, `America/New_York`) |
| Default | Detected from device timezone at registration |
| UI control | Searchable dropdown of IANA timezone identifiers |

Used for: default date/time values in the manual entry form, display of `transaction_date` timestamps, and the midnight boundary at which a new budget cycle begins.

---

## 4. Preferences — Initialisation & Editing

### 4.1 Initialisation

A `user_settings` row is created automatically on registration, before the onboarding wizard runs:

```text
INSERT INTO user_settings
  → user_id          = new users.id
  → theme            = 'light'
  → cycle_start_day  = null        ← set during onboarding
  → target_currency  = null        ← set during onboarding
  → system_language  = <device locale, fallback 'en'>
  → time_zone        = <device timezone, fallback 'UTC'>
  → created_at / updated_at = now()
```

`cycle_start_day` and `target_currency` remain null until the user completes the first-login onboarding wizard (see **budget_management.md § 2**). The app redirects to onboarding on every login until both are set.

### 4.2 Editing Preferences

Each preference is edited on its own screen reached by tapping its row in Settings.

- **Toggle / segmented controls** (e.g. theme): change is written to the database immediately on toggle — no save button.
- **Dropdown / picker controls** (e.g. currency, language, timezone, cycle start day): user selects a value and taps **Save**. **Cancel** or back-navigation discards the change.

### 4.3 Validation Rules

| Field | Rule | Error |
| --- | --- | --- |
| `target_currency` | Must be a valid ISO 4217 code from the supported list | `Please select a valid currency` |
| `cycle_start_day` | Must be an integer between 1 and 28 | `Please select a day between 1 and 28` |
| `system_language` | Must be a supported language tag | `Please select a supported language` |
| `time_zone` | Must be a valid IANA timezone identifier | `Please select a valid timezone` |

### 4.4 Database Writes

All preference updates share a single endpoint. Only fields present in the request body are updated.

```text
PATCH /settings
Content-Type: application/json

{ theme?, targetCurrency?, cycleStartDay?, systemLanguage?, timeZone? }
```

```text
1. Validate provided fields
     ↓
2. UPDATE user_settings
   → SET each provided field
   → updated_at = now()
   WHERE user_id = req.user.id
     ↓
3. 200 OK — { success: true }
```

### 4.5 Downstream Effects

| Setting changed | Immediate UI effect | Data effect |
| --- | --- | --- |
| `theme` | Re-renders in new theme | None — display only |
| `target_currency` | All converted amounts re-render in new currency | None — stored amounts unchanged |
| `cycle_start_day` | Dashboard budget progress re-scoped to new period window | `budget_periods` start/end recalculated; `budgets` rows preserved |
| `system_language` | UI locale changes on next screen navigation | None — display only |
| `time_zone` | Timestamps re-render; date picker defaults update | None — stored timestamps are UTC |

**`cycle_start_day` change — recalculation formula (canonical):**

```text
new start_date = most recent occurrence of cycleStartDay on or before today
new end_date   = start_date + 1 month − 1 day

UPDATE budget_periods
  SET start_date = new start_date,
      end_date   = new end_date,
      updated_at = now()
WHERE user_id    = req.user.id
  AND start_date <= now()
  AND end_date   >= now()
```

All `budgets` rows linked to the active period are preserved — only the period window changes. Historical `budget_periods` rows are not modified.

---

## 5. Account

### 5.1 Overview

Each user has exactly one account. It is a thin container with a display name, a currency, and a running balance. Every transaction is automatically linked to it via `transactions.account_id` — the user never selects an account anywhere in the app.

The account balance is a real-world net position figure (opening balance adjusted for all recorded transactions). It is not used in budget calculations or category analytics — those are derived from `transactions` and `transaction_splits`.

### 5.2 Account Creation — Onboarding

Created as the final step of the first-login onboarding wizard. Appears only once — the account cannot be deleted, only edited.

**Form fields:**

| Field | Required | DB column | UI control | Notes |
| --- | --- | --- | --- | --- |
| Account name | No | `accounts.name` | Text input | Defaults to `"My Account"` if blank |
| Currency | Yes | `accounts.currency` | Dropdown of supported currency codes | Defaults to `user_settings.target_currency` |
| Current balance | Yes | `accounts.balance` | Numeric input | Real-world net balance at setup; defaults to `0` |

**Validation:**

| Field | Rule | Error |
| --- | --- | --- |
| Account name | Max 50 characters | `Account name must be 50 characters or fewer` |
| Currency | Must be a valid supported code | `Please select a currency` |
| Current balance | Must be a valid number | `Please enter a valid balance` |

**Database write:**

```text
POST /accounts
Content-Type: application/json
{ name, currency, balance }
```

```text
1. Check no account exists for req.user.id → 400 if one already exists
     ↓
2. INSERT INTO accounts
   → user_id, name (or "My Account"), type = 'personal', currency, balance
   → created_at / updated_at = now()
     ↓
3. 201 Created — { success: true, data: { accountId } }
```

`accounts.type` is set to `'personal'` internally and is not exposed to the user.

### 5.3 Viewing the Account

Tapping the account row in Settings opens the account detail screen:

```text
─────────────────────────────────────────
  Account
─────────────────────────────────────────
  Name          : My Account
  Currency      : JPY
  Balance       : ¥254,600
─────────────────────────────────────────
  [ Edit ]
─────────────────────────────────────────
```

If `accounts.currency` differs from `user_settings.target_currency`, both the native balance and a converted equivalent are shown:

```text
  Balance       : $2,100.00 USD
                  ≈ ¥315,000 JPY
```

The converted figure uses the latest available rate from `exchange_rates` (see **multi_currency.md**) and is informational only. The balance is also surfaced as a widget on the main dashboard (see **dashboard.md § 3**).

### 5.4 Balance Calculation

**Opening balance:** the value entered during onboarding is written directly to `accounts.balance`. It is not a transaction row — it is the fixed baseline from which all subsequent changes are tracked.

**Running balance:** `accounts.balance` is a stored running total updated automatically on every confirmed transaction write, within the same database transaction as the triggering write.

| Event | income | expense / saving / investment |
| --- | --- | --- |
| Transaction confirmed | `balance + amount` | `balance − amount` |
| Transaction amount edited | `balance − oldAmount + newAmount` | `balance + oldAmount − newAmount` |
| Transaction soft-deleted | `balance − amount` | `balance + amount` |
| Soft-deleted transaction restored | `balance + amount` | `balance − amount` |

### 5.5 Editing the Account

Opened by tapping **Edit** on the account detail screen.

**Editable fields:**

| Field | DB column | Notes |
| --- | --- | --- |
| Account name | `accounts.name` | Freely editable at any time |
| Balance (manual correction) | `accounts.balance` | Direct override to correct drift. Does not create a transaction record |
| Currency | `accounts.currency` | Editable only if no transactions have been recorded; locked thereafter |

Currency lock message:

```text
Currency cannot be changed after transactions have been recorded.
```

**Database write:**

```text
PATCH /accounts/:id
Content-Type: application/json
{ name?, balance?, currency? }
```

```text
1. Verify account belongs to req.user.id
     ↓
2. If currency change requested:
   → SELECT COUNT(*) FROM transactions WHERE account_id = :id
   → Reject with 400 VALIDATION_ERROR if count > 0
     ↓
3. UPDATE accounts
   → SET changed fields, updated_at = now()
     ↓
4. 200 OK — { success: true }
```
