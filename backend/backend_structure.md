# Backend — Folder Structure

```text
backend/
├── package.json
├── tsconfig.json
├── server.ts                        # HTTP server entry point (listen)
│
└── src/
    ├── app.ts                       # Express app setup, middleware mount, route mount
    │
    ├── config/
    │   ├── env.ts                   # Parse & validate all env vars (throws on missing)
    │   ├── jwt.ts                   # JWT sign / verify config
    │   ├── upload.ts                # Multer config (file size limits, mime types)
    │   └── logger.ts                # Winston logger setup
    │
    ├── db/
    │   ├── client.ts                # PostgreSQL pool + query() helper
    │   └── migrations/              # Symlink → /database/migrations
    │
    ├── routes/
    │   ├── index.ts                 # Mount all routers onto /api/v1
    │   ├── auth.routes.ts
    │   ├── transaction.routes.ts
    │   ├── budget.routes.ts
    │   ├── category.routes.ts
    │   ├── account.routes.ts
    │   ├── receipt.routes.ts
    │   └── notification.routes.ts
    │
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── transaction.controller.ts
    │   ├── budget.controller.ts
    │   ├── category.controller.ts
    │   ├── account.controller.ts
    │   ├── receipt.controller.ts
    │   └── notification.controller.ts
    │
    ├── services/
    │   ├── auth.service.ts          # Register, login, refresh token, logout
    │   ├── transaction.service.ts   # CRUD + split logic + budget alert trigger
    │   ├── budget.service.ts        # Budget CRUD + utilisation calculation
    │   ├── category.service.ts      # Category lookup + user custom categories
    │   ├── account.service.ts       # Account CRUD + balance calculation
    │   ├── receipt.service.ts       # Upload file + call ai-service + return draft
    │   ├── notification.service.ts  # Create, list, mark-read, mark-all-read
    │   ├── currency.service.ts      # Fetch exchange rates + convert amounts
    │   └── budget-alert.service.ts  # Evaluate budget thresholds + emit notifications
    │
    ├── repositories/
    │   ├── user.repo.ts
    │   ├── transaction.repo.ts
    │   ├── budget.repo.ts
    │   ├── category.repo.ts
    │   ├── account.repo.ts
    │   └── notification.repo.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts        # Verify JWT, attach req.user
    │   ├── validate.middleware.ts    # Run Zod schema, return 422 on failure
    │   ├── error.middleware.ts       # Central error handler (AppError → JSON)
    │   ├── rate-limit.middleware.ts  # express-rate-limit config per route group
    │   └── request-logger.middleware.ts
    │
    ├── validators/
    │   ├── auth.validator.ts         # register / login / refresh schemas
    │   ├── transaction.validator.ts  # create / update / query-params schemas
    │   ├── budget.validator.ts
    │   ├── category.validator.ts
    │   ├── account.validator.ts
    │   └── receipt.validator.ts
    │
    ├── types/
    │   ├── express.d.ts              # Augment Express Request with req.user
    │   └── index.ts                  # Re-export shared/ types used across backend
    │
    ├── utils/
    │   ├── AppError.ts               # Custom error class with statusCode + code
    │   ├── asyncHandler.ts           # Wrap async controllers — no try/catch boilerplate
    │   ├── response.ts               # success() / error() JSON response helpers
    │   ├── paginate.ts               # Build LIMIT / OFFSET from page + pageSize
    │   ├── currency.ts               # Amount formatting helpers
    │   └── date.ts                   # Date range helpers (current period, etc.)
    │
    └── __tests__/
        ├── factories/
        │   ├── user.factory.ts
        │   ├── transaction.factory.ts
        │   └── budget.factory.ts
        ├── unit/
        │   ├── transaction.service.test.ts
        │   ├── budget.service.test.ts
        │   └── budget-alert.service.test.ts
        └── integration/
            ├── auth.test.ts
            ├── transaction.test.ts
            └── budget.test.ts
```

---

## Layer responsibilities

| Layer           | Biết gì                                 | Không biết gì            |
| --------------- | --------------------------------------- | ------------------------ |
| `routes/`       | Endpoint path, method, middleware chain | Business logic           |
| `controllers/`  | `req`, `res`, gọi service               | SQL, DB                  |
| `services/`     | Business rules, gọi repo                | `req`, `res`, HTTP       |
| `repositories/` | SQL queries, DB schema                  | Business rules           |
| `middleware/`   | `req`, `res`, `next`                    | Domain logic             |
| `validators/`   | Input shape (Zod schema)                | Không gì cả ngoài schema |
| `utils/`        | Pure functions                          | Tất cả layer khác        |

---

## Request flow

```text
Incoming request
  → rate-limit.middleware
  → request-logger.middleware
  → auth.middleware          (nếu route protected)
  → validate.middleware      (chạy Zod schema)
  → controller               (gọi service)
  → service                  (business logic, gọi repo)
  → repository               (SQL → DB)
  ← repository               (raw rows)
  ← service                  (domain objects)
  ← controller               (gọi response helper)
  → error.middleware          (nếu có lỗi ở bất kỳ bước nào)
Outgoing response
```

---

## Build order

| Bước | Files                                                                            |
| ---- | -------------------------------------------------------------------------------- |
| 1    | `config/env.ts` → `config/logger.ts` → `db/client.ts`                            |
| 2    | `utils/AppError.ts` → `middleware/error.middleware.ts` → `utils/asyncHandler.ts` |
| 3    | Auth — validator → repo → service → controller → routes                          |
| 4    | Categories + Accounts — lookup đơn giản, transaction phụ thuộc                   |
| 5    | Transactions — feature lớn nhất, có split + budget trigger                       |
| 6    | Budgets + `budget-alert.service.ts`                                              |
| 7    | Notifications                                                                    |
| 8    | Receipts + AI integration                                                        |
