# Notifications

> Covers all notification types: bell icon notifications (persistent, accessible from the top-right of every screen) and toast notifications (transient, appear briefly after an action). For budget alert thresholds and the logic that triggers them see **budget_management.md § 5**. For the receipt scan flow that triggers scan notifications see **ai_receipt_pipeline.md**.

---

## Table of Contents

- [Notifications](#notifications)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Delivery Types](#2-delivery-types)
    - [2.1 Toast](#21-toast)
    - [2.2 Bell Notification](#22-bell-notification)
  - [3. Transaction Notifications](#3-transaction-notifications)
    - [3.1 Manual Entry — Transaction Saved](#31-manual-entry--transaction-saved)
    - [3.2 Photo Upload — Image Received](#32-photo-upload--image-received)
    - [3.3 Photo Upload — AI Draft Ready](#33-photo-upload--ai-draft-ready)
    - [3.4 Photo Upload — Transaction Confirmed](#34-photo-upload--transaction-confirmed)
  - [4. Budget Notifications](#4-budget-notifications)
    - [4.1 Approaching Budget Limit (80%)](#41-approaching-budget-limit-80)
    - [4.2 Budget Exceeded (≥ 100%)](#42-budget-exceeded--100)
  - [5. Cycle \& Period Notifications](#5-cycle--period-notifications)
    - [5.1 New Cycle Start Reminder](#51-new-cycle-start-reminder)
    - [5.2 End-of-Cycle Summary](#52-end-of-cycle-summary)
  - [6. Account \& Security Notifications](#6-account--security-notifications)
    - [6.1 Password Changed](#61-password-changed)
    - [6.2 Email Verified](#62-email-verified)
    - [6.3 Login from New Device](#63-login-from-new-device)
  - [7. Error Notifications](#7-error-notifications)
    - [7.1 Receipt Scan Errors](#71-receipt-scan-errors)
    - [7.2 General Error Toast](#72-general-error-toast)
  - [8. Notification Centre (Bell Icon)](#8-notification-centre-bell-icon)
    - [8.1 Unread Badge](#81-unread-badge)
    - [8.2 Notification List](#82-notification-list)
    - [8.3 Actions](#83-actions)
  - [9. Notification Payload Structure](#9-notification-payload-structure)

---

## 1. Overview

Two complementary channels:

- **Toast** — transient, auto-dismisses after 3–5 seconds. Used for immediate confirmations that require no follow-up.
- **Bell notification** — persistent, stored server-side in the notification centre. Used for events the user may want to review later or that occurred in the background.

Some events trigger both.

```text
Event occurs
     ↓
     ├── Transient feedback only?      → Toast only
     │     (e.g. transaction saved while app is open)
     ├── Background / actionable?      → Bell only
     │     (e.g. AI draft ready after user navigated away)
     └── Both?                         → Toast + Bell
           (e.g. budget exceeded — visible now AND reviewable later)
```

---

## 2. Delivery Types

### 2.1 Toast

```text
┌──────────────────────────────────────────────────────┐
│  ✅  Transaction saved — Food & Dining ¥3,500        │
└──────────────────────────────────────────────────────┘
```

- **Icon** — ✅ success, ⚠ warning, ❌ error, ℹ info
- **Duration** — 3 s for success/info; 5 s for warnings and errors
- **Dismiss** — auto-dismisses; can be swiped away manually
- Toasts do not support navigation actions — actionable events use bell notifications.

### 2.2 Bell Notification

```text
┌──────────────────────────────────────────────────────┐
│  ⚠  Budget alert — Shopping                         │
│     You've used 80% of your ¥15,000 budget.          │
│     ¥12,000 spent of ¥15,000                         │
│     Mar 16, 14:32                    [ View Budget ]  │
└──────────────────────────────────────────────────────┘
```

Fields: icon + type label, title, body, timestamp (in `user_settings.time_zone`), optional action button (deep link).

---

## 3. Transaction Notifications

### 3.1 Manual Entry — Transaction Saved

**Trigger:** `POST /transactions` returns `201 Created`.
**Delivery:** Toast only.

```text
✅  Transaction saved
    {type_verb} ¥{amount} — {category}
    {note}                              ← omitted if empty
```

`type_verb` mapping:

| `transactions.type` | Verb |
| --- | --- |
| `income` | Received |
| `expense` | Spent |
| `investment` | Invested |
| `saving` | Saved |

### 3.2 Photo Upload — Image Received

**Trigger:** `POST /receipts/upload` returns `201`.
**Delivery:** Toast only.

```text
✅  Photo uploaded successfully.
    Reading receipt content…
```

### 3.3 Photo Upload — AI Draft Ready

**Trigger:** `receipts.ocr_status` transitions to `'done'`.
**Delivery:** Toast + Bell.

**Toast:**:

```text
✅  Receipt read successfully.
    Your draft is ready for review.
```

**Bell:**:

```text
📄  Receipt ready for review
    Your receipt from {merchant} on {date} has been read.
    Total: ¥{amount}
    {timestamp}                        [ Review Draft ]
```

### 3.4 Photo Upload — Transaction Confirmed

**Trigger:** `PATCH /transactions/:id/confirm` returns `200 OK`.
**Delivery:** Toast + Bell.

**Toast:**:

```text
✅  Transaction saved
    {type_verb} ¥{amount} — {category_display}
    {merchant_name}
```

`category_display` is the single category name if one split, or "Multiple items" if more than one (see **transaction_split.md § 5.2**).

**Bell:**:

```text
✅  Transaction confirmed
    {type_verb} ¥{amount} at {merchant_name}
    {date}                           [ View Transaction ]
```

---

## 4. Budget Notifications

Evaluated after every confirmed transaction write. For the thresholds and alert logic see **budget_management.md § 5**. Each threshold fires at most once per category per budget period.

### 4.1 Approaching Budget Limit (80%)

**Trigger:** `utilisation >= 0.80 AND < 1.00`
**Delivery:** Toast + Bell.

**Toast:**:

```text
⚠  Approaching budget limit
   {category} — {utilisation}% used  (¥{actual} of ¥{budget})
```

**Bell:**:

```text
⚠  Budget warning — {category}
   You've used {utilisation}% of your ¥{budget} budget this period.
   ¥{actual} spent of ¥{budget}
   {timestamp}                        [ View Budget ]
```

### 4.2 Budget Exceeded (≥ 100%)

**Trigger:** `utilisation >= 1.00`
**Delivery:** Toast + Bell.

**Toast:**:

```text
❌  Budget exceeded — {category}
   You've spent ¥{actual} against a ¥{budget} budget  ({utilisation}% used)
```

**Bell:**:

```text
❌  Over budget — {category}
   Your spending has exceeded the ¥{budget} budget for this period.
   ¥{actual} spent — {utilisation}% of budget used.
   {timestamp}                        [ View Budget ]
```

---

## 5. Cycle & Period Notifications

### 5.1 New Cycle Start Reminder

**Trigger:** Scheduled daily job at midnight (`user_settings.time_zone`), fires on the day matching `user_settings.cycle_start_day`, after the new `budget_periods` row is inserted.
**Delivery:** Bell only.

```text
🔄  New budget cycle started
   Your budget has reset for a new period.
   {new_period_start} – {new_period_end}
   {timestamp}                        [ View Dashboard ]
```

### 5.2 End-of-Cycle Summary

**Trigger:** Scheduled job on the last day of each budget period (one day before `end_date`), at 20:00 in `user_settings.time_zone`.
**Delivery:** Bell only.

```text
📊  Your cycle ends tomorrow
   Here's how you did this period ({period_label}):

   Income      ¥{income_total}
   Expenses    ¥{expense_total}
   Investments ¥{investment_total}
   Savings     ¥{saving_total}

   {N} categories were over budget.       ← or "All categories stayed within budget. 🎉"
   {timestamp}                        [ View Dashboard ]
```

---

## 6. Account & Security Notifications

### 6.1 Password Changed

**Trigger:** Successful password reset or change.
**Delivery:** Bell only.

```text
🔒  Password updated
   Your password was changed on {date} at {time}.
   If you did not make this change, contact support immediately.
   {timestamp}
```

### 6.2 Email Verified

**Trigger:** `users.is_verified` set to `true`.
**Delivery:** Toast only (shown on the post-verification screen).

```text
✅  Email verified.
   You can now log in to your account.
```

### 6.3 Login from New Device

**Trigger:** Successful login from a device / IP not seen in recent `sessions` history.
**Delivery:** Bell only.

```text
🔐  New login detected
   Your account was accessed on {date} at {time}.
   Device: {device_info}
   If this wasn't you, change your password immediately.
   {timestamp}                        [ Change Password ]
```

---

## 7. Error Notifications

### 7.1 Receipt Scan Errors

**Trigger:** AI extraction pipeline returns an error (see **ai_receipt_pipeline.md**).
**Delivery:** Toast only.

| Error code | Toast message |
| --- | --- |
| `IMAGE_TOO_BLURRY` | `❌  Couldn't read image. Please upload a clearer photo.` |
| `IMAGE_TOO_LARGE` | `❌  Image too large. Please upload a smaller file.` |
| `UNSUPPORTED_FORMAT` | `❌  Unsupported file type. Please use JPG, PNG, HEIC, or PDF.` |
| `NOT_A_RECEIPT` | `❌  No transaction found in this image. Please try a different photo.` |
| `NO_AMOUNT_FOUND` | `❌  Couldn't read an amount. Try a clearer photo or use manual entry.` |
| `EXTRACTION_FAILED` | `❌  Something went wrong. Please try again or use manual entry.` |

### 7.2 General Error Toast

Used for network failures, server errors, or unhandled exceptions.
**Delivery:** Toast only.

```text
❌  Something went wrong. Please try again.
```

Validation errors (invalid form fields) are shown inline beneath the relevant field — not as a toast.

---

## 8. Notification Centre (Bell Icon)

### 8.1 Unread Badge

```text
🔔      ← no unread
🔔³     ← 3 unread
🔔⁹⁺    ← 10 or more unread
```

Badge count updates in real time when the app is open.

### 8.2 Notification List

Tapping the bell icon opens the notification centre (full-screen panel or bottom sheet), listing all bell notifications in reverse chronological order.

```text
─────────────────────────────────────────
  Notifications
  [ Mark all as read ]
─────────────────────────────────────────
  ● ❌  Over budget — Shopping                 [NEW]
       ¥16,500 spent of ¥15,000 (110%)
       Mar 16, 15:44          [ View Budget ]

  ● 📄  Receipt ready for review               [NEW]
       Lawson — ¥1,620 · Mar 16
       Mar 16, 14:33         [ Review Draft ]

    ✅  Transaction confirmed
       Spent ¥3,500 — Food & Dining
       Mar 16, 12:45       [ View Transaction ]

    🔄  New budget cycle started
       Mar 1 – Mar 31
       Mar 1, 00:00          [ View Dashboard ]
─────────────────────────────────────────
```

Unread notifications are marked with a filled dot (●) and `[NEW]`.

### 8.3 Actions

| Action | Behaviour |
| --- | --- |
| Tap a row | Marks read; navigates to linked screen if deep link exists |
| Tap action button | Marks read; navigates to specific linked screen |
| Swipe left on a row | Reveals **Delete** button |
| Tap **Mark all as read** | Marks all read; clears badge |
| Pull to refresh | Fetches latest from server |

---

## 9. Notification Payload Structure

All bell notifications are stored server-side.

**`notifications` table:**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK → users |
| type | text | See type codes below |
| title | text | One-line summary |
| body | text | Supporting detail |
| action_label | text | Button label (nullable) |
| action_url | text | Deep link path (nullable) |
| is_read | boolean | `false` on creation |
| created_at | timestamp | When the event occurred |

**Notification type codes:**

| Type code | Section |
| --- | --- |
| `transaction.saved` | § 3.1, § 3.4 |
| `receipt.draft_ready` | § 3.3 |
| `budget.warning` | § 4.1 |
| `budget.exceeded` | § 4.2 |
| `cycle.started` | § 5.1 |
| `cycle.ending_soon` | § 5.2 |
| `security.password_changed` | § 6.1 |
| `security.new_login` | § 6.3 |

**API endpoints:**

```text
GET    /notifications            → list all, ordered by created_at DESC
PATCH  /notifications/read-all  → mark all as read
PATCH  /notifications/:id/read  → mark one as read
DELETE /notifications/:id       → delete one
```
