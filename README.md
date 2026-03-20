# Transaction Tracker

> Web app for managing income, expenses, investments, and savings with AI receipt scanning.

---

## Table of Contents

- [Transaction Tracker](#transaction-tracker)
  - [Table of Contents](#table-of-contents)
  - [1. Features](#1-features)
  - [2. Tech Stack](#2-tech-stack)
  - [3. Project Structure](#3-project-structure)
  - [4. Setup](#4-setup)
  - [5. Environment Variables](#5-environment-variables)
  - [6. Scripts](#6-scripts)
  - [7. API Reference](#7-api-reference)
    - [Transactions](#transactions)
    - [Receipts](#receipts)
    - [Example Request Body (POST /transactions)](#example-request-body-post-transactions)
  - [8. Dev Workflow](#8-dev-workflow)
  - [9. Documentation](#9-documentation)
    - [`docs/arch/`](#docsarch)
    - [`docs/development/`](#docsdevelopment)
    - [`docs/features/`](#docsfeatures)
    - [`docs/ui/`](#docsui)

---

## 1. Features

- Transaction tracking — income, expense, investment, saving
- Category splitting (one transaction across multiple categories)
- AI receipt scanning via OCR + LLM
- Budget periods per user
- Multi-currency with exchange rates
- Dashboard with distribution pie chart

---

## 2. Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| AI / OCR | OCR + OpenAI LLM |
| Infrastructure | Docker |

---

## 3. Project Structure

```text
transaction-tracker-app/
├── README.md
├── docs/
│   ├── arch/             # Architecture, DB schema, data models, API, auth
│   ├── development/      # Conventions, setup, testing, error handling, env configs
│   ├── features/         # Per-feature specs (written before building)
│   └── ui/               # Design tokens, components, forms, accessibility, etc.
├── database/             # Schema, migrations, seeds
├── shared/               # Shared types and constants
├── backend/              # Express API
├── ai-service/           # Receipt scanning
├── frontend/             # React app
├── scripts/              # seed.ts, migrate.ts
├── .env
└── docker-compose.yml
```

---

## 4. Setup

```bash
npm install
docker compose up

# In separate terminals:
cd backend && npm run dev
cd frontend && npm run dev
```

Run in this order: **migrate → seed → start backend.**

---

## 5. Environment Variables

Create `.env` in the project root. Do not commit it.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `OPENAI_API_KEY` | AI receipt parsing |
| `PORT` | Backend port (default 3000) |
| `NODE_ENV` | `development` or `production` |

---

## 6. Scripts

| Command | Purpose |
| --- | --- |
| `npm run migrate` | Apply database schema migrations |
| `npm run seed` | Insert default categories and reference data |

---

## 7. API Reference

All endpoints require JWT auth unless noted.

### Transactions

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/transactions` | Create transaction |
| GET | `/transactions` | List all |
| GET | `/transactions/:id` | Get one |
| PUT | `/transactions/:id` | Update |
| DELETE | `/transactions/:id` | Delete |

### Receipts

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/receipts/upload` | Upload image |
| POST | `/receipts/scan` | Scan and return transaction draft |

### Example Request Body (POST /transactions)

```json
{
  "type": "expense",
  "amount": 85000,
  "currency": "JPY",
  "account_id": "uuid",
  "category_id": "uuid",
  "merchant_id": "uuid (optional)",
  "transaction_date": "2026-03-10",
  "note": "Lunch (optional)"
}
```

---

## 8. Dev Workflow

| Step | Task | Location |
| --- | --- | --- |
| 1 | Define — document purpose, user flow, APIs, DB changes, UI | `docs/features/` |
| 2 | Database — add schema + migration if needed | `database/migrations/` |
| 3 | Backend — routes, controllers, services, validation | `backend/src/` |
| 4 | Frontend — components, pages, forms, API integration | `frontend/` |
| 5 | Test — APIs, UI, errors, edge cases | — |

---

## 9. Documentation

### `docs/arch/`

| File | Contents |
| --- | --- |
| `architecture.md` | Layers, components, flows |
| `database_schema.md` | Tables, columns, relationships, indexes |
| `data_models.md` | TypeScript interfaces, enums, DTOs |
| `api_spec.md` | Routes, request/response formats, error codes |
| `frontend_structure.md` | Pages, components, hooks, routing, state |

### `docs/development/`

| File | Contents |
| --- | --- |
| `coding_conventions.md` | Naming, file structure, patterns |
| `development_setup.md` | Local environment setup, troubleshooting |
| `testing.md` | Test strategy, factories, coverage targets |
| `error_handling.md` | AppError class, middleware, error codes |
| `environment_configs.md` | Env variables, Docker, secrets management |

### `docs/features/`

| File | Contents |
| --- | --- |
| `auth.md` | Authentication flow |
| `transaction_create.md` | Creating transactions |
| `transaction_edit.md` | Editing transactions |
| `transaction_split.md` | Splitting across categories |
| `multi_currency.md` | Multi-currency and exchange rates |
| `budget_management.md` | Budget periods and tracking |
| `dashboard.md` | Dashboard and pie chart |
| `notification.md` | Notifications |
| `settings.md` | App settings |
| `ai_extract_receipt.md` | AI receipt extraction |
| `ai_receipt_pipeline.md` | Upload → OCR → parsing → draft flow |

### `docs/ui/`

| File | Contents |
| --- | --- |
| `README.md` | UI doc overview |
| `design_tokens.md` | CSS variables, theme values |
| `colors.md` | Color palette and usage |
| `typography.md` | Type scale, fonts, formatting |
| `spacing_layout.md` | Spacing tokens, grid, layout rules |
| `components.md` | Component library reference |
| `navigation.md` | Routing, bottom nav, top bar |
| `forms.md` | Form patterns, validation, inputs |
| `gestures_interactions.md` | Swipe, tap, drag behaviors |
| `charts_visualizations.md` | Pie chart, budget bar specs |
| `notifications_feedback.md` | Toasts, alerts, empty states |
| `accessibility.md` | WCAG 2.1 AA — contrast, focus, screen reader, motion |
