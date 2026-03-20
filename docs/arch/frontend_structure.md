# Frontend Structure

> Architecture, patterns, and conventions for the React frontend.
> For TypeScript types — see **data_models.md**.
> For API endpoints being called — see **api_spec.md**.
> For coding conventions — see **coding_conventions.md**.
> For auth token lifecycle — see **auth_flow.md**.

---

## Table of Contents

- [Frontend Structure](#frontend-structure)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Folder Structure](#2-folder-structure)
  - [3. Pages](#3-pages)
  - [4. Component Hierarchy](#4-component-hierarchy)
  - [5. Routing](#5-routing)
  - [6. State Management](#6-state-management)
  - [7. API Layer](#7-api-layer)
  - [8. Custom Hooks](#8-custom-hooks)
  - [9. Auth in the Frontend](#9-auth-in-the-frontend)
  - [10. Forms](#10-forms)
  - [11. Error Handling](#11-error-handling)
  - [12. Utilities](#12-utilities)

---

## 1. Overview

React + TypeScript SPA built with Vite. Communicates with the backend exclusively via REST. No server-side rendering.

| Concern | Approach |
| --- | --- |
| Language | TypeScript (strict) |
| Build tool | Vite |
| Component model | Functional components + hooks |
| State | `useState` + custom hooks — no global state library |
| API calls | Fetch-based `api/` layer, called from hooks only |
| Routing | React Router v6 |
| Forms | Controlled components with local state |

---

## 2. Folder Structure

```text
frontend/src/
├── pages/               # One file per route — thin, compose components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── TransactionDetailPage.tsx
│   ├── AccountsPage.tsx
│   ├── BudgetsPage.tsx
│   └── SettingsPage.tsx
│
├── components/          # Reusable UI — grouped by domain
│   ├── transaction/
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionItem.tsx
│   │   └── TransactionSplitEditor.tsx
│   ├── receipt/
│   │   ├── ReceiptUploader.tsx
│   │   └── ReceiptScanReview.tsx
│   ├── budget/
│   │   ├── BudgetCard.tsx
│   │   └── BudgetProgress.tsx
│   ├── dashboard/
│   │   ├── SummaryCards.tsx
│   │   └── CategoryPieChart.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── ErrorMessage.tsx
│       ├── LoadingSpinner.tsx
│       └── CategoryBadge.tsx
│
├── hooks/               # Custom hooks — data fetching and shared logic
│   ├── useAuth.ts
│   ├── useTransactions.ts
│   ├── useAccounts.ts
│   ├── useCategories.ts
│   ├── useBudgets.ts
│   └── useReceiptScan.ts
│
├── api/                 # HTTP calls — one file per backend resource
│   ├── auth.api.ts
│   ├── transactions.api.ts
│   ├── accounts.api.ts
│   ├── receipts.api.ts
│   ├── budgets.api.ts
│   └── categories.api.ts
│
├── utils/               # Pure helpers, no side effects
│   ├── currency-utils.ts
│   ├── date-utils.ts
│   └── token-utils.ts
│
├── types/               # Frontend-local types (prefer shared/)
├── router.tsx           # Route definitions
├── App.tsx              # Root — wraps router and global providers
└── main.tsx             # Vite entry point
```

---

## 3. Pages

Pages are thin — compose components, call hooks for data, handle top-level loading and error states. No business logic in pages.

| Page | Route | Purpose |
| --- | --- | --- |
| `LoginPage` | `/login` | Email + password login |
| `RegisterPage` | `/register` | Registration + email verification prompt |
| `DashboardPage` | `/` | Summary cards + category pie chart |
| `TransactionsPage` | `/transactions` | List + create transaction |
| `TransactionDetailPage` | `/transactions/:id` | View, edit, delete one transaction |
| `AccountsPage` | `/accounts` | List + manage accounts |
| `BudgetsPage` | `/budgets` | Budget periods + allocations |
| `SettingsPage` | `/settings` | User preferences (theme, currency, etc.) |

```typescript
// Pattern — pages/TransactionsPage.tsx
export const TransactionsPage = () => {
  const { transactions, isLoading, error, refetch } = useTransactions()
  if (isLoading) return <LoadingSpinner />
  if (error)     return <ErrorMessage message={error.message} />
  return (
    <>
      <TransactionForm onSuccess={refetch} />
      <TransactionList transactions={transactions} />
    </>
  )
}
```

---

## 4. Component Hierarchy

Components are grouped by domain inside `components/`, mirroring backend modules. Rules:

- Components receive data via props — they never call `api/` directly
- Only pages and hooks call the API layer
- `common/` components are fully generic — no domain-specific logic

**Key components:**

**`TransactionForm`** — controlled form for create and edit. Accepts optional `initialValues` prop. Calls `onSuccess(id)` after save.

**`TransactionSplitEditor`** — child of `TransactionForm`. Manages split list, validates amounts sum to transaction total, emits splits array via `onChange`.

**`ReceiptUploader`** — handles file selection, calls `POST /receipts/upload` then `POST /ai/extract-by-url`, returns `TransactionSuggestion` via `onSuggestion(suggestion)`.

**`ReceiptScanReview`** — receives a `TransactionSuggestion`, renders an editable pre-filled form. On confirm, calls `onConfirm(dto)` which triggers `POST /transactions`.

**`CategoryPieChart`** — renders expense distribution chart. Receives pre-aggregated `{ categoryName, amount }[]` — aggregation happens in the hook, not here.

**`BudgetProgress`** — progress bar of spending vs budget for one category. Receives `{ budgetAmount, spentAmount, currency }` as props.

---

## 5. Routing

React Router v6. `/login` and `/register` are public. All other routes are wrapped in `ProtectedRoute`.

```typescript
// router.tsx
export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,   // redirects to /login if no valid token
    children: [
      { path: '/',                 element: <DashboardPage /> },
      { path: '/transactions',     element: <TransactionsPage /> },
      { path: '/transactions/:id', element: <TransactionDetailPage /> },
      { path: '/accounts',         element: <AccountsPage /> },
      { path: '/budgets',          element: <BudgetsPage /> },
      { path: '/settings',         element: <SettingsPage /> },
    ],
  },
])
```

`ProtectedRoute` reads the access token from memory. If absent, redirects to `/login` without calling the backend.

---

## 6. State Management

No global state library. State at two levels:

| Level | Tool | Used for |
| --- | --- | --- |
| Component state | `useState` | Form fields, UI toggles, modal open/close |
| Server state | Custom hooks (`useState` + `useEffect`) | Fetched data, loading, error |

All data-fetching hooks expose the same shape: `{ data, isLoading, error, refetch }`.

```typescript
// Pattern — hooks/useTransactions.ts
export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState<ApiErrorResponse | null>(null)

  const fetch = async () => {
    setIsLoading(true); setError(null)
    try {
      setTransactions(await transactionsApi.list())
    } catch (err) {
      setError(err as ApiErrorResponse)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])
  return { transactions, isLoading, error, refetch: fetch }
}
```

---

## 7. API Layer

All HTTP calls are in `api/` — one file per backend resource. No `fetch` calls anywhere else in the codebase.

Rules:

- Every API function throws the full `ApiErrorResponse` on failure — never just a string
- `Authorization` header attached on every call via `getToken()` — never hardcoded
- API files have no UI imports and no React dependencies
- Response bodies unwrapped at this layer — `.data` is returned, not the full envelope

```typescript
// Pattern — api/transactions.api.ts
const BASE    = '/api/v1'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${getToken()}`,
})

export const transactionsApi = {
  async list(): Promise<Transaction[]> {
    const res = await fetch(`${BASE}/transactions`, { headers: headers() })
    if (!res.ok) throw await res.json()
    const body: PaginatedResponse<Transaction> = await res.json()
    return body.data
  },
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const res = await fetch(`${BASE}/transactions`, {
      method: 'POST', headers: headers(), body: JSON.stringify(dto),
    })
    if (!res.ok) throw await res.json()
    return (await res.json()).data
  },
  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/transactions/${id}`, { method: 'DELETE', headers: headers() })
    if (!res.ok) throw await res.json()
  },
}
```

---

## 8. Custom Hooks

| Hook | Returns | Purpose |
| --- | --- | --- |
| `useAuth` | `{ user, isLoading, login, logout, register }` | Auth state and actions |
| `useTransactions` | `{ transactions, isLoading, error, refetch }` | Transaction list |
| `useAccounts` | `{ accounts, isLoading, error, refetch }` | Account list |
| `useCategories` | `{ categories, isLoading, error }` | Category list (rarely changes) |
| `useBudgets` | `{ periods, isLoading, error, refetch }` | Budget periods + budgets |
| `useReceiptScan` | `{ scan, suggestion, isScanning, error, reset }` | Receipt upload + AI scan state |

`useReceiptScan` encapsulates the multi-step receipt flow — upload → extract → return `TransactionSuggestion`. See **ai_receipt_pipeline.md**.

```typescript
export const useReceiptScan = () => {
  const [suggestion, setSuggestion] = useState<TransactionSuggestion | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError]           = useState<ApiErrorResponse | null>(null)

  const scan = async (file: File, transactionType: TransactionType) => {
    setIsScanning(true); setError(null)
    try {
      const { imageUrl } = await receiptsApi.upload(file)
      setSuggestion(await receiptsApi.extractByUrl({ imageUrl, transactionType }))
    } catch (err) {
      setError(err as ApiErrorResponse)
    } finally {
      setIsScanning(false)
    }
  }

  const reset = () => { setSuggestion(null); setError(null) }
  return { scan, suggestion, isScanning, error, reset }
}
```

---

## 9. Auth in the Frontend

See **auth_flow.md** for the full token lifecycle. Frontend responsibilities:

- Access token stored **in memory only** — never `localStorage` or `sessionStorage`
- Refresh token is in an `HttpOnly` cookie — the frontend never reads it directly
- On app load, `useAuth` attempts a silent refresh via `POST /auth/refresh` — success stores a new access token in memory; failure redirects to `/login`
- `ProtectedRoute` checks `getToken()` — if null, redirects to `/login`
- On any `401` response, `useAuth` calls `logout()` and redirects to `/login`

```typescript
// utils/token-utils.ts — in-memory access token store
let _token: string | null = null
export const setToken   = (token: string) => { _token = token }
export const getToken   = ()              => _token
export const clearToken = ()             => { _token = null }
```

---

## 10. Forms

Controlled components with local `useState`. No form library.

- Client-side validation runs on submit, before the API call
- Field errors stored as `Record<string, string>` — key = field name, value = error message
- On `VALIDATION_ERROR` from API, `error.details` mapped to per-field inline errors
- Submit button disabled while `isSubmitting` to prevent double submission

```typescript
// Pattern
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
const [isSubmitting, setIsSubmitting] = useState(false)

const handleSubmit = async () => {
  setIsSubmitting(true)
  try {
    await transactionsApi.create(form)
    onSuccess()
  } catch (err) {
    const e = err as ApiErrorResponse
    if (e.error.code === 'VALIDATION_ERROR' && e.error.details) {
      setFieldErrors(Object.fromEntries(e.error.details.map(d => [d.field, d.issue])))
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

---

## 11. Error Handling

- Every API call wrapped in try/catch — no silent failures
- Errors handled by `error.error.code` — see **error_handling.md** for full code list
- `401 UNAUTHORIZED` → call `logout()`, redirect to `/login`
- `VALIDATION_ERROR` → map `details` to per-field inline errors
- All other errors → show generic `<ErrorMessage>`
- Loading and error states always surfaced — never left blank

---

## 12. Utilities

**`currency-utils.ts`**

```typescript
export const formatCurrency  = (amount: number, currency: string, locale = 'en') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

export const convertCurrency = (amount: number, rate: number) =>
  Math.round(amount * rate)
```

**`date-utils.ts`**

```typescript
export const formatDate = (iso: string, locale = 'en') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))

export const todayIso = () => new Date().toISOString().split('T')[0]
```

**`token-utils.ts`** — in-memory access token store. See [Section 9](#9-auth-in-the-frontend).
