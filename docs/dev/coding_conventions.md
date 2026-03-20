# Coding Conventions

> Conventions for Transaction Tracker. All AI-generated and human-written code must follow these rules.

---

## 1. Language & Runtime

| Layer | Language | Runtime |
| --- | --- | --- |
| Backend | TypeScript (`"strict": true`) | Node.js v18+ |
| Frontend | TypeScript + React | Vite |
| AI Service | TypeScript | Node.js v18+ |
| Scripts | TypeScript | ts-node |

No plain `.js` files. `any` is forbidden — use `unknown` and narrow, or define a proper type.

---

## 2. Naming Conventions

| Context | Convention | Example |
| --- | --- | --- |
| Variables / functions | `camelCase` | `transactionDate`, `createTransaction` |
| Classes / interfaces / enums | `PascalCase` | `TransactionService`, `CreateTransactionDto` |
| Enum values | `UPPER_SNAKE_CASE` | `TransactionType.EXPENSE` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE` |
| React components / pages | `PascalCase` | `TransactionForm`, `DashboardPage` |
| Hooks | `camelCase` prefixed `use` | `useTransactions` |
| Backend files | `kebab-case` | `transaction.service.ts` |
| Frontend component files | `PascalCase` | `TransactionForm.tsx` |
| Frontend hook / type / util files | `camelCase` / `kebab-case` | `useAuth.ts`, `date-utils.ts` |

**DB ↔ Code:** DB columns use `snake_case`; TypeScript uses `camelCase`. Always map explicitly — never pass raw DB rows to API responses.

---

## 3. File & Folder Structure

### Backend (`backend/src/`)

```text
routes/       # Express route definitions — thin, no logic
controllers/  # Handle req/res — validate input, call service, return response
services/     # Business logic — DB queries, rules, orchestration
middleware/   # Auth, validation, error handling
types/        # Shared TS interfaces and DTOs
utils/        # Pure helper functions
```

### Frontend (`frontend/src/`)

```text
pages/        # One file per route/page
components/   # Reusable UI components
hooks/        # Custom React hooks
api/          # API call functions — one file per resource
types/        # Shared TS interfaces
utils/        # Utility functions
```

### Shared (`shared/`)

```text
types/        # Types shared between backend and frontend
constants/    # Shared constants (e.g. transaction types)
```

---

## 4. Backend Conventions

### Layer Responsibilities

| Layer | Does | Does NOT |
| --- | --- | --- |
| Route | Register path + method, apply middleware, call controller | Contain logic |
| Controller | Parse req, validate input, call service, return res | Query DB directly |
| Service | Business logic, DB queries, orchestration | Access `req`/`res` |
| Middleware | Auth, validation, error handling | Contain business logic |

### Patterns

```typescript
// Route
router.use(authenticate)
router.post('/', createTransaction)
router.get('/',  listTransactions)

// Controller
export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await transactionService.create(req.user.id, req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) { next(error) }
}

// Service
export const transactionService = {
  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> { ... },
  async findById(userId: string, id: string): Promise<Transaction | null> { ... },
  // always scope queries to userId
}
```

### Rules

- Every async route handler calls `next(error)` in the catch — never `res.status(500).json(...)` directly
- Services always scope DB queries to `user_id`
- DTOs are TypeScript interfaces, not classes
- No raw SQL string interpolation — always use parameterised queries

---

## 5. Frontend Conventions

```typescript
// Component pattern
interface Props { onSuccess: (id: string) => void }

export const TransactionForm = ({ onSuccess }: Props) => {
  // state and handlers
  return ( /* JSX */ )
}

// API call pattern
export const transactionsApi = {
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const res = await fetch(`${config.apiBaseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(dto),
    })
    if (!res.ok) throw await res.json()
    return res.json()
  }
}
```

### Rules - Frontend Conventions

- Props interfaces defined above the component, never inline
- No business logic in JSX — extract to handlers or hooks
- All API errors caught and shown to user — no silent failures
- No hardcoded API URLs — use `config.apiBaseUrl`

---

## 6. Database Conventions

- Table names: `snake_case`, plural (`transactions`, `receipt_items`)
- Column names: `snake_case` (`transaction_date`, `user_id`)
- Primary keys: `id uuid`
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `category_id`)
- Timestamps: `created_at`, `updated_at` (`timestamp with time zone`)
- Hard deletes only — no soft deletes
- Never expose `password_hash`, `token_hash`, or `refresh_token_hash` in API responses

---

## 7. API Conventions

- All endpoints prefixed `/api/v1`
- REST methods: `POST` create, `GET` read, `PUT` full update, `PATCH` partial, `DELETE` remove
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: { code, message, details?, timestamp } }`
- List endpoints support `page` and `limit` query params
- Dates: ISO 8601 strings (`2026-03-10T10:15:00Z`)
- Currency: integers in smallest unit (yen/cents) — never floats

---

## 8. General Code Style

- No `console.log` in committed code — use a logger
- No commented-out code — delete it; use git history if needed
- One responsibility per function — split if it needs two paragraphs of comments
- No magic numbers — extract to named constants
- Import order: external packages → internal modules → types
- All exports in `shared/` must have a JSDoc comment
