# API Specification

> For setup, environment variables, and base project info see **README.md**.

---

## Table of Contents

- [API Specification](#api-specification)
  - [Table of Contents](#table-of-contents)
  - [1. General Information](#1-general-information)
  - [2. Authentication Flow](#2-authentication-flow)
  - [3. Endpoints](#3-endpoints)
    - [3.1 AI Scanning](#31-ai-scanning)
    - [3.2 Transactions](#32-transactions)
    - [3.3 Receipts](#33-receipts)
  - [4. Data Schemas](#4-data-schemas)
    - [TransactionSuggestion](#transactionsuggestion)
  - [5. Error Codes](#5-error-codes)
    - [400 — Bad Request](#400--bad-request)
    - [401 \& 403 — Auth Errors](#401--403--auth-errors)
    - [404 — Not Found](#404--not-found)
    - [429 — Rate Limit](#429--rate-limit)
    - [400 — AI-Specific](#400--ai-specific)
    - [500 / 502 — Server Errors](#500--502--server-errors)
  - [6. Error Response Format](#6-error-response-format)
  - [7. Implementation Notes](#7-implementation-notes)

---

## 1. General Information

| Property | Value |
| --- | --- |
| Base URL | `http://localhost:3000/api/v1` (configurable via `PORT` in `.env`) |
| Authentication | Bearer Token (JWT) via `Authorization` header |
| Default response format | `application/json` |

---

## 2. Authentication Flow

JWT is issued by the backend upon login and verified on every protected request using `JWT_SECRET`.

| Method | Endpoint | Auth required | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Register a new account and send verification email |
| POST | `/auth/login` | No | Login and receive a JWT |
| POST | `/auth/verify-status` | No | Check email verification status |

**Flow:**

```text
Client submits credentials → Backend verifies → JWT issued → Client sends JWT in Authorization header → Backend validates on each request
```

All endpoints under `/transactions`, `/receipts`, and `/ai` are JWT-protected.

---

## 3. Endpoints

### 3.1 AI Scanning

Receipt image processing and structured data extraction.

**A. Extract from URL** `POST /ai/extract-by-url`

Use after the client has uploaded an image and has a URL available.

Request body:

```json
{
  "image_url": "string (required)",
  "transaction_type": "expense | income | investment | saving",
  "options": {
    "language": "en",
    "extract_items": true
  }
}
```

Success response `200 OK` — returns a `TransactionSuggestion` object (see [Section 4](#4-data-schemas)).

---

**B. Extract from File** `POST /ai/extract-receipt`

Use for direct file upload without a pre-existing URL.

- Content-Type: `multipart/form-data`
- Body fields: `file` (binary), `transaction_type` (string)

Success response `200 OK` — returns a `TransactionSuggestion` object (see [Section 4](#4-data-schemas)).

---

### 3.2 Transactions

Manage transactions after user confirmation or manual entry.

**A. Create Transaction** `POST /transactions`

Saves a confirmed transaction to the database.

Request body:

```json
{
  "type": "expense | income | investment | saving",
  "amount": 85000,
  "currency": "JPY",
  "category_id": "uuid (required)",
  "account_id": "uuid (required)",
  "merchant_id": "uuid (optional)",
  "note": "string (optional)",
  "transaction_date": "ISO8601 date (required)",
  "image_url": "string (optional)",
  "items": [
    { "name": "string", "qty": 1, "price": 85000 }
  ]
}
```

Success response `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "expense",
    "amount": 85000,
    "currency": "JPY",
    "status": "confirmed",
    "transaction_date": "2026-03-10T10:15:00Z"
  }
}
```

---

**B. List Transactions** `GET /transactions`

| Param | Type | Description |
| --- | --- | --- |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |
| `start_date` | ISO8601 date | Filter from date |
| `end_date` | ISO8601 date | Filter to date |

---

**C. Get Transaction** `GET /transactions/:id`

Returns a single transaction record by ID.

---

**D. Update Transaction** `PUT /transactions/:id`

Request body: same fields as Create (all optional — send only fields to update).

---

**E. Delete Transaction** `DELETE /transactions/:id`

Success response `204 No Content`.

---

### 3.3 Receipts

**A. Upload Image** `POST /receipts/upload`

- Content-Type: `multipart/form-data`
- Body: `file` (binary)

Returns `image_url` for use with `/ai/extract-by-url`.

---

**B. Scan Receipt** `POST /receipts/scan`

Trigger OCR + LLM parsing on an already-uploaded receipt tied to a transaction.

Request body:

```json
{
  "transaction_id": "uuid (required)"
}
```

Success response `200 OK` — returns updated receipt with `ocr_status: "done"` and populated `scan_data`.

---

## 4. Data Schemas

### TransactionSuggestion

Returned by AI scanning endpoints. Used to pre-fill the transaction form for user confirmation before saving.

```json
{
  "merchant_name": "string",
  "total_amount": 85000,
  "currency": "JPY",
  "transaction_date": "2026-03-10T10:15:00Z",
  "ai_suggested_category": {
    "id": "uuid | null",
    "name": "Food & Beverage",
    "confidence": 0.98
  },
  "items": [
    { "name": "string", "qty": 1, "price": 85000 }
  ]
}
```

> Note: This is a draft only. The transaction is not saved to the database until the user confirms and `POST /transactions` is called.

---

## 5. Error Codes

### 400 — Bad Request

| Code | Message | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | Invalid field value | Invalid amount, wrong date format |
| `MISSING_PARAMETERS` | Missing required parameter | `amount` or `category_id` absent |
| `INVALID_IMAGE_FORMAT` | Invalid image format | Unsupported file type uploaded |
| `AI_PROCESSING_FAILED` | AI processing failed | AI could not parse the image |

### 401 & 403 — Auth Errors

| Code | HTTP | Message | When |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | 401 | Token not found or invalid | Missing or expired JWT |
| `EMAIL_NOT_VERIFIED` | 403 | Email not verified | Account exists but email unconfirmed |

### 404 — Not Found

| Code | Message | When |
| --- | --- | --- |
| `RESOURCE_NOT_FOUND` | Requested resource not found | Invalid or deleted ID |
| `ROUTE_NOT_FOUND` | Endpoint does not exist | Wrong API path |

### 429 — Rate Limit

| Code | Message | When |
| --- | --- | --- |
| `AI_LIMIT_REACHED` | AI usage limit reached | Free tier quota exceeded |

### 400 — AI-Specific

| Code | Message | When |
| --- | --- | --- |
| `AI_IMAGE_TOO_BLURRY` | Image too blurry to read | Low quality image uploaded |
| `AI_NOT_A_RECEIPT` | Uploaded image is not a receipt | Non-receipt image submitted |

### 500 / 502 — Server Errors

| Code | HTTP | Message | When |
| --- | --- | --- | --- |
| `INTERNAL_SERVER_ERROR` | 500 | System error, please try again | Unhandled backend exception |
| `DATABASE_CONNECTION_ERROR` | 500 | Cannot connect to database | Database unreachable or overloaded |
| `THIRD_PARTY_ERROR` | 502 | Cannot connect to external service | AI service or auth provider unavailable |

---

## 6. Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Transaction amount must be greater than zero",
    "details": [
      {
        "field": "amount",
        "issue": "must_be_greater_than_zero"
      }
    ],
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

---

## 7. Implementation Notes

**Image cleanup** — The backend runs a weekly job to delete images in storage that are not assigned to any `transaction_id`, preventing orphaned file accumulation.

**Security** — Always validate the JWT and match the `user_id` from the token against the requested resource. Users must never be able to access another user's data.

**UX loading state** — The `/ai/extract-by-url` and `/ai/extract-receipt` endpoints typically take 3–7 seconds. The frontend should show a loading indicator for the duration of the request.
