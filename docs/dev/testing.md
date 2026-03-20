# Testing

> Testing strategy for Transaction Tracker. For business rules see **business_rules.md**. For error shapes see **error_handling.md**.

---

## 1. Philosophy

- Test **behaviour**, not implementation — assert on inputs/outputs, not internal calls
- Tests are **independent** — no shared mutable state between tests
- Prefer **integration tests** for services (real test DB) over mocking the DB layer
- Use **unit tests** for pure logic: validation, utilities, calculations
- Use **component tests** for UI: render, user events, error states

---

## 2. Tech Stack

| Layer | Framework |
| --- | --- |
| Backend unit + integration | Vitest + test database |
| Frontend components + hooks | React Testing Library + Vitest |
| API mocking (frontend) | MSW (Mock Service Worker) |

---

## 3. Folder Structure

Tests live alongside source files using `.test.ts` / `.test.tsx` suffixes.

```text
backend/src/
├── services/     transaction.service.test.ts      ← integration (real DB)
├── controllers/  transaction.controller.test.ts   ← unit (mocked service)
├── middleware/   auth.middleware.test.ts           ← unit
└── utils/        currency-utils.test.ts            ← unit

frontend/src/
├── components/   TransactionForm.test.tsx          ← component
└── hooks/        useTransactions.test.ts           ← hook + MSW

shared/utils/     date-utils.test.ts                ← unit
```

---

## 4. Backend — Unit Tests

Unit tests cover pure functions and middleware with no database dependency.

```typescript
// currency-utils.test.ts
describe('convertCurrency', () => {
  it('converts amount using rate', () => expect(convertCurrency(1000, 0.0067)).toBe(7))
  it('rounds to nearest integer',  () => expect(convertCurrency(100, 1.555)).toBe(156))
  it('returns 0 for zero amount',  () => expect(convertCurrency(0, 1.5)).toBe(0))
})

// auth.middleware.test.ts
describe('authenticate middleware', () => {
  it('throws UNAUTHORIZED when header is missing', () => {
    expect(() => authenticate({ headers: {} } as any, {} as any, vi.fn())).toThrow('UNAUTHORIZED')
  })
  it('attaches user to req when token is valid', () => {
    const token = jwt.sign({ sub: 'user-123', email: 'a@b.com', isVerified: true }, 'test-secret', { expiresIn: '15m' })
    process.env.JWT_SECRET = 'test-secret'
    const req = { headers: { authorization: `Bearer ${token}` } } as any
    const next = vi.fn()
    authenticate(req, {} as any, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.user.id).toBe('user-123')
  })
  it('throws UNAUTHORIZED when token is expired', () => {
    const token = jwt.sign({ sub: 'u1' }, 'test-secret', { expiresIn: '-1s' })
    expect(() => authenticate({ headers: { authorization: `Bearer ${token}` } } as any, {} as any, vi.fn())).toThrow('UNAUTHORIZED')
  })
})
```

---

## 5. Backend — Integration Tests

Run against `tracker_test` DB. Each test file runs migrations; each test uses `beforeEach(resetDb)`.

```typescript
// test/setup.ts
export const setup    = async () => { await db.query('SET client_min_messages TO WARNING'); await runMigrations() }
export const teardown = async () => { await db.end() }

// test/helpers/reset-db.ts
export const resetDb = async () => {
  await db.query(`
    TRUNCATE TABLE
      ai_corrections, ai_predictions, receipt_items, receipts,
      transaction_splits, transactions, budgets, budget_periods,
      sessions, verification_tokens, password_reset_tokens,
      accounts, user_settings, users
    RESTART IDENTITY CASCADE
  `)
}
```

```typescript
// transaction.service.test.ts
describe('transactionService.create', () => {
  beforeEach(resetDb)

  it('creates confirmed transaction and updates account balance', async () => {
    const user    = await createUser()
    const account = await createAccount(user.id, { balance: 10000, currency: 'JPY' })
    const cat     = await createCategory({ type: 'expense' })
    const tx      = await transactionService.create(user.id, {
      type: TransactionType.EXPENSE, amount: 3000, currency: 'JPY',
      accountId: account.id, categoryId: cat.id, transactionDate: '2026-03-10',
    })
    expect(tx.status).toBe('confirmed')
    expect(tx.source).toBe('manual')
    expect((await accountService.findById(user.id, account.id)).balance).toBe(7000)
  })

  it('throws VALIDATION_ERROR when amount is zero', async () => {
    const { id: userId } = await createUser()
    const account = await createAccount(userId)
    const cat     = await createCategory({ type: 'expense' })
    await expect(
      transactionService.create(userId, {
        type: TransactionType.EXPENSE, amount: 0, currency: 'JPY',
        accountId: account.id, categoryId: cat.id, transactionDate: '2026-03-10',
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws RESOURCE_NOT_FOUND when accountId belongs to another user', async () => {
    const userA   = await createUser()
    const userB   = await createUser()
    const account = await createAccount(userB.id)
    const cat     = await createCategory({ type: 'expense' })
    await expect(
      transactionService.create(userA.id, {
        type: TransactionType.EXPENSE, amount: 1000, currency: 'JPY',
        accountId: account.id, categoryId: cat.id, transactionDate: '2026-03-10',
      })
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' })
  })
})

describe('transactionService.delete', () => {
  beforeEach(resetDb)

  it('reverses account balance on deletion', async () => {
    const user    = await createUser()
    const account = await createAccount(user.id, { balance: 10000 })
    const cat     = await createCategory({ type: 'expense' })
    const tx      = await transactionService.create(user.id, {
      type: TransactionType.EXPENSE, amount: 3000, currency: 'JPY',
      accountId: account.id, categoryId: cat.id, transactionDate: '2026-03-10',
    })
    await transactionService.delete(user.id, tx.id)
    expect((await accountService.findById(user.id, account.id)).balance).toBe(10000)
  })

  it('unlinks receipt but does not delete it', async () => {
    // receipt.transaction_id → null; receipt record persists
  })
})
```

---

## 6. Frontend — Component Tests

```typescript
// TransactionForm.test.tsx
describe('TransactionForm', () => {
  it('renders all required fields', () => {
    render(<TransactionForm onSuccess={vi.fn()} />)
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows inline error when amount is zero on submit', async () => {
    render(<TransactionForm onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/must be greater than zero/i)).toBeInTheDocument())
  })

  it('disables submit button while submitting', () => {
    render(<TransactionForm onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('calls onSuccess with transaction id after successful save', async () => {
    const onSuccess = vi.fn()
    render(<TransactionForm onSuccess={onSuccess} />)
    // fill fields + MSW intercepts POST /api/v1/transactions
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.any(String)))
  })

  it('maps VALIDATION_ERROR details to per-field errors', async () => {
    // MSW returns VALIDATION_ERROR with details: [{ field: 'amount', issue: 'must_be_greater_than_zero' }]
    render(<TransactionForm onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/must_be_greater_than_zero/i)).toBeInTheDocument())
  })
})
```

---

## 7. Frontend — Hook Tests

```typescript
// useTransactions.test.ts
describe('useTransactions', () => {
  it('fetches and returns transactions', async () => {
    server.use(http.get('/api/v1/transactions', () =>
      HttpResponse.json({ success: true, data: [{ id: 'tx-1', amount: 1000 }], meta: {} })
    ))
    const { result } = renderHook(() => useTransactions())
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('sets error on API failure', async () => {
    server.use(http.get('/api/v1/transactions', () =>
      HttpResponse.json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error', timestamp: '' } }, { status: 500 })
    ))
    const { result } = renderHook(() => useTransactions())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error?.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})

// test/msw/server.ts
export const server = setupServer()

// test/msw/setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## 8. Test Data & Factories

Factories create valid DB records with sensible defaults — override only what the test cares about.

```typescript
// test/factories/index.ts
let _counter = 0
const uid = () => `test-${++_counter}-${Date.now()}`

export const createUser = async (overrides: Partial<{ email: string; password: string; isVerified: boolean }> = {}) => {
  const { rows: [user] } = await db.query(
    `INSERT INTO users (id, email, password_hash, is_verified) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
    [overrides.email ?? `user-${uid()}@test.com`, await hashPassword(overrides.password ?? 'password123'), overrides.isVerified ?? true]
  )
  return user
}

export const createAccount = async (userId: string, overrides: Partial<{ name: string; type: string; currency: string; balance: number }> = {}) => {
  const { rows: [account] } = await db.query(
    `INSERT INTO accounts (id, user_id, name, type, currency, balance) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING *`,
    [userId, overrides.name ?? 'Test Account', overrides.type ?? 'bank', overrides.currency ?? 'JPY', overrides.balance ?? 0]
  )
  return account
}

export const createCategory = async (overrides: Partial<{ name: string; type: string }> = {}) => {
  const { rows: [cat] } = await db.query(
    `INSERT INTO categories (id, name, type) VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
    [overrides.name ?? 'Test Category', overrides.type ?? 'expense']
  )
  return cat
}
```

---

## 9. Key Test Cases by Domain

### Transactions

- Creates with `status: confirmed`, `source: manual`
- Rejects `amount ≤ 0` → `VALIDATION_ERROR`
- Rejects invalid `type` → `VALIDATION_ERROR`
- Rejects `accountId` from another user → `RESOURCE_NOT_FOUND`
- Rejects `categoryId` type mismatch
- Balance updates correctly per transaction type (income adds; expense/investment/saving subtracts)
- Deletion reverses balance and unlinks (not deletes) the receipt
- Status cannot move backwards

### Transaction Splits

- Rejects splits where sum ≠ transaction amount
- Rejects split with category type mismatch
- Replaces all splits wholesale on update

### Accounts

- Balance updates correctly on create, update, delete of linked transactions
- Moving a transaction reverses old balance and applies to new balance
- Deletion blocked when confirmed transactions exist → `ACCOUNT_HAS_TRANSACTIONS`

### Auth

- Registration rejects duplicate email
- Login rejects unverified account → `EMAIL_NOT_VERIFIED`
- Login rejects wrong password → `UNAUTHORIZED`
- Access token contains correct `sub`, `email`, `isVerified`
- Expired token → `UNAUTHORIZED`
- Refresh rotates session (old revoked, new created)
- Password reset revokes all existing sessions

### Receipts & AI

- Receipt created with `ocr_status: pending` at upload
- Cannot link two receipts to the same transaction
- Cannot re-scan a receipt with `ocr_status: processing`
- AI corrections saved even when user reverts to original value
- Predictions with confidence < 0.70 → `predicted_category_id: null`

### Budgets

- Rejects overlapping budget periods for the same user
- Rejects duplicate category within the same period
- Rejects `startDate ≥ endDate`

### Data Scoping

- User cannot read/update/delete another user's transactions, accounts, or budgets

---

## 10. Running Tests

```bash
cd backend  && npm test                                              # all backend
cd frontend && npm test                                              # all frontend
cd backend  && npm run test:coverage                                 # with coverage
npx vitest run src/services/transaction.service.test.ts              # single file
npx vitest                                                           # watch mode
```

Tests require `.env.test`. See **environment_configs.md § 3**. Never run tests against `tracker_dev` or production.

---

## 11. Coverage Targets

| Layer | Target |
| --- | --- |
| Services (business logic) | 90%+ |
| Middleware (auth, validation) | 90%+ |
| Controllers | 70%+ |
| Utilities (pure functions) | 100% |
| Frontend components | 70%+ |
| Frontend hooks | 80%+ |

---

## 12. Rules

- `beforeEach(resetDb)` in every integration test — no shared mutable state
- Never mock the DB in service integration tests
- Never test implementation details — only observable inputs/outputs
- Every business rule must have a passing test and a rejection test
- Test file names mirror source: `transaction.service.ts` → `transaction.service.test.ts`
- Factories only for test data — no raw SQL inserts in test bodies
- MSW handlers reset after every frontend test — no handler leakage
- `console.error` in tests = unhandled error — treat as failure
