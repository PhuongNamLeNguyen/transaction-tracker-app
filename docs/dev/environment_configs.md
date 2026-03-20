# Environment Configs

> All environment variables, per-environment differences, Docker configuration, and secrets management. For local setup steps see **developer_setup.md**.

---

## 1. Environment Overview

| Environment | Database | AI calls | Docker |
| --- | --- | --- | --- |
| `development` | `tracker_dev` (Docker) | Real | `docker-compose.yml` |
| `test` | `tracker_test` (Docker) | Mocked (MSW) | `docker-compose.yml` |
| `production` | Managed PostgreSQL | Real | `docker-compose.prod.yml` |

`NODE_ENV` controls active behaviour — always set it explicitly.

---

## 2. Environment Variables Reference

### Backend

| Variable | Required | Description | Dev example |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Runtime environment | `development` |
| `PORT` | No | Server port | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/tracker_dev` |
| `JWT_SECRET` | Yes | Signs/verifies access tokens (32+ chars) | any long string |
| `JWT_ACCESS_EXPIRY` | No | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | No | Refresh token lifetime | `30d` |
| `OPENAI_API_KEY` | Yes | AI receipt parsing | `sk-...` |
| `CORS_ORIGIN` | Yes | Allowed frontend origin | `http://localhost:5173` |
| `BCRYPT_ROUNDS` | No | Password hash cost factor | `12` (use `10` in dev) |

### Frontend (Vite — `VITE_` prefix required)

| Variable | Required | Description | Dev example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Backend API base URL | `http://localhost:3000/api/v1` |
| `VITE_ENV` | No | Env flag for frontend logic | `development` |

### Test only

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Must point to `tracker_test` — never dev |
| `JWT_SECRET` | Any fixed string for determinism |
| `OPENAI_API_KEY` | Dummy value — AI calls are mocked |

---

## 3. Per-Environment Config

### Development

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://tracker_user:tracker_pass@localhost:5432/tracker_dev
JWT_SECRET=<any-long-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10   # lower for faster dev cycles only
```

### Test

```bash
NODE_ENV=test
PORT=3001           # avoids conflict with running dev server
DATABASE_URL=postgresql://tracker_user:tracker_pass@localhost:5432/tracker_test
JWT_SECRET=test-secret-minimum-32-characters-long
OPENAI_API_KEY=sk-test-not-real
BCRYPT_ROUNDS=4     # minimum — speed only, not security
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=<managed PostgreSQL URL with SSL>
JWT_SECRET=<64-char cryptographically random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
OPENAI_API_KEY=<production org key>
CORS_ORIGIN=https://yourdomain.com
BCRYPT_ROUNDS=12
```

Production: `DATABASE_URL` → managed DB; `JWT_SECRET` → secrets manager; secrets injected by hosting platform, never committed.

---

## 4. .env Files

| File | Committed | Purpose |
| --- | --- | --- |
| `.env` | No | Local dev overrides (git-ignored) |
| `.env.example` | Yes | Template with dummy values |
| `.env.test` | No | Test environment (git-ignored) |
| `.env.test.example` | Yes | Template for test environment |
| `.env.production` | Never | Production secrets injected by platform |

### .env.example

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://tracker_user:tracker_pass@localhost:5432/tracker_dev
JWT_SECRET=replace-with-a-random-string-at-least-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
OPENAI_API_KEY=sk-replace-with-your-openai-key
CORS_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_ENV=development
```

### .gitignore entries

```text
.env
.env.test
.env.local
.env.*.local
```

---

## 5. Docker Compose

### Development — `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER:     tracker_user
      POSTGRES_PASSWORD: tracker_pass
      POSTGRES_DB:       tracker_dev
    ports: ['5432:5432']
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U tracker_user']
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports: ['3000:3000']
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }

  frontend:
    build: ./frontend
    ports: ['5173:5173']
    env_file: .env
    depends_on: [backend]

  ai-service:
    build: ./ai-service
    ports: ['3002:3002']
    env_file: .env
    depends_on: [backend]

volumes:
  postgres_data:
```

For test runs, override the database with a separate service on port `5433`:

```yaml
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_USER: tracker_user
      POSTGRES_PASSWORD: tracker_pass
      POSTGRES_DB: tracker_test
    ports: ['5433:5432']
```

### Production — `docker-compose.prod.yml`

No `postgres` service — uses external managed DB.

```yaml
services:
  backend:
    image: your-registry/transaction-tracker-backend:latest
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports: ['3000:3000']

  frontend:
    image: your-registry/transaction-tracker-frontend:latest
    restart: always
    ports: ['80:80', '443:443']

  ai-service:
    image: your-registry/transaction-tracker-ai:latest
    restart: always
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports: ['3002:3002']
```

---

## 6. Frontend Config

```typescript
// frontend/src/utils/config.ts
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,
  env:        import.meta.env.VITE_ENV as 'development' | 'production' | 'test',
  isDev:      import.meta.env.VITE_ENV === 'development',
}
```

All API calls use `config.apiBaseUrl` — never a hardcoded URL. `VITE_`-prefixed variables end up in the browser bundle — never put secrets in them.

Vite env file priority (highest → lowest): `.env.{mode}.local` → `.env.{mode}` → `.env.local` → `.env`

---

## 7. Secrets Management

| Env | Where secrets live |
| --- | --- |
| Development | `.env` locally (git-ignored) |
| Test (CI) | CI environment variables (e.g. GitHub Actions secrets) |
| Production | Injected by hosting platform — never written to files |

### What is a secret?

| Variable | Secret? |
| --- | --- |
| `JWT_SECRET` | Yes — compromised = forged tokens |
| `OPENAI_API_KEY` | Yes — compromised = billing abuse |
| `DATABASE_URL` (with password) | Yes — compromised = full DB access |
| `PORT`, `NODE_ENV`, `CORS_ORIGIN` | No |
| `VITE_API_BASE_URL` | No — ends up in browser bundle |

---

## 8. Rules

- Never commit `.env`, `.env.test`, or any file with real secrets
- Always commit `.env.example` and `.env.test.example` with dummy values
- Never reuse `JWT_SECRET` or `OPENAI_API_KEY` across environments
- `BCRYPT_ROUNDS` must be `12` in production
- `JWT_ACCESS_EXPIRY` must be `15m` in production — never increase
- Test runs always use `tracker_test` — never dev or production database
- Never put secrets in `VITE_`-prefixed variables
- When adding a new variable: update `.env.example`, `.env.test.example`, this doc, and CI secrets before merging
