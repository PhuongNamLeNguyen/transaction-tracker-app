# Database Schema

> PostgreSQL — 18 tables across 6 domains.
> For TypeScript interfaces of these tables — see **data_models.md**.
> For auth token lifecycle — see **auth_flow.md § 5–8**.
> For migration and seed commands — see **README.md § 6**.

---

## Table of Contents

- [Database Schema](#database-schema)
  - [Table of Contents](#table-of-contents)
  - [1. Entity Relationships](#1-entity-relationships)
  - [2. Users \& Settings](#2-users--settings)
  - [3. Accounts \& Transactions](#3-accounts--transactions)
  - [4. Categories](#4-categories)
  - [5. Receipts \& AI](#5-receipts--ai)
  - [6. Budgets](#6-budgets)
  - [7. Auth \& Reference](#7-auth--reference)
  - [8. Indexes](#8-indexes)
  - [9. Data Integrity](#9-data-integrity)
  - [10. Migrations](#10-migrations)

---

## 1. Entity Relationships

```text
users ──┬── user_settings
        ├── accounts
        ├── transactions ──┬── transaction_splits ── categories ── category_keywords
        │                  └── receipts ── receipt_items ── ai_predictions
        │                                └── ai_corrections
        ├── budget_periods ── budgets ── categories
        └── auth ──┬── sessions
                   ├── password_reset_tokens
                   └── verification_tokens

merchants ← transactions, receipts
exchange_rates (standalone)
```

---

## 2. Users & Settings

**`users`**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| email | text | Unique |
| password_hash | text | bcrypt hash |
| is_verified | boolean | Email verified |
| created_at / updated_at | timestamp | |

**`user_settings`**

| Column | Type | Notes |
| --- | --- | --- |
| user_id | uuid | PK, FK → users |
| theme | text | `light` / `dark` |
| cycle_start_day | date | Income cycle start |
| target_currency | text | ISO 4217 |
| system_language | text | BCP 47 locale |
| time_zone | text | IANA timezone |
| created_at / updated_at | timestamp | |

---

## 3. Accounts & Transactions

**`accounts`** — Financial containers (cash, bank, wallet) per user

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| name / type | text | |
| currency | text | ISO 4217 |
| balance | numeric | |
| created_at / updated_at | timestamp | |

**`transactions`** — Core financial event record

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id / account_id | uuid | FKs |
| type | text | `income` / `expense` / `investment` / `saving` |
| amount / currency | numeric / text | |
| merchant_id | uuid | FK → merchants, nullable |
| status | text | `processing` / `ready` / `confirmed` |
| source | text | `manual` / `receipt_scan` |
| transaction_date | date | |
| note | text | Nullable |
| created_at / updated_at | timestamp | |

**`transaction_splits`** — One transaction split across multiple categories

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| transaction_id | uuid | FK → transactions |
| category_id | uuid | FK → categories |
| amount | numeric | Must sum to transaction amount |
| created_at / updated_at | timestamp | |

**`merchants`** — Shared merchant reference table

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| name / normalized_name | text | |
| default_category_id | uuid | FK → categories, nullable |
| country / logo_url | text | Nullable |
| created_at / updated_at | timestamp | |

**`merchant_aliases`** — OCR variant spellings mapped to a merchant

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| merchant_id | uuid | FK → merchants |
| alias_name | text | |
| created_at | timestamp | |

---

## 4. Categories

**`categories`**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| name | text | |
| type | text | `income` / `expense` / `investment` / `saving` |
| icon | text | Icon identifier |
| created_at / updated_at | timestamp | |

**`category_keywords`** — Used by AI to auto-assign categories

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| category_id | uuid | FK → categories |
| keyword | text | |
| created_at | timestamp | |

---

## 5. Receipts & AI

**`receipts`**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| transaction_id | uuid | FK → transactions, nullable |
| image_url | text | |
| ocr_status | text | `pending` / `processing` / `done` |
| scan_data | json | Raw OCR output |
| category_id / merchant_id | uuid | FKs, nullable |
| created_at / updated_at | timestamp | |

**`receipt_items`** — Line items extracted from receipt

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| receipt_id | uuid | FK → receipts |
| item_name | text | |
| price / quantity | numeric | |

**`ai_predictions`** — Model category guess per line item

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| receipt_item_id | uuid | FK → receipt_items |
| predicted_category_id | uuid | FK → categories, nullable |
| confidence_score | numeric | 0–1 |
| model_version | text | |
| created_at | timestamp | |

**`ai_corrections`** — Audit log of user overrides to AI results

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| receipt_id | uuid | FK → receipts |
| field_name | text | Corrected field name |
| ai_value / corrected_value | text | |
| corrected_by_user_id | uuid | FK → users |
| created_at | timestamp | |

---

## 6. Budgets

**`budget_periods`**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| start_date / end_date | date | |
| created_at | timestamp | |

**`budgets`** — Allocation per category per period

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| period_id | uuid | FK → budget_periods |
| category_id | uuid | FK → categories |
| amount / currency | numeric / text | |
| created_at | timestamp | |

---

## 7. Auth & Reference

**`sessions`** — Refresh token store; see **auth_flow.md § 5**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| refresh_token_hash | text | bcrypt hash |
| device_info / ip_address | text | Nullable |
| created_at / expired_at / revoked_at | timestamp | |

**`password_reset_tokens`** — 1-hour expiry, single-use; see **auth_flow.md § 8**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| token_hash | text | bcrypt hash |
| created_at / expired_at / used_at | timestamp | |

**`verification_tokens`** — 24-hour expiry, single-use; see **auth_flow.md § 7**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| token_hash | text | bcrypt hash |
| created_at / expired_at | timestamp | |

**`exchange_rates`** — Standalone, no user FK

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| base_currency / target_currency | text | ISO 4217 |
| rate | numeric | |
| updated_at | timestamp | |

---

## 8. Indexes

| Table | Indexed columns |
| --- | --- |
| users | email |
| accounts | user_id |
| transactions | user_id, transaction_date, merchant_id, status |
| transaction_splits | transaction_id, category_id |
| receipts | transaction_id, category_id, merchant_id |
| receipt_items | receipt_id |
| category_keywords | category_id |
| ai_corrections | receipt_id, corrected_by_user_id |
| exchange_rates | base_currency, target_currency |
| budget_periods | user_id |
| budgets | period_id, category_id |
| sessions | user_id, refresh_token_hash |
| password_reset_tokens | user_id, token_hash |
| verification_tokens | user_id, token_hash |

---

## 9. Data Integrity

- All amounts `≥ 0`
- `transaction.type` ∈ `{income, expense, investment, saving}`
- `transaction.status` ∈ `{processing, ready, confirmed}`
- `transaction.source` ∈ `{manual, receipt_scan}`
- All foreign keys enforced at DB level
- `transaction_splits.amount` must sum to parent `transaction.amount`
- Auth tokens are single-use — `expired_at` and `used_at` checked before accepting

---

## 10. Migrations

```bash
npm run migrate   # Apply schema — scripts/migrate.ts
npm run seed      # Insert default categories and reference data — scripts/seed.ts
```

Run in order: **migrate → seed → start backend.** See **README.md § 4**.
