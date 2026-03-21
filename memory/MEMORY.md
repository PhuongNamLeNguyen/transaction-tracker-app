# Transaction Tracker App — Project Memory

## Stack

- **Backend**: Node.js + Express + TypeScript, PostgreSQL (pg), JWT auth, bcryptjs, Zod validation
- **Frontend**: React + TypeScript + Vite, React Router v6, fetch API

## Key Paths

- Backend entry: `backend/server.ts` → `backend/src/app.ts`
- Backend API: `backend/src/routes/index.ts` → `/api/v1/auth/*`
- Frontend entry: `frontend/src/main.tsx` → `App.tsx` (AuthProvider + RouterProvider)
- Frontend API client: `frontend/src/api/auth.api.ts`
- Auth state: `frontend/src/hooks/AuthContext.ts` + `AuthProvider.tsx` + `useAuth.ts`

## Auth Architecture

- Access token: JWT, 15min TTL, stored in-memory (`token-utils.ts`)
- Refresh token: random hex (crypto.randomBytes), hashed with bcrypt in DB (`sessions` table), sent as HttpOnly cookie
- On app load: `AuthProvider` does silent refresh via cookie → sets `user` + `status`
- Login flow: `authApi.login()` → `setToken(res.accessToken)` + `auth.login(res.user)` → navigate

## Validate Middleware Convention

- `validate.middleware.ts` calls `schema.parse(req.body)` — schemas must validate req.body fields **directly** (no `body:` wrapper)
- Error format: `{ success: false, error: { code: "VALIDATION_ERROR", details: [...] } }`

## API Response Format

- Success: `{ success: true, data: { ... } }` — frontend accesses `.data`
- Error: `{ success: false, error: { code, message, timestamp } }`
- Frontend error parsing: `(err as { error?: { code?: string } })?.error?.code`

## Auth Endpoints (all under `/api/v1/auth`)

- POST `/register` — body: `{ email, password, name }` → returns `{ id, email, name }`
- POST `/login` — body: `{ email, password, rememberMe }` → returns `{ accessToken, user, rememberMe }`; sets refresh cookie
- POST `/verify-email` — body: `{ rawToken }` → returns `{ message }`
- POST `/refresh` — sends cookie → returns `{ accessToken, user }`
- POST `/logout` — Bearer token required → revokes all sessions
- POST `/forgot-password` — body: `{ email }` → always 200
- POST `/reset-password` — body: `{ token, newPassword }`

## Database

- Main tables: users, sessions, verification_tokens, password_reset_tokens, user_settings
- Migrations in `database/migrations/`

## Dev Notes

- Verification tokens and password reset tokens printed to console in dev (no email service yet)
- `BCRYPT_ROUNDS=12` hardcoded in auth.service (overrides `.env` value of 10)

## Sync Fixes Applied (session 2026-03-21)

1. **auth.validator.ts** — Removed `body:`/`query:` wrappers from all Zod schemas; added `name` to `registerSchema`; fixed `verifyEmailSchema` to validate `rawToken` (not `query.token`)
2. **auth.routes.ts** — Changed `verify-email` from `GET` → `POST`
3. **auth.controller.ts** — `refresh` handler now destructures and forwards `user` in response body
4. **validate.middleware.ts** — Unified error format to `{ success, error: { code, details } }`; replaced deprecated `ZodSchema` with `ZodType`
5. **AuthContext.ts + AuthProvider.tsx** — Added `login(user: AuthUser): void` to context; `AuthProvider` exposes it via `useCallback`
6. **LoginPage.tsx** — Calls `auth.login(res.user)` after successful login so `ProtectedRoute` sees `"authenticated"` immediately
7. **auth.api.ts** — Removed `refreshToken` from `LoginResponse` (cookie only); fixed `RefreshResponse` to include `user`
