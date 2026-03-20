# Error Handling

> How errors are produced, propagated, and returned across the backend. All error responses share a single consistent shape. For the full error code list see **api_spec.md § 5**.

---

## 1. Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Transaction amount must be greater than zero",
    "details": [{ "field": "amount", "issue": "must_be_greater_than_zero" }],
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

- `code` — machine-readable constant used by the frontend
- `message` — human-readable English string, safe to display
- `details` — optional array, present only on `VALIDATION_ERROR`
- `timestamp` — ISO 8601 UTC

---

## 2. AppError Class

```typescript
// backend/src/utils/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code:       string,
    public readonly message:    string,
    public readonly httpStatus: number,
    public readonly details?:   { field: string; issue: string }[]
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Usage
throw new AppError('RESOURCE_NOT_FOUND', 'Transaction not found', 404)
throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, [
  { field: 'amount', issue: 'must_be_greater_than_zero' }
])
```

---

## 3. Error Codes & HTTP Status Map

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | One or more fields failed validation |
| `MISSING_PARAMETERS` | 400 | A required field is absent |
| `INVALID_IMAGE_FORMAT` | 400 | Unsupported file type |
| `AI_PROCESSING_FAILED` | 400 | OCR or LLM returned an error |
| `AI_IMAGE_TOO_BLURRY` | 400 | Image quality too low to parse |
| `AI_NOT_A_RECEIPT` | 400 | Image is not a receipt |
| `UNAUTHORIZED` | 401 | JWT missing, invalid, or expired |
| `EMAIL_NOT_VERIFIED` | 403 | Account exists but email unconfirmed |
| `RESOURCE_NOT_FOUND` | 404 | Record does not exist |
| `ROUTE_NOT_FOUND` | 404 | No route matched |
| `AI_LIMIT_REACHED` | 429 | OpenAI quota exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled exception |
| `DATABASE_CONNECTION_ERROR` | 500 | PostgreSQL unreachable |
| `THIRD_PARTY_ERROR` | 502 | Upstream service unavailable |

---

## 4. Global Error Middleware

Catches all errors forwarded via `next(error)` and formats them into the standard response shape. Registered last in `app.ts`, after all routes.

```typescript
// backend/src/middleware/error.middleware.ts
export const errorMiddleware = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details, timestamp: new Date().toISOString() },
    })
  }
  console.error('[Unhandled error]', err)
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'System error, please try again', timestamp: new Date().toISOString() },
  })
}
```

---

## 5. Throwing Errors in Services

Services throw `AppError` directly. They never touch `req`/`res` or set HTTP status codes.

```typescript
// transaction.service.ts
async findById(userId: string, id: string): Promise<Transaction> {
  const row = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, userId])
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Transaction not found', 404)
  return mapToTransaction(row)
}

// Wrap DB/third-party failures
try {
  await db.query(...)
} catch {
  throw new AppError('DATABASE_CONNECTION_ERROR', 'Cannot connect to database', 500)
}
```

---

## 6. Validation Middleware

Runs before the controller. Any invalid field throws `VALIDATION_ERROR` with a `details` array.

```typescript
// middleware/validate.middleware.ts
type Rule = { field: string; check: (v: unknown) => boolean; issue: string }

export const validate = (rules: Rule[]) => (req: Request, res: Response, next: NextFunction) => {
  const errors = rules
    .filter(({ field, check }) => !check(req.body[field]))
    .map(({ field, issue }) => ({ field, issue }))
  if (errors.length > 0) throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, errors)
  next()
}

// Usage in route
router.post(
  '/',
  authenticate,
  validate([
    { field: 'amount',          check: v => typeof v === 'number' && v > 0, issue: 'must_be_greater_than_zero' },
    { field: 'type',            check: v => Object.values(TransactionType).includes(v as TransactionType), issue: 'invalid_transaction_type' },
    { field: 'accountId',       check: v => typeof v === 'string' && v.length > 0, issue: 'required' },
    { field: 'transactionDate', check: v => typeof v === 'string' && !isNaN(Date.parse(v as string)), issue: 'invalid_date_format' },
  ]),
  createTransaction
)
```

---

## 7. Controller Pattern

Controllers delegate to services and always forward errors via `next(error)`.

```typescript
export const getTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.findById(req.user.id, req.params.id)
    res.json({ success: true, data: transaction })
  } catch (error) {
    next(error)
  }
}
```

Never respond with an error directly — always use `next(error)`.

---

## 8. Frontend Error Handling

```typescript
// api/transactions.api.ts
export const createTransaction = async (dto: CreateTransactionDto) => {
  const res = await fetch('/api/v1/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw await res.json()  // throw the full error object
  return res.json()
}

// In components — handle by error.code
try {
  await createTransaction(dto)
} catch (err) {
  const error = err as ApiErrorResponse
  if (error.error.code === 'VALIDATION_ERROR') setFieldErrors(error.error.details ?? [])
  else if (error.error.code === 'UNAUTHORIZED')  router.push('/login')
  else                                            showToast(error.error.message)
}
```

---

## 9. Rules

- Every error in the backend must be an `AppError` — never throw raw `Error` objects
- Every async controller body must be wrapped in `try/catch` with `next(error)` in the catch
- Never return a non-standard error shape
- Never expose stack traces or raw DB errors in responses — log server-side only
- `details` array is included only on `VALIDATION_ERROR`
- Error messages are in English — no localised strings in backend responses
- Frontend must handle errors by `error.code`, not HTTP status alone
