# Typography

> Font family, type scale, weights, line heights, per-element rules, number formatting, and truncation. No component may hardcode font sizes, weights, or line heights — use tokens. For color on text see **colors.md**.

---

## Font Families

- **`--font-sans`** — all UI text (labels, headings, body, buttons, navigation)
- **`--font-mono`** — financial amounts only (digit alignment in lists)

---

## Type Scale

| Token | Value | Usage |
| --- | --- | --- |
| `--text-2xl` | 28px | Screen titles — sparingly |
| `--text-xl` | 22px | Section headings, dashboard totals |
| `--text-lg` | 18px | Sub-section headings, large amounts |
| `--text-base` | 16px | **Body default** — list labels, form values |
| `--text-sm` | 14px | Supporting content, button labels, hints |
| `--text-xs` | 12px | Metadata, timestamps, captions, badges |
| `--text-2xs` | 10px | Fine print only — never for interactive or actionable content |

---

## Font Weight Scale

| Token | Value | Usage |
| --- | --- | --- |
| `--weight-regular` | 400 | Body, secondary labels, hints |
| `--weight-medium` | 500 | Nav labels, category pills |
| `--weight-semibold` | 600 | Button labels, list row primary labels |
| `--weight-bold` | 700 | Screen titles, **all financial amounts**, headings |
| `--weight-extrabold` | 800 | Dashboard monthly totals only |

---

## Line Heights

| Token | Value | Usage |
| --- | --- | --- |
| `--leading-none` | 1 | Single-line display (amounts, badges) |
| `--leading-tight` | 1.25 | Headings |
| `--leading-snug` | 1.375 | Subheadings, buttons |
| `--leading-normal` | 1.5 | **Body default** |
| `--leading-relaxed` | 1.625 | Hint text, descriptions |

---

## Per-Element Usage Rules

### Titles & Headers

| Element | Size | Weight | Leading | Tracking |
| --- | --- | --- | --- | --- |
| Screen title (top bar) | `--text-xl` | `--weight-bold` | `--leading-tight` | `--tracking-tight` |
| Section heading | `--text-lg` | `--weight-bold` | `--leading-tight` | `--tracking-normal` |
| Sub-section heading | `--text-base` | `--weight-semibold` | `--leading-snug` | `--tracking-normal` |
| Dashboard period label | `--text-sm` | `--weight-medium` | `--leading-snug` | `--tracking-normal` |

### List Content

| Element | Size | Weight | Leading |
| --- | --- | --- | --- |
| Transaction row — primary label | `--text-base` | `--weight-semibold` | `--leading-normal` |
| Transaction row — secondary label | `--text-sm` | `--weight-regular` | `--leading-normal` |
| Transaction row — metadata | `--text-xs` | `--weight-regular` | `--leading-normal` |
| Day group header | `--text-xs` | `--weight-semibold` | `--leading-normal` (tracking-wide, uppercase) |

### Financial Amounts — `--font-mono`, `--weight-bold` always

| Element | Size | Weight |
| --- | --- | --- |
| Dashboard monthly total | `--text-xl` | `--weight-extrabold` |
| Dashboard account balance | `--text-2xl` | `--weight-extrabold` |
| Transaction row amount | `--text-base` | `--weight-bold` |
| Split row amount | `--text-sm` | `--weight-bold` |
| Amount input field | `--text-lg` | `--weight-bold` |
| Budget bar label (¥42k / ¥52k) | `--text-xs` | `--weight-regular` |
| Day net subtotal | `--text-sm` | `--weight-bold` |

### Labels & Captions

| Element | Size | Weight |
| --- | --- | --- |
| Form field label | `--text-sm` | `--weight-medium` |
| Form hint / helper text | `--text-xs` | `--weight-regular` (leading-relaxed) |
| Inline validation error | `--text-xs` | `--weight-regular` (leading-relaxed) |
| Category badge / pill | `--text-xs` | `--weight-medium` |
| Timestamp | `--text-xs` | `--weight-regular` |
| Toast message | `--text-sm` | `--weight-regular` |

### Buttons

All button labels: `--text-sm`, `--weight-semibold`, `--leading-none`. Sentence case always — never all-caps.

### Inputs

Input value text: `--text-base`, `--weight-regular`. Amount input: `--font-mono`, `--text-lg`, `--weight-bold`.

---

## Number Formatting Rules

- **Currency amounts:** always `--font-mono`, `--weight-bold`; include currency code/symbol; never truncate; sign prefix `+`/`−` always present
- **Percentages:** always 1 decimal place (e.g. `80.0%`, not `80%`)
- **Never apply letter-spacing to amounts** — breaks digit alignment

---

## Truncation Rules

- Allowed only on: merchant names, notes, category names, notification body text
- **Never truncate:** amounts, error messages, button labels
- Always use `text-overflow: ellipsis` with `overflow: hidden; white-space: nowrap`
- Truncated element must have `title={fullText}` for accessibility

---

## Global Base CSS

```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: var(--leading-normal);
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

.amount {
  font-family: var(--font-mono);
  font-weight: var(--weight-bold);
  line-height: var(--leading-none);
}

input::placeholder, textarea::placeholder { color: var(--color-text-tertiary); }

:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
```
