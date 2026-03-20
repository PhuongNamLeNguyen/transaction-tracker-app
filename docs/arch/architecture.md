# Architecture

> For setup, environment variables, and scripts — see **README.md**.
> For JWT + refresh token lifecycle — see **auth_flow.md**.
> For full API routes and error codes — see **api_spec.md**.

---

## Table of Contents

- [Architecture](#architecture)
  - [Table of Contents](#table-of-contents)
  - [1. Layers](#1-layers)
  - [2. Components](#2-components)
  - [3. Key Flows](#3-key-flows)
  - [4. Deployment](#4-deployment)
  - [5. Design Principles](#5-design-principles)

---

## 1. Layers

```text
Frontend (React + TypeScript + Vite)
        ↓ REST
Backend API (Node.js + Express)
        ↓                    ↓
  PostgreSQL          AI Service (OCR + OpenAI LLM)
```

| Layer | Responsibility |
| --- | --- |
| Frontend | UI, auth, dashboard, transactions, receipt upload |
| Backend API | Auth, business logic, validation, DB access, AI integration |
| Database | Persistent storage for all entities |
| AI Service | Receipt OCR and structured transaction extraction |

---

## 2. Components

**Frontend** — Auth, dashboard, transaction list/form, receipt upload. Communicates with the backend via REST API.

**Backend API** — Five modules: `authentication` · `transactions` · `accounts` · `receipts` · `dashboard`. Handles auth, validation, DB access, and calls to the AI service.

**AI Service** — Receives image → OCR extracts text → LLM parses (merchant, date, amount, category) → returns structured transaction draft.

**Database** — Stores users, accounts, transactions, transaction_splits, categories, receipts (images and OCR results).

---

## 3. Key Flows

**Auth**:

```text
User login → Backend verifies credentials → JWT issued → Frontend attaches token on every request
```

**Transaction create**:

```text
User submits form → Frontend → Backend validates → DB save → Response
```

Fields: `amount`, `type` (income | expense | investment | saving), `category`, `account`, `date`, `note`.

**Receipt scanning**:

```text
Upload image → OCR extracts text → LLM parses → Draft returned → User confirms → Saved
```

Transaction is only persisted after user confirmation. Supports JPG, PNG, HEIC; optional PDF.

---

## 4. Deployment

Four Docker containers managed via `docker compose up`:

| Container | Role |
| --- | --- |
| `frontend` | Static React app |
| `backend` | Node.js Express API |
| `postgresql` | Database |
| `ai-service` | OCR + LLM |

---

## 5. Design Principles

- Modular layers with clear separation of concerns
- All cross-layer communication through explicit API boundaries
- AI results are always reviewed by the user before being persisted
