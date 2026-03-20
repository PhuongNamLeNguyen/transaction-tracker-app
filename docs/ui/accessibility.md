# Accessibility

> Single source of truth for accessibility. Targets WCAG 2.1 Level AA minimum. **This file overrides all other docs on accessibility questions.** All AI-generated and human-written components must satisfy every rule here before being considered complete.

---

## 1. Principles

**Perceivable.** Color alone never conveys meaning — always paired with text, icon, prefix, or shape.

**Operable.** Every element reachable without a pointer. Touch targets ≥ 44×44px. Focus order follows reading order.

**Understandable.** Error messages name the field and explain the fix. Labels always visible, never hidden as placeholders.

**Robust.** Semantic HTML + correct ARIA. VoiceOver (iOS) and TalkBack (Android) must navigate every screen.

**Consistent.** Same component always behaves the same way.

**Progressive.** Built in from the start — not retrofitted.

---

## 2. Contrast Ratios

### Thresholds (WCAG 2.1)

| Level | Normal text | Large text (≥18px or ≥14px bold) | UI components & graphics |
| --- | --- | --- | --- |
| AA (minimum) | **4.5:1** | **3.0:1** | **3.0:1** |

### Light Mode — Key Pairings

| Foreground | Background | Ratio | Status |
| --- | --- | --- | --- |
| `--color-text-primary` `#3D1A06` | `--color-bg` `#FFFAF5` | 16.8:1 | ✅ AAA |
| `--color-text-primary` `#3D1A06` | `--color-surface` `#FFFFFF` | 17.4:1 | ✅ AAA |
| `--color-text-secondary` `#E07B39` | `--color-bg` `#FFFAF5` | 3.1:1 | ✅ AA large text only |
| `--color-text-secondary` `#E07B39` | `--color-surface-raised` `#FEF0E0` | 2.8:1 | ⚠️ Large text only |
| `--color-income` `#22863A` | `--color-surface` `#FFFFFF` | 5.1:1 | ✅ AA |
| `--color-expense` `#DC2626` | `--color-surface` `#FFFFFF` | 4.6:1 | ✅ AA |
| `--color-investment` `#7C3AED` | `--color-surface` `#FFFFFF` | 5.9:1 | ✅ AA |
| `--color-saving` `#2563EB` | `--color-surface` `#FFFFFF` | 5.9:1 | ✅ AA |
| `--color-error` `#DC2626` | `--color-surface` `#FFFFFF` | 4.6:1 | ✅ AA |
| `--color-budget-warning` `#D97706` | `--color-surface` `#FFFFFF` | 3.2:1 | ⚠️ Large text only |
| Focus ring `#9C4A18` | `#FFFFFF` | 5.8:1 | ✅ |

**Important restrictions**:

- `--color-text-secondary` on `--color-surface-raised` (2.8:1): **large text only** (`--text-lg`+ or `--text-sm bold`+)
- `--color-budget-warning` text: **large text only**, or paired with ⚠️ icon
- `--color-text-tertiary`: for placeholder text only (WCAG exempts inactive UI components)

### Dark Mode — Key Pairings

All pass AA; `--color-text-secondary` (#C8906A) achieves 4.6:1 on `--color-surface` resolving light mode friction point.

### UI Components & Graphics (WCAG 1.4.11)

Focus ring, error borders, budget bar fills — all ≥ 3.0:1 vs adjacent background. Default input border (`--color-border`) is decorative and exempt.

### Rules

- Failing pairing for normal text → cannot be used for normal text, period
- Fixes that require changing a palette token → update `design_tokens.md` first, then update components
- Always check both light and dark mode before marking a component complete

---

## 3. Tap Target Sizes

**Minimum: 44×44px** on all interactive elements (Apple HIG, WCAG 2.5.5 AAA / 2.5.8 AA).

`--space-12` (48px) is the standard interactive component height — provides 4px buffer.

**The minimum applies to the tap area, not the visual size.** Use fixed-size wrapper for icons smaller than 44px:

```tsx
<button onClick={onPress} aria-label={label} style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
  {icon}  {/* 24×24 visual */}
</button>
```

**Adjacent targets:** ≥ 8px apart.

| Component | Tap target |
| --- | --- |
| Buttons, inputs, list rows | Intrinsic 48px height |
| Bottom navbar tabs | Intrinsic 64px height |
| Scan FAB | Intrinsic 56px |
| Top bar icons, bell, close × | 44×44px fixed wrapper |
| Checkbox / toggle | 44×44px fixed wrapper |
| Drag handle | 44×44px fixed wrapper |

---

## 4. Focus Management

### The Focus Ring

```css
:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
:focus:not(:focus-visible) { outline: none; }
```

`outline: none` is forbidden without an equivalent visible replacement. The ring must not be clipped by `overflow: hidden` on a parent.

### Focus Order

- Never use `tabIndex > 0`
- DOM order must match visual order (no CSS-only reordering)
- Tab sequence: Top bar back → Top bar right action → Screen content (top to bottom) → Bottom navbar tabs
- Within forms: label (not focusable) → input → hint/error (not focusable) → next input → submit

### Focus Trapping in Modals

While a bottom sheet or dialog is open:

1. Focus moves to first focusable element on open
2. Tab/Shift+Tab cycle only within the modal
3. Escape closes and restores focus
4. Background content gets `aria-hidden="true"`

### Focus Restoration

When a modal closes, focus returns to the trigger element. Save trigger ref on open, restore on close.

### Programmatic Focus on Open

| Surface | Initial focus target |
| --- | --- |
| Bottom sheet | First focusable element (usually first input) |
| Confirmation dialog | **Cancel button** (prevents accidental destructive action) |
| New page | `<h1>` or first interactive element |
| Toast | No focus — announced via `aria-live` |
| Inline error after submit | First field with error |

---

## 5. Screen Reader Labels

### Priority Order for Accessible Names

1. `aria-labelledby`
2. `aria-label`
3. `<label htmlFor>` / `id`
4. Visible text content
5. `alt` attribute

### Required Labels by Component

| Component | Treatment |
| --- | --- |
| Bell icon button | `aria-label="Notifications — 3 unread"` or `"Notifications"` |
| Top bar back button | `aria-label="Back"` |
| Top bar right action | `aria-label="Edit transaction"` (context-specific) |
| Scan FAB | `aria-label="Add transaction"` |
| Close × on sheet | `aria-label="Close"` |
| Category/type icons | `aria-hidden="true"` (decorative) |
| Unread badge | `aria-hidden="true"`; count in bell button `aria-label` |
| Pie chart SVG | `role="img"` + `aria-label="Expense breakdown for March 2026"` |
| Pie chart segment | `aria-label="Food & Dining: ¥42,000, 28.3%"` |
| Budget progress bar | `role="progressbar"` + `aria-valuemin/max/now/text` |
| Loading skeleton | `aria-hidden="true"` |
| Spinner | `role="status" aria-label="Loading"` |
| Required asterisk | `aria-hidden="true"` on `<span>`; `aria-required="true"` on input |
| Form error | `aria-invalid="true"` + `aria-describedby` pointing to error span |

**Budget progress bar ARIA**:

```tsx
<div role="progressbar" aria-valuemin={0} aria-valuemax={budgetAmount} aria-valuenow={Math.min(actual, budget)} aria-valuetext={`${formattedActual} of ${formattedBudget} — ${pct}%`}>
```

### Live Regions

| Region | `aria-live` | Use |
| --- | --- | --- |
| Toast container | `"polite"`, `aria-atomic="true"` | Toast messages |
| Inline field error | `"polite"`, `aria-atomic="false"` | Validation errors |
| Loading status | `"status"` (= polite) | "Uploading…", "Reading receipt…" |
| Critical server error | `"assertive"` | Only for genuinely urgent errors |

Use `aria-live="polite"` even when `role="alert"` is used for field errors — field errors are not emergencies.

### Semantic HTML Requirements

| Purpose | Use | Not |
| --- | --- | --- |
| Navigation | `<a href>` or `<Link>` | `<div onClick>` |
| Action (no nav) | `<button>` | `<div onClick>` |
| Page heading | `<h1>` | `<div class="heading">` |
| Bottom navbar | `<nav aria-label="Main navigation">` | `<div>` |
| Page main content | `<main>` | `<div>` |
| Form | `<form>` | `<div>` |
| Dialog | `<div role="alertdialog" aria-modal="true" aria-labelledby aria-describedby>` | `<div>` |

### Form Accessibility Pattern

```tsx
<label htmlFor="amount-input">
  Amount <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>
</label>
<input id="amount-input" aria-required="true" aria-invalid={!!error} aria-describedby={error ? 'amount-error' : hint ? 'amount-hint' : undefined} />
{error && <span id="amount-error" role="alert" aria-live="polite" style={{ color: 'var(--color-error)' }}>❌ {error}</span>}
```

---

## 6. Reduced Motion

Global rule in `global.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

**For slides that carry content** (bottom sheets, page transitions): don't make instant — reduce to **opacity-only fade** instead:

```css
@media (prefers-reduced-motion: reduce) {
  .bottom-sheet { transform: none !important; transition: opacity 200ms ease !important; }
}
```

| Animation | Under reduced motion |
| --- | --- |
| Pie chart draw-in | Segments appear at final opacity instantly |
| Budget bar fill | Bar renders at final width immediately |
| Toast slide-in | Fade only (no movement) |
| Bottom sheet / page transition | Opacity fade only (no slide) |
| Skeleton shimmer | Static `--color-surface-raised` |
| Swipe snap-back | Instant |
| Scan FAB expand | Options appear instantly |

**Not disabled:** focus ring, color transitions on budget bars, error state appearance, toast countdown timer.

---

## 7. Color-Blind Safe Patterns

### Income vs Expense (critical pair)

Four independent signals — no single one is color alone:

| Signal | Income | Expense |
| --- | --- | --- |
| Sign prefix | `+¥320,000` | `−¥3,500` |
| Type label | "Income" / "Received" | "Expense" / "Spent" |
| Category context | "Salary", "Freelance" | "Food & Dining" |
| Color | Green | Red |

Sign prefix and type label are always present. Color is the fourth signal, not the first.

### Budget State (warning/exceeded)

| State | Non-color signal |
| --- | --- |
| Warning (80–99%) | ⚠️ icon beside category name + percentage label |
| Exceeded (>100%) | Bar extends past boundary (shape cue) + >100% label |

### Semantic Feedback (toasts, notifications)

Each variant has an icon (✅ ⚠️ ❌ ℹ️) that is always present. Icons must never be removed.

### Checklist Before Releasing Any Color-Coded Component

- [ ] Meaning survives grayscale screenshot
- [ ] Sign prefix (`+`/`−`) on all transaction amounts
- [ ] Every chart has text legend with amounts and percentages
- [ ] Warning/error states have icon (⚠️ / ❌)
- [ ] Over-budget bar extends past boundary
- [ ] Toast variants have emoji icon
- [ ] Field error uses border + text message + ❌ icon

---

## 8. Additional Requirements

**Language:** `document.documentElement.lang = settings.systemLanguage` on settings change.

**Page titles:** `"{Screen Name} — Transaction Tracker"` — updated on every screen mount.

**Undo toast timer:** pauses while toast has keyboard focus; provides extended window for screen reader users. Never reduce below 3 seconds.

**Swipe gesture alternatives:** long-press context menu or "···" action button as single-pointer alternatives to swipe-to-delete. Pull-to-refresh must have a Refresh button alternative.

---

## 9. Component Accessibility Checklist

Run before marking any component complete.

**Semantics**:

- [ ] Correct HTML element used
- [ ] No `<div onClick>` without role, tabIndex, keyboard handlers
- [ ] All interactive elements have accessible name
- [ ] Decorative icons `aria-hidden="true"`
- [ ] Form inputs: `htmlFor/id`, `aria-required`, `aria-invalid`, `aria-describedby`

**Contrast**:

- [ ] All text ≥ 4.5:1 light mode (or ≥ 3.0:1 confirmed large text)
- [ ] All text ≥ 4.5:1 dark mode
- [ ] UI component contrast ≥ 3.0:1
- [ ] Focus ring ≥ 3.0:1 both modes

**Focus**:

- [ ] All interactive elements keyboard-reachable
- [ ] Focus ring visible (`:focus-visible` not suppressed without replacement)
- [ ] Focus order matches reading order
- [ ] Modals trap focus while open
- [ ] Focus restored to trigger on modal close
- [ ] Programmatic focus set on modal open

**Motion**:

- [ ] All animations respect `prefers-reduced-motion`
- [ ] Slides → opacity fades under reduced motion
- [ ] Skeleton shimmer → static color

**Color blindness**:

- [ ] Meaning doesn't rely on color alone
- [ ] Warning states have ⚠️ icon
- [ ] Error states have ❌ icon or text message
- [ ] Transaction amounts have sign prefixes
- [ ] Charts have text legends

**Screen reader**:

- [ ] Dynamic content via `aria-live` or `role="alert"`
- [ ] Toasts in `role="status" aria-live="polite"` container
- [ ] Dialog has `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`
- [ ] Background `aria-hidden="true"` while modal open

**Touch targets**:

- [ ] All interactive elements ≥ 44×44px
- [ ] Adjacent targets ≥ 8px apart

---

## 10. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| `aria-label="Back"` on icon button | Leave `aria-label` absent |
| `aria-hidden="true"` on decorative icon | Let screen reader announce emoji name |
| `aria-invalid="true"` + `aria-describedby` on error | Style border red only |
| `aria-required="true"` on input; `aria-hidden="true"` on `*` | Asterisk alone |
| Sign prefix `+`/`−` always on amounts | Color only for transaction type |
| ⚠️ icon + % label for budget warning | Color change on bar only |
| `role="status" aria-live="polite"` on toast container | No ARIA on toast |
| Move focus to Cancel on dialog open | Leave focus behind dialog |
| Restore focus to trigger on modal close | Leave focus at top of document |
| Opacity fade under `prefers-reduced-motion` | Kill all transitions (instant appearance) |
| `aria-hidden="true"` on skeleton blocks | `role="status"` on each block |
| `:focus-visible` with focus ring | `outline: none` with no replacement |
| Swipe gesture + button alternative | Swipe as only path to delete |
| `role="img"` + `aria-label` on SVG chart | Bare `<svg>` with no accessible name |
| `role="progressbar"` + ARIA attrs on budget bar | `<div>` visual bar with no ARIA |
