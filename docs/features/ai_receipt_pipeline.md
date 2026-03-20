# AI Receipt Pipeline

> Technical reference overview for the receipt scanning pipeline.
> For the full implementation spec — see **ai_extract_receipt.md**.
> For endpoint details — see **api_spec.md**.
> For DB tables — see **database_schema.md § 3–5**.

---

## Table of Contents

- [AI Receipt Pipeline](#ai-receipt-pipeline)
  - [Table of Contents](#table-of-contents)
  - [1. Pipeline Summary](#1-pipeline-summary)
  - [2. Entry Points](#2-entry-points)
  - [3. Database Tables](#3-database-tables)
  - [4. Error Codes](#4-error-codes)

---

## 1. Pipeline Summary

```text
Upload image (POST /receipts/upload)
     ↓  receipts row created (ocr_status: pending, transaction_id: null)
Step 1 — OCR: raw text extracted from image → stored in receipts.scan_data
Step 2 — LLM: raw text → structured JSON (merchant, date, amount, items)
Step 3 — Merchant resolution (merchants + merchant_aliases tables)
Step 4 — Category prediction per item (category_keywords + ai_predictions history)
Step 5 — Confidence scoring (threshold: 0.70)
Step 6 — Write receipt_items + ai_predictions → return TransactionSuggestion
     ↓  receipts.transaction_id still null
User reviews draft → edits (optional) → confirms
     ↓
POST /transactions → transactions (confirmed) + transaction_splits written
                  → receipts.transaction_id linked
```

> **The transaction is never saved automatically.** User confirmation is always required.

---

## 2. Entry Points

| Path | Endpoint | Use case |
| --- | --- | --- |
| URL-based | `POST /ai/extract-by-url` | Client uploads image first, passes back `imageUrl` |
| Direct upload | `POST /ai/extract-receipt` | Client sends file directly |

Both paths return an identical `TransactionSuggestion`. See **ai_extract_receipt.md § 3**.

---

## 3. Database Tables

| Table | Role |
| --- | --- |
| `receipts` | Image URL, OCR status, raw scan data |
| `receipt_items` | Extracted line items |
| `ai_predictions` | Predicted category + confidence score per item |
| `ai_corrections` | Audit log of every field the user corrects |
| `transactions` | Created on user confirmation only |
| `category_keywords` | Used by LLM to match categories |
| `merchants` / `merchant_aliases` | Merchant name normalisation |

---

## 4. Error Codes

| Code | HTTP | Cause |
| --- | --- | --- |
| `INVALID_IMAGE_FORMAT` | 400 | Unsupported file type |
| `AI_IMAGE_TOO_BLURRY` | 400 | Image quality too low for OCR |
| `AI_NOT_A_RECEIPT` | 400 | Image is not a receipt |
| `AI_PROCESSING_FAILED` | 400 | OCR or LLM failed unexpectedly |
| `AI_LIMIT_REACHED` | 429 | AI service quota exceeded |
| `THIRD_PARTY_ERROR` | 502 | AI service unreachable |

All errors follow the standard response format in **api_spec.md § 6**. Full error behaviour and user-facing messages — see **ai_extract_receipt.md § 11**.
