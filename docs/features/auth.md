# Authentication

> Full authentication and session management reference for Transaction Tracker. The backend issues and verifies JWTs using `JWT_SECRET`. For endpoint signatures see **api_spec.md § 2**. For the `sessions`, `password_reset_tokens`, and `verification_tokens` table schemas see **database_schema.md § 7**.

---

## Table of Contents

- [Authentication](#authentication)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Token Structure](#2-token-structure)
  - [3. Registration Flow](#3-registration-flow)
  - [4. Email Verification Flow](#4-email-verification-flow)
  - [5. Login Flow](#5-login-flow)
  - [6. Token Refresh Flow](#6-token-refresh-flow)
  - [7. Forgot Password Flow](#7-forgot-password-flow)
  - [8. Logout Flow](#8-logout-flow)
  - [9. Auth Middleware](#9-auth-middleware)
  - [10. Protected Routes](#10-protected-routes)
  - [11. Security Rules](#11-security-rules)

---

## 1. Overview

Transaction Tracker uses a **dual-token** authentication system built on JWT and rotating refresh tokens. The backend (Node.js + Express) handles all auth logic directly against PostgreSQL — there is no third-party auth provider.

| Token | Lifetime | Storage | Purpose |
| --- | --- | --- | --- |
| Access token (JWT) | 15 min | Memory (frontend) | `Authorization: Bearer` header on every API request |
| Refresh token | 30 days | HttpOnly cookie | Issues a new access token without re-login |

The refresh token is stored as a `bcrypt` hash in `sessions` — the raw value is never persisted.

```text
Register → Verify email → Login → Access token + Refresh token issued
                                          ↓
                          Access token expires → /auth/refresh → New access token
                                          ↓
                                   Logout → Session revoked in DB
```

---

## 2. Token Structure

**Access token payload:**

```typescript
export interface JwtPayload {
  sub:        string    // user id (uuid)
  email:      string
  isVerified: boolean
  iat:        number    // issued at (Unix timestamp)
  exp:        number    // iat + 15 min
}
```

**Sign / verify:**

```typescript
// Sign
const accessToken = jwt.sign(
  { sub: user.id, email: user.email, isVerified: user.isVerified },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
)

// Verify — throws TokenExpiredError or JsonWebTokenError → respond 401 UNAUTHORIZED
const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
```

**Refresh token cookie:**

```text
Set-Cookie: refresh_token=<raw>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000
```

`HttpOnly` — not accessible via JavaScript. `Secure` — set only in production (`NODE_ENV === "production"`). `SameSite=Lax` — blocks cross-site POST but allows top-level navigations. `Path=/` — sent on all requests to the backend.

---

## 3. Registration Flow

```text
POST /auth/register
  → Validate email + password (min 8 chars)
  → Check email not taken → 400 VALIDATION_ERROR if taken
  → bcrypt hash password (rounds: 12)
  → INSERT INTO users (is_verified = false)
  → INSERT INTO user_settings (defaults)
  → Generate verification token → hash → INSERT INTO verification_tokens (24hr expiry)
  → Send verification email
  → 201 { success: true, data: { id, email, name } }
```

Login is blocked until `is_verified = true`. Attempting login before verifying → `403 EMAIL_NOT_VERIFIED`.

---

## 4. Email Verification Flow

```text
POST /auth/verify-email  { rawToken: "<raw>" }
  → Look up verification_tokens → compare hash → 400 if not found / already used / expired
  → SET users.is_verified = true
  → SET verification_tokens.expired_at = now()
  → 200 OK — user may now log in
```

Token expiry: **24 hours**. After expiry the user must request a new verification email.

```typescript
const rawToken  = crypto.randomBytes(32).toString('hex')  // sent in email link
const tokenHash = await bcrypt.hash(rawToken, 12)         // stored in DB
```

`is_verified` is embedded in the JWT payload on every subsequent login.

---

## 5. Login Flow

```text
POST /auth/login
  → Look up user by email → 401 UNAUTHORIZED if not found
  → Compare password (bcrypt) → 401 if mismatch
  → Check is_verified = true → 403 EMAIL_NOT_VERIFIED if false
  → Sign access token (15m, payload: sub, email, isVerified)
  → Generate refresh token (random 64-byte hex) → bcrypt hash → INSERT INTO sessions
  → 200 OK — access token in response body, refresh token in HttpOnly cookie
```

**Response body:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "rememberMe": false,
    "user": { "id": "uuid", "email": "user@example.com", "isVerified": true }
  }
}
```

The frontend stores `accessToken` in memory and attaches it to every request as `Authorization: Bearer <token>`.

---

## 6. Token Refresh Flow

The frontend **automatically** calls this when the access token expires — no user interaction required.

```text
POST /auth/refresh  (cookie only — no Authorization header)
  → Read refresh token from cookie → 401 if absent
  → Match against sessions via bcrypt → 401 if no match, expired, or revoked
  → Sign new access token (15m)
  → Rotate: SET sessions.revoked_at = now() on old session, INSERT new session
  → 200 OK — new access token in body
```

Session rotation on every refresh limits the damage window of a stolen refresh token to a single use.

---

## 7. Forgot Password Flow

```text
POST /auth/forgot-password  { email }
  → If user exists: generate reset token → hash → INSERT INTO password_reset_tokens (1hr expiry)
  → Send reset email
  → Always 200 OK (prevents email enumeration)

POST /auth/reset-password  { token, newPassword }
  → Validate token (hash match, not expired, not used) → 400 VALIDATION_ERROR if invalid
  → bcrypt hash new password → UPDATE users.password_hash
  → SET password_reset_tokens.used_at = now()
  → Revoke all existing sessions for user (force re-login everywhere)
  → 200 OK — frontend redirects to login screen
```

Token expiry: **1 hour**. On success, all active sessions are revoked.

---

## 8. Logout Flow

```text
POST /auth/logout  (Authorization: Bearer <accessToken>)
  → Extract user_id from JWT
  → Revoke ALL active sessions for user (revokeAllUserSessions)
  → Clear refresh_token cookie (Set-Cookie: Max-Age=0)
  → 200 OK
```

Logout revokes every session for the user (not just the current device). The access token is stateless and cannot be server-side invalidated — it expires naturally after 15 minutes. The frontend must discard it from memory immediately on logout.

---

## 9. Auth Middleware

Applied to all protected routes. Both middlewares are always used together.

```typescript
// backend/src/middleware/auth.middleware.ts

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Token not found or invalid', 401)
  }
  try {
    const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as JwtPayload
    req.user = { id: payload.sub, email: payload.email, isVerified: payload.isVerified }
    next()
  } catch {
    throw new AppError('UNAUTHORIZED', 'Token not found or invalid', 401)
  }
}

export const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user.isVerified) throw new AppError('EMAIL_NOT_VERIFIED', 'Email not verified', 403)
  next()
}

// Applied on all data routes
router.use(authenticate, requireVerified)
```

---

## 10. Protected Routes

| Route | Middleware |
| --- | --- |
| `POST /auth/register` | None |
| `POST /auth/login` | None |
| `POST /auth/refresh` | None (cookie) |
| `POST /auth/verify-email` | None |
| `POST /auth/forgot-password` | None |
| `POST /auth/reset-password` | None |
| `/transactions/*` | `authenticate` + `requireVerified` |
| `/accounts/*` | `authenticate` + `requireVerified` |
| `/receipts/*` | `authenticate` + `requireVerified` |
| `/ai/*` | `authenticate` + `requireVerified` |
| `/dashboard/*` | `authenticate` + `requireVerified` |

---

## 11. Security Rules

- `JWT_SECRET` must be ≥ 32 characters, cryptographically random
- Passwords hashed with `bcrypt` at cost factor 12 — never store plain text
- Refresh tokens hashed with `bcrypt` before DB storage — never store raw
- Refresh token cookie must be `HttpOnly`, `Secure`, `SameSite=Strict` in production
- All DB queries must be parameterised — no string interpolation with user input
- All service queries scoped to `req.user.id` — users must never access other users' data
- On password reset, all existing sessions are revoked immediately
- Verification and reset tokens are single-use and time-limited — always check `expired_at` and `used_at`
- Access token lifetime is 15 minutes — do not increase
- Never log access tokens, refresh tokens, or password hashes
