# Components

> Every reusable UI component — anatomy, variants, props, states. Reference this before building any screen. All tokens from **design_tokens.md**.

**Token shorthand used below:** `$surface` = `var(--color-surface)`, `$bg` = `var(--color-bg)`, `$accent` = `var(--color-accent)`, `$text-primary` = `var(--color-text-primary)`, `$text-secondary` = `var(--color-text-secondary)`, `$error` = `var(--color-error)`.

**Component conventions**:

- File location: `frontend/src/components/{domain}/{ComponentName}.tsx`; common components in `frontend/src/components/common/`
- Every interactive component must handle: default, hover/press, focused, disabled, loading (where applicable), error (where applicable)
- Components hold only UI state. Data fetching in hooks, passed via props.
- No Tailwind. No hardcoded values. No `any` types.

---

## Button

| Variant | Background | Text | Use |
| --- | --- | --- | --- |
| `primary` | `$accent` | `--color-text-inverse` | Main action — Confirm & Save, Next |
| `secondary` | `--color-surface-raised` | `$text-primary` + `1px $border` | Back, Cancel |
| `danger` | `--color-destructive` | `--color-text-inverse` | Delete Permanently only |
| `ghost` | transparent | `$accent` | Inline de-emphasized actions |

**Dimensions:** height `--space-12` (48px) default, 36px small; radius `--radius-sm`; font `--text-sm --weight-semibold`; width 100% by default.

**States:** hover → `--color-accent-hover` / `--color-destructive-hover`; disabled → `opacity: 0.4, cursor: not-allowed`; loading → spinner replaces label, maintains size.

**Props:** `variant`, `loading`, `disabled`, `fullWidth` (default true), `size` (default/small), `onClick`, `type` (button/submit).

---

## TextInput

**States:**

| State | Border | Background |
| --- | --- | --- |
| Default | `--color-border` | `--color-surface-raised` |
| Focused | `--color-border-strong` + focus ring | `--color-surface-raised` |
| Error | `--color-error` | `--color-surface-raised` |
| Disabled | `--color-border` at 0.4 opacity | `--color-bg` |

**Anatomy:** label above (`--text-sm --weight-medium`); input `--space-12` height, `--radius-sm`; error/hint below (`--text-xs`); required asterisk `aria-hidden="true"` in `--color-error`.

**Props:** `label`, `value`, `onChange`, `placeholder`, `error`, `hint`, `required`, `disabled`, `maxLength`, `type` (text/email/password).

---

## AmountInput

Specialized numeric input for currency. Currency prefix non-editable, separated by border.

**Input area:** `--font-mono`, `--text-lg`, `--weight-bold`. Same focus/error states as TextInput.

**Props:** `value` (number | ''), `onChange`, `currency` (ISO 4217), `error`, `disabled`, `label`, `required`.

**Constraint:** `inputMode="decimal"`. Never accept non-numeric characters. Strip leading zeros.

---

## Dropdown / Select

**States:** default (placeholder in `$text-tertiary`); focused/open (`--color-border-strong` + focus ring); error; disabled (0.4 opacity).

Options panel: `$surface`, `--radius-sm`, `--shadow-md`, `z-index: --z-dropdown`. Each option `--space-12` min-height, `--space-4` padding. Selected item: `--color-accent-bg` background + checkmark.

**Props:** `label`, `value`, `onChange`, `options: {value, label, icon?}[]`, `placeholder`, `error`, `disabled`, `required`, `searchable`.

---

## DateTimePicker

Same states as TextInput. Default value = current datetime in user's timezone (never UTC).

**Props:** `label`, `value` (ISO 8601), `onChange`, `error`, `disabled`, `required`, `showTime` (default true), `timeZone`.

---

## TransactionRow

The most common component. Appears in transaction lists, dashboard log, search results. Wraps `SwipeRow`.

**Anatomy:** icon container 40×40px on left (`--color-{type}-bg`), category/merchant label (primary `--text-base --weight-semibold`), note + date (secondary `--text-sm`), amount right-aligned (`--font-mono --weight-bold --color-{type}`).

Multiple splits: icon shows stack indicator, label shows "Multiple items". Receipt scan: 📷 icon beside merchant name.

**States:** default `$surface`; pressed `--color-surface-overlay` overlay.

---

## SplitRow

Single `transaction_splits` row within a transaction detail. Same spacing as TransactionRow but amount `--text-sm`. Tapping opens edit modal.

---

## Card

Base surface container.

| Variant | Padding | Radius | Shadow |
| --- | --- | --- | --- |
| `default` | `--space-5` | `--radius-md` | `--shadow-card` |
| `hero` | `--space-6` | `--radius-xl` | `--shadow-card` |
| `compact` | `--space-3` | `--radius-sm` | `--shadow-sm` |

**Props:** `children`, `size` (default/hero/compact), `noPadding`, `style`.

---

## SummaryCard

One of four monthly total cards on dashboard (income/expenses/investments/savings).

Uses `Card size="hero"`. Icon container 36×36px `--radius-sm --color-{type}-bg`. Amount: `--text-xl --weight-extrabold --font-mono --color-{type}`.

**Props:** `type`, `amount`, `currency`, `label`.

---

## CategoryPill

Small pill tag with icon and category name.

`border-radius: --radius-full`. Background: `--color-{type}-bg`. Text/icon: `--color-{type}`. Padding: `--space-1` vertical, `--space-3` horizontal. Font: `--text-xs --weight-medium`.

**Props:** `name`, `icon`, `type`, `size` (default/small).

---

## BudgetProgressBar

Shows actual vs budget for one category. See **colors.md § 5** for state thresholds.

**States:**

| Utilisation | Bar color | Show |
| --- | --- | --- |
| 0–79% | `--color-budget-safe` | Normal |
| 80–99% | `--color-budget-warning` | ⚠️ icon + warning row tint |
| ≥100% | main `--color-budget-safe`, excess `--color-budget-exceeded` | Excess bar extends past boundary + exceeded row tint |

Bar height 8px, `--radius-full`, track `--color-budget-bar-track`. Labels `--font-mono --text-xs`. Animate on mount: `--duration-xslow --ease-decelerate`. Must use `role="progressbar"` with `aria-valuetext`.

**Props:** `categoryName`, `categoryIcon`, `budgetAmount`, `actualAmount`, `currency`, `locale`.

---

## SwipeRow

Wrapper adding swipe gesture support to any row.

| Swipe | < 50% | ≥ 50% |
| --- | --- | --- |
| Left | Show delete action (80px); snap back | Fire `onDelete` |
| Right | Show restore action (80px); snap back | Fire `onRestore` |

Soft-delete bg: `--color-budget-warning`. Permanent-delete bg: `--color-destructive`. Restore bg: `--color-income`. Snap animation: `--ease-spring --duration-base`. Undo toast is parent's responsibility.

**Props:** `children`, `onDelete`, `onRestore`, `deleteLabel`, `restoreLabel`, `deleteVariant` (soft/permanent), `disabled`.

---

## BottomSheet

Full-featured bottom sheet modal.

**Anatomy:** drag handle 36×4px centered at top; optional title + close × button (44×44px); scrollable content `--space-7` horizontal padding; footer with two buttons `--space-5` bottom + `--space-safe-bottom`.

**States:** closed (off-screen), opening (slide up `--duration-slow --ease-decelerate`), open, closing (slide down `--duration-base --ease-accelerate`).

**Rules:** focus trap while open; background `aria-hidden="true"`; Escape key closes; backdrop tap closes; focus returns to trigger on close.

**Props:** `isOpen`, `onClose`, `title`, `children`, `footer`.

---

## ConfirmationDialog

Modal dialog for destructive or irreversible actions.

**Anatomy:** centered, max 320px, `--radius-lg --shadow-lg --space-7` padding. Optional icon at top, title (`--text-lg --weight-bold`), description (`--text-sm $text-secondary`), two buttons (Cancel secondary + Confirm primary/danger).

**Focus:** moves to Cancel button on open. Escape key closes.

**Variants:** `delete` (danger confirm), `discard` (secondary confirm), `confirm` (primary confirm).

---

## Toast

| Variant | Icon | Token |
| --- | --- | --- |
| success | ✅ | `--color-success` / `--color-success-bg` |
| warning | ⚠️ | `--color-warning` / `--color-warning-bg` |
| error | ❌ | `--color-error` / `--color-error-bg` |
| info | ℹ️ | `--color-info` / `--color-info-bg` |

**Anatomy:** icon + message text (`$text-primary`) + optional Undo button. 4px left border in foreground color. `--radius-sm --shadow-md`. Icons must never be removed.

**Position:** top-center, fixed, `--z-toast`. Container: `role="status" aria-live="polite" aria-atomic="true"`.

**Durations:** success/info 3s; warning/error 5s; undo toast 3s (timer pauses on focus).

---

## NotificationRow

Used inside the notification centre panel.

**Anatomy:** unread dot (8px `--color-accent` left edge), icon 40×40px, title (`--text-sm --weight-semibold`), body (`--text-sm $text-secondary`), timestamp (`--text-xs $text-secondary`).

**States:** unread (`--color-accent-bg` background); read (`$surface`); pressed (`--color-surface-overlay`).

---

## LoadingSkeleton

Placeholder shown during data loading. `aria-hidden="true"` on all skeleton blocks; announce loading via live region.

Shimmer animation: `--color-surface-raised` → slightly lighter → back, `--duration-loading` loop. Under `prefers-reduced-motion`: static `--color-surface-raised`, no shimmer.

Skeleton shapes match the component they replace (text lines, card outlines, circular icons).

---

## EmptyState

**Anatomy:** centered column; decorative emoji/illustration (`aria-hidden="true"`); title `--text-lg --weight-bold`; description `--text-sm $text-secondary`; optional CTA button.

**Props:** `icon`, `title`, `description`, `action?: { label, onPress }`.

---

## ScanFAB

Floating action button centered in the bottom navbar.

**Anatomy:** 56×56px circle, `--color-scan-fab`, `--radius-full`, `--shadow-fab`, `--z-fab`. Icon `+` 24px white.

**Expanded state:** four type option buttons expand upward in a stacked menu (income/expense/investment/saving), each with type icon + label.

**Dismiss:** tap backdrop, tap FAB again, or Escape. `aria-label="Add transaction"`.

---

## BottomNavbar

`<nav aria-label="Main navigation">`. 5 equal-width tabs, height `--space-16` + `--space-safe-bottom`, `$surface` background, top border `--color-border`.

Tab icons 24px; labels `--text-2xs --weight-medium`. Active tab: icon + label in `$accent`. Scan FAB in center slot elevated above navbar.

**Tabs:** Home, Transactions, [Scan FAB], Budget, Settings.

---

## ConfidenceWarningBanner

Shows when AI receipt parsing has low confidence on one or more fields.

**Anatomy:** `--color-warning-bg` background, `--color-warning` left border 4px, ⚠️ icon, message text. Appears above the form on the AI draft review screen.

---

## ImagePreview

Receipt image viewer with optional overlay controls.

Shows the uploaded receipt image, expand/zoom control, retry scan button if scan failed.

---

## ReviewScreen

The review-and-confirm step before writing to server. Shows all transaction fields read-only with an optional `ConfidenceWarningBanner` at the top. Two-button footer: Back (secondary) + Confirm & Save (primary).
