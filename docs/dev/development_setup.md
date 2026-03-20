# Developer Setup

> End-to-end guide for setting up Transaction Tracker locally. For architecture see **README.md** and **architecture.md**. For full env variable reference see **environment_configs.md**.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | v18+ |
| npm | v9+ |
| Docker + Docker Compose | Latest stable / v2+ |
| Git | Any |

---

## 2. Initial Setup

```bash
git clone <repository-url>
cd transaction-tracker-app
npm install

cp .env.example .env   # then fill in real values
```

Required `.env` variables:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/tracker_dev` |
| `JWT_SECRET` | Signs/verifies JWTs (32+ chars) | any long random string |
| `OPENAI_API_KEY` | AI receipt parsing | `sk-...` |
| `PORT` | Backend port (default `3000`) | `3000` |
| `NODE_ENV` | Runtime environment | `development` |

Never reuse secrets across environments. Full reference: **environment_configs.md**.

---

## 3. Database Setup

```bash
docker compose up         # start PostgreSQL (wait for healthy)
npm run migrate           # apply schema migrations
npm run seed              # insert default categories and reference data
```

**Required order every time:** `docker compose up` → `npm run migrate` → `npm run seed` → start backend.

---

## 4. Running the App

Open three terminals:

```bash
# Terminal 1 — Backend API (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 3 — AI Service (only needed for AI features)
cd ai-service && npm run dev
```

---

## 5. Verifying the Setup

```bash
# Backend health check
curl http://localhost:3000/api/v1/health
# → { "status": "ok" }
```

Open `http://localhost:5173` — the login/register screen should load. All frontend API calls target `http://localhost:3000/api/v1`.

---

## 6. Development Workflow

| Step | Task | Location |
| --- | --- | --- |
| 1 | Define — purpose, user flow, APIs, DB changes, UI | `docs/features/` |
| 2 | Database — write migration file if schema changes needed | `database/migrations/` |
| 3 | Backend — route, controller, service, validation | `backend/src/` |
| 4 | Frontend — component, page, form, API integration | `frontend/` |
| 5 | Test — APIs, UI, error states, edge cases | — |

### Adding a Migration

```bash
touch database/migrations/YYYYMMDD_description.sql
npm run migrate
```

---

## 7. Project Structure Reference

```text
transaction-tracker-app/
├── docs/
│   ├── features/              # Per-feature specs (written before building)
│   ├── architecture.md
│   ├── database_schema.md
│   ├── api_spec.md
│   ├── coding_conventions.md
│   ├── error_handling.md
│   ├── environment_configs.md
│   └── developer_setup.md     ← this file
├── database/migrations/       # SQL migration files
├── shared/                    # Shared TypeScript types and constants
├── backend/src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middleware/
├── ai-service/
├── frontend/src/
├── scripts/
│   ├── migrate.ts
│   └── seed.ts
├── .env                       # Not committed
├── .env.example               # Committed — template with dummy values
├── docker-compose.yml
└── README.md
```

---

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm run migrate` connection error | Check Docker is running: `docker compose ps`. Check `DATABASE_URL` matches `docker-compose.yml` credentials. |
| Backend returns 500 on all requests | Check `JWT_SECRET` is set. Check DB connection in startup logs. |
| AI endpoints return `THIRD_PARTY_ERROR` | Verify `OPENAI_API_KEY` is valid. Confirm AI service is running. |
| Frontend cannot reach backend | Confirm backend is on expected port. Check CORS errors in browser console — backend must allow the frontend origin. |
| Port conflict | Change `PORT` in `.env` and update `VITE_API_BASE_URL` accordingly. |
