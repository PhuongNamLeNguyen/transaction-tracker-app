# Data Models

> TypeScript interfaces, enums, and DTOs for every entity in Transaction Tracker.
> Types live in `shared/types/` and are used across `backend/`, `frontend/`, and `ai-service/`.
> For underlying DB columns — see **database_schema.md**.
> For API request/response shapes in context — see **api_spec.md**.

---

## Table of Contents

- [1. Enums](#1-enums)
- [2. Core Entities](#2-core-entities)
- [3. Request DTOs](#3-request-dtos)
- [4. Response DTOs](#4-response-dtos)
- [5. AI Pipeline Types](#5-ai-pipeline-types)
- [6. Common Types](#6-common-types)

---

## 1. Enums

All constrained string fields in the DB map to these enums.

```typescript
export enum TransactionType {
  INCOME     = 'income',
  EXPENSE    = 'expense',
  INVESTMENT = 'investment',
  SAVING     = 'saving',
}

export enum TransactionStatus {
  PROCESSING = 'processing',
  READY      = 'ready',
  CONFIRMED  = 'confirmed',
}

export enum TransactionSource {
  MANUAL       = 'manual',
  RECEIPT_SCAN = 'receipt_scan',
}

export enum OcrStatus {
  PENDING    = 'pending',
  PROCESSING = 'processing',
  DONE       = 'done',
}

export enum CategoryType {
  INCOME     = 'income',
  EXPENSE    = 'expense',
  INVESTMENT = 'investment',
  SAVING     = 'saving',
}

export enum Theme {
  LIGHT = 'light',
  DARK  = 'dark',
}
```

---

## 2. Core Entities

DB rows mapped to camelCase. Optional joined fields (marked `?`) are present only when fetched with relations.

### User

```typescript
export interface User {
  id:         string
  email:      string
  isVerified: boolean
  createdAt:  string   // ISO 8601
  updatedAt:  string
}
// password_hash is never exposed outside the backend auth layer
```

### UserSettings

```typescript
export interface UserSettings {
  userId:         string
  theme:          Theme
  cycleStartDay:  string   // date string
  targetCurrency: string   // ISO 4217, e.g. 'JPY'
  systemLanguage: string   // BCP 47, e.g. 'en', 'vi'
  timeZone:       string   // IANA, e.g. 'Asia/Tokyo'
  createdAt:      string
  updatedAt:      string
}
```

### Account

```typescript
export interface Account {
  id:        string
  userId:    string
  name:      string
  type:      string   // 'cash' | 'bank' | 'wallet'
  currency:  string   // ISO 4217
  balance:   number
  createdAt: string
  updatedAt: string
}
```

### Transaction

```typescript
export interface Transaction {
  id:              string
  userId:          string
  accountId:       string
  type:            TransactionType
  amount:          number
  currency:        string
  merchantId:      string | null
  status:          TransactionStatus
  source:          TransactionSource
  transactionDate: string   // e.g. '2026-03-10'
  note:            string | null
  createdAt:       string
  updatedAt:       string
  splits?:         TransactionSplit[]
  receipt?:        Receipt | null
  merchant?:       Merchant | null
}
```

### TransactionSplit

```typescript
export interface TransactionSplit {
  id:            string
  transactionId: string
  categoryId:    string
  amount:        number
  createdAt:     string
  updatedAt:     string
  category?:     Category
}
```

### Merchant

```typescript
export interface Merchant {
  id:                string
  name:              string
  normalizedName:    string
  defaultCategoryId: string | null
  country:           string | null
  logoUrl:           string | null
  createdAt:         string
  updatedAt:         string
}

export interface MerchantAlias {
  id:         string
  merchantId: string
  aliasName:  string
  createdAt:  string
}
```

### Category

```typescript
export interface Category {
  id:        string
  name:      string
  type:      CategoryType
  icon:      string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryKeyword {
  id:         string
  categoryId: string
  keyword:    string
  createdAt:  string
}
```

### Receipt

```typescript
export interface Receipt {
  id:            string
  transactionId: string | null
  imageUrl:      string
  ocrStatus:     OcrStatus
  scanData:      Record<string, unknown> | null   // raw OCR JSON
  categoryId:    string | null
  merchantId:    string | null
  createdAt:     string
  updatedAt:     string
  items?:        ReceiptItem[]
}

export interface ReceiptItem {
  id:        string
  receiptId: string
  itemName:  string
  price:     number
  quantity:  number
}
```

### AiPrediction

```typescript
export interface AiPrediction {
  id:                  string
  receiptItemId:       string
  predictedCategoryId: string | null
  confidenceScore:     number   // 0–1
  modelVersion:        string
  createdAt:           string
}
```

### AiCorrection

```typescript
export interface AiCorrection {
  id:                string
  receiptId:         string
  fieldName:         string
  aiValue:           string
  correctedValue:    string
  correctedByUserId: string
  createdAt:         string
}
```

### BudgetPeriod & Budget

```typescript
export interface BudgetPeriod {
  id:        string
  userId:    string
  startDate: string
  endDate:   string
  createdAt: string
  budgets?:  Budget[]
}

export interface Budget {
  id:         string
  periodId:   string
  categoryId: string
  amount:     number
  currency:   string
  createdAt:  string
  category?:  Category
}
```

### ExchangeRate

```typescript
export interface ExchangeRate {
  id:             string
  baseCurrency:   string
  targetCurrency: string
  rate:           number
  updatedAt:      string
}
```

### Session

```typescript
// Internal to the backend auth layer — never exposed via API responses.
export interface Session {
  id:               string
  userId:           string
  refreshTokenHash: string
  deviceInfo:       string | null
  ipAddress:        string | null
  createdAt:        string
  expiredAt:        string
  revokedAt:        string | null
}
```

---

## 3. Request DTOs

All fields camelCase. Required/optional noted inline.

### Auth

```typescript
export interface RegisterDto {
  email:    string   // required
  password: string   // required, min 8 chars
}

export interface LoginDto {
  email:    string   // required
  password: string   // required
}
```

### Transaction - Request DTOs

```typescript
export interface CreateTransactionDto {
  type:            TransactionType      // required
  amount:          number               // required, > 0
  currency:        string               // required, ISO 4217
  accountId:       string               // required, uuid
  categoryId:      string               // required, uuid
  merchantId?:     string               // optional, uuid
  note?:           string
  transactionDate: string               // required, ISO 8601 date
  imageUrl?:       string
  items?:          CreateReceiptItemDto[]
}

export interface UpdateTransactionDto {
  type?:            TransactionType
  amount?:          number
  currency?:        string
  accountId?:       string
  categoryId?:      string
  merchantId?:      string
  note?:            string
  transactionDate?: string
}

export interface CreateTransactionSplitDto {
  categoryId: string   // required
  amount:     number   // required — splits must sum to transaction amount
}
```

### Account - Request DTOs

```typescript
export interface CreateAccountDto {
  name:     string   // required
  type:     string   // required
  currency: string   // required, ISO 4217
  balance?: number   // optional, defaults to 0
}

export interface UpdateAccountDto {
  name?:     string
  type?:     string
  currency?: string
}
```

### Receipt Request DTOs

```typescript
export interface ScanReceiptDto {
  transactionId: string   // required, uuid
}

export interface CreateReceiptItemDto {
  name:  string   // required
  qty:   number   // required
  price: number   // required
}
```

### Budget

```typescript
export interface CreateBudgetPeriodDto {
  startDate: string   // required, ISO 8601 date
  endDate:   string   // required, ISO 8601 date
}

export interface CreateBudgetDto {
  periodId:   string   // required
  categoryId: string   // required
  amount:     number   // required, > 0
  currency:   string   // required, ISO 4217
}
```

---

## 4. Response DTOs

All responses wrapped in a standard envelope.

```typescript
export interface ApiResponse<T> {
  success: true
  data:    T
}

export interface PaginatedResponse<T> {
  success: true
  data:    T[]
  meta: {
    page:       number
    limit:      number
    total:      number
    totalPages: number
  }
}

// Full error shape — see error_handling.md
export interface ApiErrorResponse {
  success: false
  error: {
    code:      string
    message:   string
    details?:  { field: string; issue: string }[]
    timestamp: string
  }
}
```

### Transaction response (with relations)

```typescript
export interface TransactionResponse extends Transaction {
  merchant: Pick<Merchant, 'id' | 'name' | 'logoUrl'> | null
  splits:   (TransactionSplit & { category: Pick<Category, 'id' | 'name' | 'icon'> })[]
}
```

---

## 5. AI Pipeline Types

### Extraction request

```typescript
export interface ExtractByUrlDto {
  imageUrl:        string            // required
  transactionType: TransactionType   // required
  options?: {
    language:     string             // e.g. 'en', 'vi'
    extractItems: boolean
  }
}
```

### TransactionSuggestion

Draft returned by the AI pipeline — not yet saved to DB. User must confirm before persisting. See **ai_receipt_pipeline.md**.

```typescript
export interface TransactionSuggestion {
  merchantName:    string | null
  totalAmount:     number
  currency:        string
  transactionDate: string
  aiSuggestedCategory: {
    id:         string | null   // null if no match found
    name:       string
    confidence: number          // 0–1
  } | null
  items: {
    name:  string
    qty:   number
    price: number
  }[]
}
```

---

## 6. Common Types

```typescript
// Attached to req by auth middleware — see auth_flow.md § 6
export interface AuthenticatedUser {
  id:         string
  email:      string
  isVerified: boolean
}

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser
    }
  }
}

export interface PaginationParams {
  page:  number   // default: 1
  limit: number   // default: 20
}

export interface DateRangeParams {
  startDate?: string   // ISO 8601
  endDate?:   string   // ISO 8601
}
```
