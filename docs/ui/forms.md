# Forms

> Form architecture, layout rules, field states, validation, the review & confirm pattern, and the two-button footer. No form library — all state via `useState`.

---

## 1. Form Architecture

```text
Controlled state (useState)
  → Field components (TextInput, AmountInput, Dropdown, DateTimePicker)
  → Client-side validation on submit (before any API call)
  → API call (only if client validation passes)
  → Server-side validation errors mapped to field errors
  → Review & Confirm screen (all DB-write flows)
  → Final POST / PATCH (only on Confirm & Save)
```

**Standard state pattern**:

```ts
const [form, setForm]               = useState<FormDto>(initialValues)
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
const [isSubmitting, setIsSubmitting] = useState(false)
const [isDirty, setIsDirty]         = useState(false)
const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
```

---

## 2. Layout Rules

- Fields stack **vertically**, single column — no side-by-side fields on mobile
- Gap between fields: `--space-6` (24px)
- Label always **above** the input (`--space-1` gap between label and input) — never inline or placeholder-only
- All fields are **full-width** within their container
- Group related fields inside a `Card size="compact"`, with `--space-6` between groups
- Include once per form: *"Fields marked \* are required."*

---

## 3. Required vs Optional Fields

Required: asterisk `*` in `--color-error` after label text. `aria-hidden="true"` on the asterisk; `aria-required="true"` on the input.

Optional: no asterisk, no "(optional)" suffix.

**Field inventory by form:**

| Form | Required fields |
| --- | --- |
| Transaction entry | Amount, Category, Date & Time |
| AI draft edit | Total amount, Date, per-item Category (if confidence < 0.70), per-item Amount |
| Post-save edit | Amount, Date & Time, Account, Split category, Split amount |
| Budget setup | Cycle start day, Display currency, Budget amount per category |
| Auth | Email, Password |

---

## 4. Field States

Every input must have explicit visual treatment for all states:

| State | Border | Background | Notes |
| --- | --- | --- | --- |
| Default | `--color-border` | `--color-surface-raised` | Placeholder in `--color-text-tertiary` |
| Focused | `--color-border-strong` + focus ring | `--color-surface-raised` | `outline: 2px solid --color-focus-ring; offset: 2px` |
| Filled | `--color-border` | `--color-surface-raised` | Value in `--color-text-primary` |
| Error | `--color-error` | `--color-surface-raised` | Error message below; invalid value not cleared |
| Disabled | `--color-border` @ 0.4 opacity | `--color-bg` | `cursor: not-allowed; opacity: 0.4` |

---

## 5. Inline Validation

**Two-phase approach**:

1. **On submit (first attempt):** validate all fields simultaneously; show all errors at once; block submission
2. **On change (after first failed submit):** real-time — errors clear as field becomes valid, reappear if invalid again

**Rules**:

- One error message per field max — show the highest-priority failing rule
- Plain language only — no error codes or technical terms
- Never show a field validation error in a toast — always inline beneath the field
- **Do not pre-disable the submit button** when required fields are empty (exception: low-confidence AI categories)
- Server-side `VALIDATION_ERROR` responses map `error.details` to field errors, shown inline exactly like client errors; non-validation errors → toast

**Validation rule reference:**

| Field | Rule | Error message |
| --- | --- | --- |
| Amount | `> 0` | "Amount must be greater than 0" |
| Per-item amount | `> 0` | "Item amount must be greater than 0" |
| AI draft split total | Sum = total | "Item amounts do not add up to the total amount" |
| Post-save split total | Sum = transaction amount | "Split amounts do not add up to the transaction total" |
| Budget amount | `> 0` | "Amount must be greater than 0" |
| Budget overall | ≥ 1 category | "Please add at least one budget item" |
| Password | ≥ 8 characters | "Password must be at least 8 characters" |
| Account name | ≤ 50 characters | "Account name must be 50 characters or fewer" |

---

## 6. Amount Field

Currency prefix (non-editable, `--text-sm --weight-medium $text-secondary`) + numeric input (`--font-mono --text-lg --weight-bold`). Both inside one `--space-12` height container, separated by `--color-border`.

`inputMode="decimal"`. Strip non-numeric. Strip leading zeros. Empty state shows placeholder `0` in `--color-text-tertiary`.

---

## 7. Review & Confirm Pattern

**Used on:** manual transaction entry, AI draft confirmation, budget setup wizard, account setup.
**Not used on:** post-save edits, preference settings, auth forms.

**Rule: No data is written to the DB until the user taps Confirm & Save.** Never call `POST`/`PATCH` from the form screen — only from the confirm handler.

**Review screen anatomy:** read-only rows; label column `--text-sm $text-secondary` ~120px fixed; value column `--text-sm $text-primary` flex 1; `--space-3` vertical padding; `--color-divider` separators.

**AI draft warning banner:** shown when any item has `confidenceScore < 0.70`. `--color-warning-bg` background, 4px `--color-warning` left border. Confirm & Save is **disabled** until all low-confidence categories are selected — the only case in the app where a primary button is pre-disabled.

**Transaction entry flow:** `BottomSheet` stays open; content switches in-place between form and review (avoids jarring dismissal/reopen).

---

## 8. Two-Button Footer

Sticky footer on every form and review screen.

**Layout:** top `1px --color-divider`; padding `--space-5` top, `--space-7` horizontal, `calc(--space-5 + --space-safe-bottom)` bottom; two buttons `--space-3` gap, both `flex: 1`.

| Position | Variant | Label |
| --- | --- | --- |
| Left | `secondary` | "← Back" (review) or "Cancel" (modal) |
| Right | `primary` or `danger` | "Next" / "Submit" / "Confirm & Save" / "Delete Permanently" |

Positioned `sticky; bottom: 0; z-index: --z-raised; background: --color-surface` in full-screen forms; `flexShrink: 0` at bottom of BottomSheet flex column.

---

## 9. Form-Specific Patterns

| Form | Container | Review step | Notes |
| --- | --- | --- | --- |
| Transaction entry | BottomSheet | In-place content swap | Type shown as read-only tag; field order: Amount → Category → Date → Note |
| AI draft edit | Full screen | Same screen (edit/read-only toggle) | Low-confidence items always show dropdown until selected |
| Budget setup | 3-step wizard BottomSheet | Step 3 | Each step validates independently before advancing; Back doesn't lose data |
| Settings preferences | BottomSheet | None | Single field; toggle/segmented controls save immediately on tap |
| Auth (login/register) | Full-screen route | None | Single submit button; no two-button footer |

---

## 10. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| Show errors inline beneath the field | Show field errors in a toast |
| Show all errors on first submit attempt | Pre-disable submit (exception: AI low-confidence) |
| Clear errors as user fixes the field | Keep stale errors after valid input |
| `POST` only from confirm handler | Write to DB from form submit handler |
| Keep invalid value visible in error state | Clear the field on error |
| Label above input | Placeholder as sole label |
| "Amount must be greater than 0" | "Invalid input" |
| Two-button footer sticky at bottom | Buttons inside scrollable content |
