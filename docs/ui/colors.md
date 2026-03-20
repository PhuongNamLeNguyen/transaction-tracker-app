# Color Usage

> When and why each color token is used. Hex values live in **design_tokens.md**. Never hardcode a hex in a component.

---

## 1. Transaction Type Colors

Four fixed color pairs — mapping never changes across any screen or context.

| Type | Foreground | Background | Sign prefix |
| --- | --- | --- | --- |
| `income` | `--color-income` | `--color-income-bg` | `+` |
| `expense` | `--color-expense` | `--color-expense-bg` | `−` |
| `investment` | `--color-investment` | `--color-investment-bg` | `−` |
| `saving` | `--color-saving` | `--color-saving-bg` | `−` |

**Foreground** → amount text, icon color. **Background** → pill/badge background, card tint, chart fills.

**Amount rules**:

- Always use the type's foreground token — never `--color-text-primary` for an amount
- Always include the sign prefix; never omit it
- Day net subtotal: positive → `--color-income`, negative → `--color-expense`
- Font weight is always `--weight-bold` (700)
- Type colors are **not overridden in dark mode** (same hex in both themes)

---

## 2. Surface Layering

Four-level stack — never skip a level.

| Level | Token | Use |
| --- | --- | --- |
| 0 | `--color-bg` | Page / screen background |
| 1 | `--color-surface` | Cards, list rows, modals, bottom sheets |
| 2 | `--color-surface-raised` | Text inputs, selected rows, hover states |
| 3 | `--color-surface-overlay` | Tap/press ripple (transient) |

A screen (L0) must not directly contain an input (L2) without a card (L1) wrapper in between.

---

## 3. Text Hierarchy

| Token | Use |
| --- | --- |
| `--color-text-primary` | Headings, labels, merchant names, form values |
| `--color-text-secondary` | Timestamps, subtitles, hints, empty-state descriptions |
| `--color-text-tertiary` | Input placeholders, disabled labels only |
| `--color-text-inverse` | Text on filled buttons or colored backgrounds |
| `--color-text-link` | Tappable inline text ("Forgot password?", "View all") |

---

## 4. Interactive Colors

| Token | Use |
| --- | --- |
| `--color-accent` | Primary buttons, active nav tab, selected state |
| `--color-accent-hover` | Primary button press |
| `--color-accent-bg` | Selected row highlight tint |
| `--color-destructive` | "Delete Permanently" button only — not soft-delete |
| `--color-focus-ring` | `:focus-visible` outline (2px solid, 2px offset) |
| `--color-scan-fab` | Center FAB button background |

---

## 5. Budget State Colors

| Utilisation | Token | Non-color signal |
| --- | --- | --- |
| 0–79% | `--color-budget-safe` | Bar within boundary |
| 80–99% | `--color-budget-warning` | ⚠️ icon appears |
| ≥100% | `--color-budget-exceeded` | Bar extends past boundary |

`--color-budget-warning` fails 4.5:1 at normal text size — use at `--text-sm bold` minimum or pair with ⚠️ icon.

---

## 6. Semantic / Feedback Colors

| Variant | Icon/text token | Background token |
| --- | --- | --- |
| Success | `--color-success` | `--color-success-bg` |
| Warning | `--color-warning` | `--color-warning-bg` |
| Error | `--color-error` | `--color-error-bg` |
| Info | `--color-info` | `--color-info-bg` |

Toast body text uses `--color-text-primary`. Background is always the soft `*-bg` tint.

---

## 7. Border & Divider Colors

| Token | Use |
| --- | --- |
| `--color-divider` | List item separators (weakest) |
| `--color-border` | Card outlines, unfocused inputs |
| `--color-border-strong` | Focused inputs, selected cards |

---

## 8. Dark Mode

Activate by setting `data-theme="dark"` on `<html>`. All `var()` tokens update automatically.

**What changes:** surfaces shift to deep warm-dark (`#231408`/`#3D1E0A`/`#2E1608`); text becomes warm cream; `--color-expense` darkens; `--color-accent` lightens; borders become white-alpha.

**What does NOT change:** all four transaction type colors, their background tints, and all semantic feedback foreground colors (`--color-success`, `--color-warning`, `--color-info`).

---

## 9. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| `color: var(--color-expense)` | `color: '#DC2626'` or `color: 'red'` |
| `--color-surface` for cards | `'white'` or `'#FFFFFF'` |
| `--color-bg` for page | `--color-surface` (wrong level) |
| `--color-surface-raised` for inputs | `--color-bg` (wrong level) |
| `--color-destructive` for delete button | `--color-expense` (different purpose) |
| `--color-text-secondary` for timestamps | `--color-text-primary` (over-emphasized) |
| `--color-success-bg` for toast bg | `--color-success` (too saturated) |
| `outline: 2px solid var(--color-focus-ring)` | `outline: none` with no replacement |
