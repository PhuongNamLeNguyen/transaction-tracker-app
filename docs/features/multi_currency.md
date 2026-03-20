# Multi-Currency

> The canonical reference for currency conversion in Transaction Tracker. Covers how stored amounts are converted to `user_settings.target_currency` at display time, exchange rate sourcing, and fallback behaviour when a rate is unavailable. All amounts are stored in their original transaction currency and **never modified** — conversion is display-only. For which fields trigger display conversion see **dashboard.md**, **settings.md § 5.3**, and **budget_management.md**.

---

## Table of Contents

- [Multi-Currency](#multi-currency)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Conversion Logic](#2-conversion-logic)
  - [3. Fallback Behaviour](#3-fallback-behaviour)
  - [4. Exchange Rate Storage](#4-exchange-rate-storage)
  - [5. Rules](#5-rules)

---

## 1. Overview

Transaction Tracker is multi-currency by design. Every transaction is stored in the currency it was entered (`transactions.currency`). At display time — on the dashboard, account detail screen, budget progress bars, and anywhere else a monetary total is shown — amounts are converted to the user's chosen display currency (`user_settings.target_currency`) using the latest available rate from the `exchange_rates` table.

**Key principle: stored amounts are never modified.** Changing `target_currency` in Settings only changes how amounts are displayed — no data is rewritten.

---

## 2. Conversion Logic

For every amount where `transactions.currency ≠ user_settings.target_currency`:

```sql
SELECT rate
FROM exchange_rates
WHERE base_currency   = transactions.currency
  AND target_currency = user_settings.target_currency
ORDER BY updated_at DESC
LIMIT 1;
```

```text
converted_amount = original_amount × rate
```

This lookup is performed at query time for each distinct currency pair present in the result set. If all amounts are already in `target_currency`, no conversion is needed.

---

## 3. Fallback Behaviour

If no rate is available for a currency pair, the amount is returned in its original currency. The frontend renders it with a currency code suffix rather than converting:

```text
¥42,000       ← converted to target_currency (no suffix)
$210 USD      ← no rate available; shown in native currency with code
```

A warning banner is shown on the dashboard whenever one or more amounts could not be converted:

```text
⚠  Some amounts shown in their original currency — exchange rate unavailable.
```

---

## 4. Exchange Rate Storage

Exchange rates are stored in the `exchange_rates` table (see **database_schema.md** for the full schema). Rates are fetched from an external provider and refreshed periodically. The most recent rate for each currency pair is always used — stale rates are not deleted but are ranked lower by `updated_at`.

Rate update frequency and the external provider are configured via environment variables (see **environment_configs.md**).

---

## 5. Rules

- Stored amounts (`transactions.amount`, `budgets.amount`, `accounts.balance`) are **never modified** by currency changes
- `user_settings.target_currency` changes take effect immediately at display time — no data migration required
- `accounts.currency` is the native currency of the account balance and is distinct from `target_currency`; if they differ, both the native and converted balance are shown (see **settings.md § 5.3**)
- Budget amounts (`budgets.amount`) are stored in `budgets.currency` (set at onboarding to `target_currency`); if the user later changes `target_currency`, the budget amounts are displayed with conversion applied
- If `exchange_rates` has no entry for a required pair, the original amount is shown with its currency code — no error is thrown
