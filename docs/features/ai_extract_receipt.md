# AI Receipt Extraction

> Full specification for the AI receipt extraction pipeline — OCR, structured parsing, merchant resolution, category prediction, confidence scoring, draft construction, and save to database.
> The pipeline never creates a `transactions` record — a draft is returned as `TransactionSuggestion` and held in frontend state until the user confirms.
> For image upload trigger — see **transaction_create.md § 6.4**.
> For draft review and edit UI — see **transaction_edit.md § 2**.
> For split generation from categorised items — see **transaction_split.md § 3**.
> For DB tables — see **database_schema.md § 3–5**.
> For endpoint signatures — see **api_spec.md**.

---

## Table of Contents

- [AI Receipt Extraction](#ai-receipt-extraction)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Supported Formats](#2-supported-formats)
  - [3. Entry Points](#3-entry-points)
  - [4. Pipeline Steps](#4-pipeline-steps)
    - [Step 1 — OCR](#step-1--ocr)
    - [Step 2 — LLM Parsing](#step-2--llm-parsing)
    - [Step 3 — Merchant Resolution](#step-3--merchant-resolution)
    - [Step 4 — Category Prediction](#step-4--category-prediction)
    - [Step 5 — Confidence Scoring](#step-5--confidence-scoring)
    - [Step 6 — Draft Construction \& DB Writes](#step-6--draft-construction--db-writes)
  - [5. TransactionSuggestion Structure](#5-transactionsuggestion-structure)
  - [6. Confidence Levels \& UI Behaviour](#6-confidence-levels--ui-behaviour)
    - [High confidence (`confidenceLevel: "high"`)](#high-confidence-confidencelevel-high)
    - [Low confidence (`confidenceLevel: "low"`)](#low-confidence-confidencelevel-low)
  - [7. User Confirmation Screen](#7-user-confirmation-screen)
  - [8. Save to Database](#8-save-to-database)
  - [9. User Edits \& Database Enrichment](#9-user-edits--database-enrichment)
    - [9.1 ai\_corrections](#91-ai_corrections)
    - [9.2 Merchant enrichment](#92-merchant-enrichment)
  - [10. Notifications](#10-notifications)
  - [11. Error Handling](#11-error-handling)

---

## 1. Overview

```text
POST /receipts/upload → image stored → receipts row created (ocr_status: pending)
     ↓
POST /receipts/scan or POST /ai/extract-by-url
     ↓
Step 1 — OCR: extract raw text from image
Step 2 — LLM: parse text into structured JSON
Step 3 — Merchant resolution (merchants + merchant_aliases)
Step 4 — Category prediction per item (keywords + history)
Step 5 — Confidence scoring (threshold: 0.70)
Step 6 — Write receipt_items + ai_predictions; return TransactionSuggestion
     ↓
Frontend: user reviews draft → edits (optional) → confirms
     ↓
POST /transactions → transactions (status: confirmed) + transaction_splits written
```

> **The pipeline never writes to `transactions`.**
> A `transactions` row is created only when the user explicitly confirms via `POST /transactions`.

---

## 2. Supported Formats

| Format | Notes |
| --- | --- |
| JPG / JPEG | Primary |
| PNG | Supported |
| HEIC | Supported (common on iOS) |
| PDF | Single-page receipts only |

---

## 3. Entry Points

| Path | Endpoint | Use case |
| --- | --- | --- |
| URL-based | `POST /ai/extract-by-url` | Client uploads image first via `POST /receipts/upload`, passes back the `imageUrl` |
| Direct upload | `POST /ai/extract-receipt` | Client sends the file directly in one request |

Both paths return an identical `TransactionSuggestion` and follow the same pipeline steps.

---

## 4. Pipeline Steps

### Step 1 — OCR

The AI service fetches the image from `receipts.image_url` and runs OCR to extract raw text. Output is stored verbatim in `receipts.scan_data`.

```text
Input:  image_url
Output: raw OCR text + bounding-box metadata
Stored: receipts.scan_data = { rawText, blocks, confidence }
        receipts.ocr_status → 'processing' → 'done'
```

If OCR cannot extract usable text, the pipeline halts and returns an error (see [Section 11](#11-error-handling)).

### Step 2 — LLM Parsing

Raw OCR text is passed to the LLM, which parses it into structured fields:

| Field | Description |
| --- | --- |
| `transactionDate` | Date/time printed on receipt |
| `merchant` | Store or company name |
| `storeAddress` | Physical address, if present |
| `totalAmount` | Final total charged |
| `currency` | Currency code (e.g. `JPY`, `USD`) |
| `items[]` | Line items: `itemName`, `quantity`, `unitPrice`, `subtotal` |
| `taxAmount` | Tax amount, if listed separately |
| `discountAmount` | Discount/coupon amount, if present |

Fields absent on the receipt are set to `null` — the LLM never invents values.

### Step 3 — Merchant Resolution

```text
Normalise extracted merchant name (lowercase, strip punctuation)
     ↓
Match against merchants.normalized_name OR merchant_aliases.alias_name
     ↓
Match found → use existing merchants.id
              apply merchants.default_category_id as item fallback
No match   → INSERT INTO merchants (name, normalized_name)
              default_category_id set after first confirmed transaction (see § 9.2)
```

### Step 4 — Category Prediction

Each item in `items[]` is predicted independently using two signals in priority order:

**Signal 1 — Keyword matching**
Tokenise `itemName` → match against `category_keywords.keyword` → use highest-confidence match as `predicted_category_id`.

**Signal 2 — Historical predictions**
If no keyword match: query `ai_predictions` for the most frequently confirmed category for the same `item_name` in past receipts (excluding items that were corrected by users).

If neither signal produces a match: use `merchants.default_category_id` as fallback, or set `predicted_category_id = null` with `confidence_score = 0`.

### Step 5 — Confidence Scoring

| Score | Source | Level |
| --- | --- | --- |
| `0.85–1.0` | Strong keyword match | High |
| `0.70–0.84` | Weak keyword or historical match | Moderate |
| `0.30–0.69` | Merchant default fallback | Low |
| `0.00–0.29` | No signal | Very low |

**Threshold: `0.70`** — items below this have `predicted_category_id = null` and are flagged low-confidence. The user must select a category manually before confirming.

```text
All items >= 0.70 → confidenceLevel: "high"
Any item  <  0.70 → confidenceLevel: "low"
```

### Step 6 — Draft Construction & DB Writes

No `transactions` row is created here.

```text
1. UPDATE receipts
   → merchant_id = resolved merchants.id
   → category_id = most common predicted_category_id across items
   → ocr_status  = 'done'
   → transaction_id remains NULL

2. For each item:
   INSERT INTO receipt_items  (receipt_id, item_name, price, quantity)
   INSERT INTO ai_predictions (receipt_item_id, predicted_category_id, confidence_score, model_version)

3. Return 200 OK { suggestion: TransactionSuggestion, confidenceLevel: "high" | "low" }
```

`receipts.transaction_id` stays `null` until `POST /transactions` is called. Orphaned receipts with no `transaction_id` after 7 days are deleted by the weekly cleanup job.

---

## 5. TransactionSuggestion Structure

Draft held in frontend state only — never saved as-is to the database. Maps to `TransactionSuggestion` in **data_models.md § 5**.

```json
{
  "receiptId": "uuid-receipt",
  "confidenceLevel": "low",
  "merchant": {
    "id": "uuid-merchant",
    "name": "Lawson",
    "storeAddress": "1-2-3 Shibuya, Tokyo"
  },
  "transactionDate": "2026-03-16T14:32:00+09:00",
  "totalAmount": 1620,
  "currency": "JPY",
  "taxAmount": 130,
  "discountAmount": null,
  "items": [
    {
      "receiptItemId": "uuid-item-1",
      "itemName": "Onigiri (Tuna)",
      "quantity": 2,
      "unitPrice": 160,
      "subtotal": 320,
      "prediction": { "categoryId": "uuid-food", "categoryName": "Food & Beverages", "confidenceScore": 0.97, "lowConfidence": false }
    },
    {
      "receiptItemId": "uuid-item-3",
      "itemName": "Textbook Cover B5",
      "quantity": 1,
      "unitPrice": 800,
      "subtotal": 800,
      "prediction": { "categoryId": null, "categoryName": null, "confidenceScore": 0.54, "lowConfidence": true }
    }
  ]
}
```

Key rules:

- No `transactionId` field — no transaction record exists yet
- Items with `confidence_score < 0.70` have `categoryId: null` — user must select before confirming
- `receiptId` links corrections and `POST /transactions` back to the receipt record

---

## 6. Confidence Levels & UI Behaviour

### High confidence (`confidenceLevel: "high"`)

All items have `confidence_score >= 0.70`. Confirmation screen shows the full draft with no warnings — every item displays its predicted category.

### Low confidence (`confidenceLevel: "low"`)

One or more items have `confidence_score < 0.70`. Confirmation screen adds:

1. **Banner warning** at the top: *"Some categories could not be determined. Please select a category for highlighted items before confirming."*
2. **Per-item category selector** on each low-confidence row — a dropdown shown pre-open in place of the category name.

**Confirm & Save is disabled** until all low-confidence items have a category selected. This ensures every `transaction_splits` row has a valid `category_id`.

---

## 7. User Confirmation Screen

The confirmation screen is the final review gate. The draft is still entirely in frontend state — nothing committed to the database yet.

| Action | Behaviour |
| --- | --- |
| **Confirm & Save** | Calls `POST /transactions`; disabled until all items have a category |
| **Edit** | Opens the pre-save edit form (see **transaction_edit.md § 2**); returns to this screen after saving |
| **Back / Cancel** | Discards the draft. The `receipts` row and `receipt_items` remain in DB; cleaned up by the weekly job |

---

## 8. Save to Database

When the user taps **Confirm & Save**, the frontend calls `POST /transactions`. This is the only point at which a `transactions` row is created.

**Request body**:

```json
{
  "type": "expense",
  "amount": 1620,
  "currency": "JPY",
  "accountId": "uuid-account",
  "transactionDate": "2026-03-16T14:32:00+09:00",
  "merchantId": "uuid-merchant",
  "note": null,
  "receiptId": "uuid-receipt",
  "source": "receipt_scan",
  "items": [
    { "receiptItemId": "uuid-item-1", "categoryId": "uuid-food",      "amount": 540 },
    { "receiptItemId": "uuid-item-3", "categoryId": "uuid-education", "amount": 1080 }
  ]
}
```

**Backend write sequence**:

```text
1. Validate: amount > 0, valid date, all items have categoryId, splits sum to amount
2. INSERT INTO transactions (status: 'confirmed', source: 'receipt_scan')
3. INSERT INTO transaction_splits — one row per item group (grouped by categoryId)
4. UPDATE receipts SET transaction_id = new transactions.id
5. UPDATE accounts.balance
6. Trigger budget alert check for each affected category (see budget_management.md § 5)
7. 201 Created — { success: true, data: { transactionId } }
```

Rules:

- `transactions.status` is always `'confirmed'` — no intermediate state
- `transactions.source` is always `'receipt_scan'`
- `SUM(transaction_splits.amount)` must equal `transactions.amount`

---

## 9. User Edits & Database Enrichment

### 9.1 ai_corrections

Every field the user changes on the confirmation screen is written to `ai_corrections` immediately — before confirmation. Each changed field produces one row; multiple changes to the same field produce multiple rows.

```text
INSERT INTO ai_corrections
  → receipt_id           = receipts.id
  → field_name           = e.g. "category_id", "item_amount", "transaction_date"
  → ai_value             = original AI value (null if AI had no prediction)
  → corrected_value      = value entered by user
  → corrected_by_user_id = req.user.id
  → created_at           = now()
```

This log is the primary source for future model improvement and category matching tuning.

### 9.2 Merchant enrichment

```text
New merchant (default_category_id is null) after confirmation:
  UPDATE merchants SET default_category_id = most common category_id from this transaction's splits

User edited merchant name during review:
  → Matches existing merchant → use that merchants.id in POST /transactions
  → No match → INSERT INTO merchants (new name)
               INSERT INTO merchant_aliases (original OCR name → new merchants.id)
```

---

## 10. Notifications

Two in-app notifications are triggered. See **notification.md § 3** for full delivery specs.

| Trigger | Message |
| --- | --- |
| `ocr_status` transitions to `'done'` | ✅ *Receipt read successfully. Your transaction is ready for review.* |
| `POST /transactions` returns 201 | ✅ *Transaction saved successfully.* |

---

## 11. Error Handling

All pipeline errors halt processing. No `transactions` row is created. The `receipts` row is updated:

```text
UPDATE receipts SET ocr_status = 'error',
  scan_data = { errorCode, errorDetail, rawOcrOutput (if available) }
```

| Error code | Trigger | User-facing message |
| --- | --- | --- |
| `INVALID_IMAGE_FORMAT` | Unsupported file type | *"Unsupported file type. Please upload a JPG, PNG, HEIC, or PDF."* |
| `AI_IMAGE_TOO_BLURRY` | OCR confidence below usable threshold | *"The image is too blurry. Please retake or upload a clearer photo."* |
| `AI_NOT_A_RECEIPT` | LLM determines image is not a receipt | *"No transaction details found. Please upload a receipt or invoice."* |
| `AI_PROCESSING_FAILED` | Unexpected AI service error | *"Something went wrong reading your receipt. Please try again or use manual entry."* |
| `AI_LIMIT_REACHED` | AI quota exceeded | *"Receipt scanning is temporarily unavailable. Please use manual entry."* |
| `THIRD_PARTY_ERROR` | AI service unreachable | *"Cannot connect to the scanning service. Please try again or use manual entry."* |

Error codes align with **error_handling.md** and **api_spec.md § 5**. The frontend shows the message inline with two recovery options: **[ Retake / Reselect Image ]** and **[ Switch to Manual Entry ]**.
