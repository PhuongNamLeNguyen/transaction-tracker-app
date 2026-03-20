# Transaction Create

> Covers the navbar scan button, transaction type selection, all three entry methods (manual, photo upload, and camera scan), the full creation flow for each method, and error handling. For the AI extraction internals (OCR pipeline, LLM parsing, category mapping) see **ai_receipt_pipeline.md**. For split display, manual split management, and split invariants see **transaction_split.md**. For post-save editing, split deletion, and the Deleted Transactions screen see **transaction_edit.md**. For relevant table definitions see **database_schema.md § 3–5**.

---

## Table of Contents

- [Transaction Create](#transaction-create)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Navbar Scan Button](#2-navbar-scan-button)
  - [3. Transaction Type Selection](#3-transaction-type-selection)
  - [4. Entry Method Selection](#4-entry-method-selection)
  - [5. Manual Entry](#5-manual-entry)
    - [5.1 Form Fields](#51-form-fields)
    - [5.2 Validation Rules](#52-validation-rules)
    - [5.3 Review \& Confirm Screen](#53-review--confirm-screen)
    - [5.4 Database Writes on Submit](#54-database-writes-on-submit)
  - [6. Photo Upload \& Camera Scan](#6-photo-upload--camera-scan)
    - [6.1 Upload from Library](#61-upload-from-library)
    - [6.2 Camera / Screenshot](#62-camera--screenshot)
    - [6.3 Image Preview \& Submit](#63-image-preview--submit)
    - [6.4 Image Upload to Cloud Storage](#64-image-upload-to-cloud-storage)
    - [6.5 AI Extraction Flow](#65-ai-extraction-flow)
    - [6.6 Draft Review Screen](#66-draft-review-screen)
  - [7. Error Handling](#7-error-handling)
    - [Manual entry errors](#manual-entry-errors)
    - [Photo upload \& scan errors](#photo-upload--scan-errors)

---

## 1. Overview

Transaction creation is initiated from the persistent bottom navbar via a central scan button. The user selects a transaction type, then chooses one of three entry methods. Each method converges on the same outcome: a confirmed `transactions` record with one or more `transaction_splits` rows written to the database.

```text
Navbar scan button
     ↓
Select type (income / expense / investment / saving)
     ↓
Select entry method
     ├── Manual entry ────────────────────────────────────────────────────────────┐
     │        ↓                                                                   │
     │   Fill in form → Review screen → Confirm & Save                            │
     │        ↓                                                                   │
     │   POST /transactions → transactions(confirmed) + transaction_splits(×1)    │
     │                                                                            ▼
     ├── Upload from library ───────────────────────────────────────────┐   Transaction
     │        ↓                                                         │   Detail Screen
     │   Select image → Preview → Submit                                │   (transaction_split.md)
     │        ↓                                                         │
     │   POST /receipts/upload → Firebase → image_url                   │
     │        ↓  (auto)                                                 │
     │   POST /receipts/scan → AI (OCR + LLM) → JSON draft              │
     │        ↓                                                         │
     │   Draft review → (optional edit → ai_corrections) → Confirm      │
     │        ↓                                                         │
     │   PATCH /transactions/:id/confirm → transactions(confirmed)      │
     │                                   + transaction_splits(×N)   ────┘
     │
     └── Camera / screenshot  (identical to Upload from library after capture)
```

---

## 2. Navbar Scan Button

The bottom navbar is always visible across all main app screens. The **scan button** sits in the center of the navbar and is the sole entry point for creating any new transaction.

On tap, four option buttons expand from the scan button (e.g. as a radial or stacked menu):

| Option | `transactions.type` value |
| --- | --- |
| Incomes | `income` |
| Expenses | `expense` |
| Investments | `investment` |
| Savings | `saving` |

Tapping anywhere outside the expanded menu dismisses it without navigating away.

---

## 3. Transaction Type Selection

Selecting one of the four options sets the `type` for the transaction being created and advances to the entry method screen. The selected type is carried through all subsequent screens and written to `transactions.type` on final submit.

Categories shown later in the form or draft review are **filtered by the selected type** — only `categories` rows whose `categories.type` matches the chosen transaction type are displayed.

---

## 4. Entry Method Selection

After selecting a transaction type, the user is presented with three entry methods:

| Method | Description |
| --- | --- |
| **Manual entry** | Fill in a form by hand — see Section 5 |
| **Upload from library** | Select an existing image of a receipt or transaction slip — see Section 6 |
| **Camera / screenshot** | Take a photo directly in-app — see Section 6 |

---

## 5. Manual Entry

Selecting **Manual entry** opens a modal that slides up from the bottom of the screen. The transaction type selected in the previous step is displayed at the top as a read-only label.

### 5.1 Form Fields

| Field | Required | DB Column | Notes |
| --- | --- | --- | --- |
| **Amount** | Yes | `transactions.amount` | Positive numeric; currency derived from `user_settings.target_currency` |
| **Account** | Yes | `transactions.account_id` | Dropdown; all accounts belonging to `req.user.id` |
| **Category** | Yes | `transaction_splits.category_id` | Dropdown; `categories` filtered by selected transaction type |
| **Date & Time** | Yes | `transactions.transaction_date` | Defaults to current datetime in `user_settings.time_zone` |
| **Note** | No | `transactions.note` | Free-text; optional |

**Amount:** accepts positive numbers only; decimal precision follows the currency convention (0 for JPY, 2 for USD).

**Category:** loaded from `categories` where `type` matches the selected transaction type; displays name and icon.

**Date & Time:** future dates are permitted.

### 5.2 Validation Rules

All validation runs on the frontend before submission and is re-validated backend-side.

| Field | Rule | Error message |
| --- | --- | --- |
| Amount | Must be present | `Amount is required` |
| Amount | Must be a positive number | `Amount must be greater than 0` |
| Account | Must be selected | `Please select an account` |
| Category | Must be selected | `Please select a category` |
| Date & Time | Must be a valid datetime | `Please enter a valid date and time` |

The **Submit** button remains disabled until all required fields are valid.

### 5.3 Review & Confirm Screen

After the user fills in all fields and clicks **Submit**, the dialog is replaced by a read-only review screen. No data has been written to the database at this point.

```text
─────────────────────────────────────────
  New Expense                    [type label]
─────────────────────────────────────────
  Amount       : ¥3,500
  Account      : Main Wallet
  Category     : Food & Dining
  Date & Time  : 2026-03-16  12:45
  Note         : Lunch with team
─────────────────────────────────────────
  [ ← Back ]              [ Confirm & Save ]
─────────────────────────────────────────
```

- **Back** — returns to the form with all previously entered values preserved
- **Confirm & Save** — triggers the database write (see Section 5.4)

### 5.4 Database Writes on Submit

```text
POST /transactions
```

**Request body:**

```json
{
  "type": "expense",
  "amount": 3500,
  "currency": "JPY",
  "accountId": "uuid-account",
  "categoryId": "uuid-category",
  "transactionDate": "2026-03-16T12:45:00+09:00",
  "note": "Lunch with team"
}
```

**Backend write sequence:**

```text
1. Validate all fields (mirror frontend rules)
     ↓
2. INSERT INTO transactions
   → user_id, account_id, type, amount, currency
   → status = 'confirmed', source = 'manual'
   → transaction_date, note, created_at, updated_at
     ↓
3. INSERT INTO transaction_splits  (one row — full amount, single category)
   → transaction_id, category_id, amount, created_at, updated_at
     ↓
4. 201 Created — { success: true, data: { transactionId, splitId } }
```

**Key rules:**

- `source = 'manual'`; `status = 'confirmed'` immediately — manual entries skip the `processing` / `ready` states
- One `transaction_splits` row is created automatically covering the full amount
- Splits can be subdivided later from the transaction detail screen (see **transaction_split.md § 6**)

The frontend navigates to the transaction detail screen on a `201` response.

---

## 6. Photo Upload & Camera Scan

Both photo-based entry methods follow the same flow after image acquisition: the image is uploaded to Firebase Cloud Storage, passed to the AI service for extraction, and the resulting draft is presented for review before confirming.

### 6.1 Upload from Library

The user taps **Upload from library**. The device's native file/photo picker opens.

**Accepted formats:** JPG, PNG, HEIC, PDF (optional)

**File size:** validated server-side before upload proceeds (see Section 7).

### 6.2 Camera / Screenshot

The user taps **Camera / Screenshot**. The device camera launches in-app. The captured image is treated identically to an uploaded file from this point forward.

### 6.3 Image Preview & Submit

After the image is selected or captured, the app displays a preview screen **before anything is uploaded**.

```text
┌─────────────────────────────────────┐
│                                     │
│         [ Image Preview ]           │
│                                     │
│   (full-size display of the image)  │
│                                     │
└─────────────────────────────────────┘
  [ ← Retake / Reselect ]   [ Submit → ]
```

No network requests are made until the user taps **Submit**.

### 6.4 Image Upload to Cloud Storage

On **Submit**, the frontend fires two sequential requests automatically.

**Step 1 — Upload image:**

```text
POST /receipts/upload
Content-Type: multipart/form-data
{ image: <file>, transactionType: "expense" }
```

```text
Validate file type and size
     ↓
Upload to Firebase Cloud Storage → { image_url, file_metadata }
     ↓
INSERT INTO receipts
  → image_url, ocr_status = 'pending', created_at
     ↓
201 Created — { receiptId, imageUrl }
```

**Step 2 — Trigger AI extraction (automatic, fires immediately on 201):**

```text
POST /receipts/scan
Content-Type: application/json
{ receiptId: "uuid" }
```

```text
Fetch receipts.image_url
     ↓
UPDATE receipts SET ocr_status = 'processing'
     ↓
Call AI service (OCR + LLM — see ai_receipt_pipeline.md)
     ↓
Save draft to DB (see Section 6.5)
     ↓
UPDATE receipts SET ocr_status = 'done'
     ↓
200 OK — { draft }
```

While Steps 1 and 2 are in progress, the frontend shows a loading indicator ("Reading your receipt…").

### 6.5 AI Extraction Flow

The AI service performs OCR and LLM parsing on the image. Internals are in **ai_receipt_pipeline.md**. This section covers how the output is persisted.

**AI response shape:**

```json
{
  "merchant": "Lawson",
  "transactionDate": "2026-03-16",
  "totalAmount": 1240,
  "currency": "JPY",
  "note": "",
  "items": [
    { "itemName": "Onigiri",  "price": 160, "quantity": 2, "predictedCategoryId": "uuid-food",   "confidenceScore": 0.97 },
    { "itemName": "Coffee",   "price": 220, "quantity": 1, "predictedCategoryId": "uuid-food",   "confidenceScore": 0.95 },
    { "itemName": "Notepad",  "price": 300, "quantity": 1, "predictedCategoryId": "uuid-office", "confidenceScore": 0.81 },
    { "itemName": "Lip balm", "price": 400, "quantity": 1, "predictedCategoryId": "uuid-care",   "confidenceScore": 0.76 }
  ]
}
```

**Database writes after AI extraction:**

```text
1. INSERT INTO transactions
   → user_id, type (from upload), amount, currency
   → status = 'ready', source = 'receipt_scan'
   → transaction_date, note, merchant_id (resolved/created)

2. UPDATE receipts
   → transaction_id, scan_data, category_id, merchant_id, ocr_status = 'done'

3. For each item:
   INSERT INTO receipt_items → receipt_id, item_name, price, quantity
   INSERT INTO ai_predictions → receipt_item_id, predicted_category_id,
                                confidence_score, model_version
```

`status = 'ready'` signals the draft awaits user confirmation. Transactions in this state are excluded from budget alerts and dashboard aggregations.

For how multiple categories are grouped into splits, see **transaction_split.md § 3.3**.

### 6.6 Draft Review Screen

Once `ocr_status = 'done'`, the frontend notifies the user and displays the draft review screen automatically.

```text
─────────────────────────────────────────
  Receipt Draft                [Expense]
─────────────────────────────────────────
  Merchant     : Lawson
  Date         : 2026-03-16
  Total amount : ¥1,240  JPY

  Items & Categories:
  ┌──────────────────┬───────────────┬────────┐
  │ Item             │ Category      │ Amount │
  ├──────────────────┼───────────────┼────────┤
  │ Onigiri ×2       │ Food & Dining │  ¥320  │
  │ Coffee ×1        │ Food & Dining │  ¥220  │
  │ Notepad ×1       │ Office Supply │  ¥300  │
  │ Lip balm ×1      │ Personal Care │  ¥400  │
  └──────────────────┴───────────────┴────────┘
  Note         : (empty)
─────────────────────────────────────────
  [ ← Edit ]              [ Confirm & Save ]
─────────────────────────────────────────
```

- **Edit** — opens editable draft form; see **transaction_edit.md § 2** for editable fields, `ai_corrections` write logic, and validation rules
- **Confirm & Save** — see **transaction_edit.md § 2.5** for the `PATCH /transactions/:id/confirm` write sequence

The frontend navigates to the transaction detail screen on success and displays: **"Transaction has been read."**

---

## 7. Error Handling

### Manual entry errors

Inline validation errors are shown beneath the relevant field. The Submit button stays disabled until all required fields are valid (see Section 5.2).

### Photo upload & scan errors

| Error condition | When detected | Message shown to user |
| --- | --- | --- |
| File type not supported | On upload | `"Unsupported file type. Please upload a JPG, PNG, HEIC, or PDF."` |
| File size exceeds limit | On upload | `"Image is too large. Please upload a file under [limit]."` |
| Firebase upload failure | On upload | `"Upload failed. Please check your connection and try again."` |
| Image too blurry / unreadable | After AI extraction | `"We couldn't read this image. Please upload a clearer photo."` |
| AI extraction timeout or failure | After AI extraction | `"Something went wrong while reading your receipt. Please try again or use manual entry."` |
| No transaction data found | After AI extraction | `"No transaction details were found in this image. Please try a different photo or use manual entry."` |
| Split amounts do not sum to total | On confirm | `"The split amounts do not add up to the total. Please review and correct the amounts."` |

In all photo error cases the user is offered the option to **retake / reselect** the image or **switch to manual entry**.
