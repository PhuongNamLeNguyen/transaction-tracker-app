# Notifications & Feedback

> Toast notifications, bell icon & badge, notification centre, loading states, confirmation dialogs, and inline validation feedback.

---

## 1. Toast Notifications

### Variants & Durations

| Variant | Icon | Border/bg token | Duration | Use for |
| --- | --- | --- | --- | --- |
| `success` | ✅ | `--color-success` / `-bg` | 3000ms | Action completed |
| `warning` | ⚠️ | `--color-warning` / `-bg` | 5000ms | Attention needed |
| `error` | ❌ | `--color-error` / `-bg` | 5000ms | Action failed |
| `info` | ℹ️ | `--color-info` / `-bg` | 3000ms | Neutral status |

Toast with `onUndo` always uses 3000ms. Icons must never be removed.

### Anatomy

Container: `--color-{variant}-bg` background, 4px solid left border, `--radius-sm`, `--shadow-md`, `--space-3` vertical / `--space-4` horizontal padding. Icon 20px, gap `--space-3`, message `--text-sm --weight-regular --color-text-primary`. Undo button `--text-sm --weight-semibold --color-text-link`, right-aligned.

Max message length: 2 lines max. 3+ lines → use bell notification or inline error instead.

### Position & Stacking

Fixed, top-center, `top: --space-10`, `left/right: --space-4`, `z-index: --z-toast` (600). Max 3 visible simultaneously; queue the rest. Stacked oldest at top, `8px` between each.

### Animation

| Trigger | Animation | Duration | Easing |
| --- | --- | --- | --- |
| Appear | Slide down from `top - 12px` + fade in | `--duration-slow` | `--ease-decelerate` |
| Auto-dismiss | Fade out + slide up | `--duration-base` | `--ease-accelerate` |
| Swipe-dismiss | Slide horizontally off-screen (≥ 50% width) | `--duration-fast` | `--ease-accelerate` |

Under `prefers-reduced-motion`: instant opacity change only.

### ToastManager

Global singleton renders in `App.tsx`. Components use a `useToast()` hook — never render `<Toast>` directly. `showToast({ variant, message, onUndo?, duration? })`.

---

## 2. Bell Icon & Unread Badge

Bell: 24px icon, 44×44px tap target (invisible padding), top-right of every main screen top bar. Color: `--color-text-secondary` (0 unread) / `--color-accent` (has unread).

Badge: `--color-error` bg, `--color-text-inverse` text, `--text-2xs --weight-bold`, `--radius-full`. 18×18px for 1 digit, 22×18px for "9+". Position `top: -4px, right: -4px`. Hidden when `unreadCount === 0` — never show "0". Cap at "9+" for 10+.

`aria-label`: `"Notifications — {n} unread"` or `"Notifications"`. Badge `aria-hidden="true"`.

Badge increment animation: `scale(1.3) → scale(1.0)`, `--duration-fast --ease-spring`.

Polling: `GET /notifications` every 30 seconds, or WebSocket push.

---

## 3. Notification Centre Panel

**Opening:** tap bell → panel slides in from right (or bottom sheet on mobile). Backdrop fades in. Bell badge clears as notifications are read.

**Panel anatomy:** top bar with "Notifications" title, unread count, "Mark all as read" button, and close. Scrollable list of `NotificationRow` items. Pull-to-refresh at the top. Empty state when list is empty.

### Notification Row

| Element | Spec |
| --- | --- |
| Unread indicator | 8px dot, `--color-accent`, absolute left edge |
| Icon | 40×40px, type-specific emoji (see table below) |
| Title | `--text-sm --weight-semibold --color-text-primary` |
| Body | `--text-sm --weight-regular --color-text-secondary`, 2 lines max |
| Timestamp | `--text-xs --color-text-secondary` |
| Tap | Marks read + deep-links via `action_url` |

**Row states:** unread (`--color-accent-bg` background); read (`--color-surface`); pressed (`--color-surface-overlay`).

### Notification Type Icons

| Type | Icon |
| --- | --- |
| `transaction.saved` | ✅ |
| `receipt.draft_ready` | 📄 |
| `budget.warning` | ⚠️ |
| `budget.exceeded` | 🚨 |
| `cycle.started` / `cycle.ending_soon` | 📅 |
| `security.*` | 🔒 |

### Actions

- **"Mark all as read"** in panel header: marks all unread as read, badge clears, rows update
- **Swipe-to-delete row:** permanent delete (no confirmation — low stakes)
- **Tap row:** mark as read + navigate to `action_url`

---

## 4. Loading States

### Which Pattern to Use

| Scenario | Pattern |
| --- | --- |
| Full page/list loading for the first time | Skeleton screen |
| Button action in flight | Button loading state |
| Single field/small region updating | Inline spinner |
| Multi-step async (e.g. receipt scan) | Full-screen overlay |
| Pull-to-refresh | Pull indicator |

**Never** combine two loading patterns for the same action. **Never** show loading state for < 200ms — skip it and render result directly.

### Skeleton Screens

- Skeleton elements match exact dimensions of live content (no layout shift on load)
- Base color: `--color-surface-raised`; shimmer highlight: lighter pass across
- All skeletons in a list shimmer in sync — never individually
- Never show skeleton alongside real data or alongside a spinner

Available variants via `<LoadingSkeleton>`: `transaction-row`, `notification-row`, `summary-card`, `budget-bar`, `text-line`, `circle`.

All skeleton elements: `aria-hidden="true"`. Loading announced via `role="status" aria-live="polite"` live region.

Under `prefers-reduced-motion`: static `--color-surface-raised`, no shimmer animation.

### Inline Spinner

16px inline, 24px standalone. Color `--color-accent`. CSS border trick with rotating top border. Under `prefers-reduced-motion`: `animation: none; opacity: 0.5`.

### Button Loading State

Label replaced with 16px spinner. Button stays same size, stays `--color-accent` background, `opacity: 1.0`, `disabled`. Loading state stays until request resolves. On error: label returns, button re-enables, error toast appears.

**Never disable the Cancel/Back button** during confirm button loading — user must always have an escape.

### Full-Screen Loading Overlay

Used for receipt scan pipeline (3–8 second operations). 32px spinner + status message + sub-message. Back/Cancel button must remain available.

Status message updates progressively: "Uploading…" → "Reading receipt…" → "Extracting items…". Updates announced via `aria-live="polite"`.

---

## 5. Confirmation Dialogs

### When Required

| Action | Dialog? |
| --- | --- |
| Soft-delete (swipe) | ❌ — undo toast is the safety net |
| Permanent delete (transaction, split) | ✅ |
| Budget reset | ✅ |
| Delete notification (swipe) | ❌ — low stakes |
| Log out | ❌ — reversible |

**Rule:** only use a dialog when permanent data loss is the result.

### Anatomy - Confirmation Dialogs

Centered modal: `--color-surface` bg, `--radius-2xl`, `--shadow-lg`, `--space-6` padding, max `min(100vw − 32px, 320px)`. Backdrop `rgba(0,0,0,0.48)` with `backdrop-filter: blur(2px)` at `--z-overlay`.

Layout: Title → `--space-3` gap → body text → `--space-6` gap → two buttons (Cancel secondary left, Confirm danger/primary right).

| Element | Spec |
| --- | --- |
| Title | `--text-lg --weight-bold` — short plain question ("Permanently delete?") |
| Body | `--text-sm --color-text-secondary --leading-relaxed` — what happens + "cannot be undone" |
| Cancel | Always left, always "Cancel" (never "No" or "Go back") |
| Confirm | Right; specific verb ("Delete", "Reset") — not "OK" or "Confirm" |

### States

**Default focus:** Cancel button. Pressing Enter on open should not accidentally confirm.

**Loading (after confirm tap):** confirm button spins, both buttons disabled (`opacity: 0.4`). Dialog stays open until request resolves.

**Error:** confirm loading clears, label returns, buttons re-enable. Error toast appears above dialog ("Couldn't delete. Please try again.").

### Animation - Confirmation Dialogs

Open: scale 0.9→1.0 + fade, `--duration-slow --ease-decelerate`. Close: scale out + fade, `--duration-base --ease-accelerate`. Under `prefers-reduced-motion`: opacity only.

---

## 6. Inline Validation Feedback

### Field Error State

Error message below input, `--text-xs --color-error`, replacing hint text. Border: `1px solid --color-error`. `aria-invalid="true"` on input, `aria-describedby` pointing to error span. Error span: `role="alert" aria-live="polite"`.

### Low-Confidence AI Warning Banner

When `confidenceScore < 0.70` on any draft item: amber banner at top of review screen. `--color-warning-bg` background, 4px `--color-warning` left border, `--radius-sm`, `--space-4` padding. Confirm & Save disabled until all categories selected.

### Exchange Rate Warning

When a transaction uses a non-base currency: info banner showing the exchange rate used and its timestamp. `--color-info-bg` bg, `--color-info` left border. Informational only — does not block save.

---

## 7. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| Inline error below field | Toast for field validation error |
| Undo toast for soft-delete | ConfirmationDialog for soft-delete |
| ConfirmationDialog for permanent delete | Gesture-only permanent delete |
| Cancel button always on left | Confirm (destructive) on left |
| Focus Cancel on dialog open | Focus Confirm button on dialog open |
| Keep Back/Cancel enabled during loading | Disable all buttons during submit |
| Skip loading state for < 200ms responses | Flash loading state for instant responses |
| Skeleton matches live content dimensions | Generic grey block skeletons |
| `aria-live="polite"` for toast container | Silent toast (no ARIA) |
