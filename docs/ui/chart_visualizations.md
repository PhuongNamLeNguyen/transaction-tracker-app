# Charts & Visualizations

> Pie chart, budget progress bars, monthly summary cards, category-to-color mapping, empty states, and loading skeletons.

---

## 1. Category-to-Color Mapping

**Fixed mapping — never changes across any visualization:**

| Type         | Segment/amount       | Background/tint         |
| ------------ | -------------------- | ----------------------- |
| `income`     | `--color-income`     | `--color-income-bg`     |
| `expense`    | `--color-expense`    | `--color-expense-bg`    |
| `investment` | `--color-investment` | `--color-investment-bg` |
| `saving`     | `--color-saving`     | `--color-saving-bg`     |

**Multi-category within one type:** use **opacity steps** of the type foreground (not different hues). Sorted descending by spend: largest category = 1.00 opacity, each subsequent -0.10, floor at 0.35. Categories beyond 10 collapse into an "Other" bucket at floor opacity.

**Rules**:

- Segment fill and legend dot use the same opacity step
- Legend amounts always use full type foreground (no opacity step) for readability
- Never introduce a hue from a different type into a chart

---

## 2. Pie Chart — Category Breakdown

### Anatomy

Donut chart (SVG `<circle>` stroke-dasharray — no third-party library) + type selector tab above + legend list below.

**Dimensions:**

| Property       | Value                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Outer diameter | 200px (scales to `min(200px, 50vw)`)                                                                  |
| Donut hole     | 100px (50%)                                                                                           |
| Stroke width   | 50px                                                                                                  |
| Segment gap    | 2px arc gap between adjacent segments                                                                 |
| Center label   | Type total: `--text-lg --weight-extrabold --font-mono`; Type name: `--text-xs --color-text-secondary` |

### Segment Behavior

- **Default:** all segments at calculated size
- **Tapped:** segment pulls outward 4px (stroke-dashoffset shift); center label shows category name + individual total
- **Deselect:** tap active segment again, tap center, or tap outside → returns to type total
- Segments < 2° are rendered but not individually tappable; legend row still tappable

### Type Selector Tab (segmented control)

4 tabs above the chart. Active: `--color-surface` bg, `--radius-xs`, `--shadow-xs`, `--weight-semibold --color-text-primary`. Inactive: `--color-text-secondary`. Container: `--color-surface-raised` bg, `--radius-sm`, `--space-1` padding. Height: `--space-8` (32px). Tab switch: chart fades out then redraws with new data.

### Legend List

Below chart, ordered by descending spend. "Other" always last.

| Element       | Spec                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| Legend dot    | 10×10px `--radius-full`, opacity-stepped color                                  |
| Category name | `--text-sm --weight-regular --color-text-primary`, truncate at 24 chars         |
| Amount        | `--text-sm --weight-bold --font-mono --color-{type}` (full color)               |
| Percentage    | `--text-sm --weight-regular --color-text-secondary`, always 1 decimal (`28.3%`) |
| Row padding   | `--space-3` vertical, `--space-4` horizontal; `min-height: --space-10`          |
| Row divider   | `1px solid --color-divider`                                                     |

**Total row:** below legend, `1px solid --color-border` separator (stronger), bold amount + `100.0%`.

**Interaction:** tap legend row → navigate to `/transactions` filtered by that category.

### Animation

| Trigger              | Animation                 | Duration                               | Easing                                  |
| -------------------- | ------------------------- | -------------------------------------- | --------------------------------------- |
| Initial load         | Draw in clockwise from 0° | `--duration-xslow`                     | `--ease-decelerate`                     |
| Tab switch           | Fade out + redraw         | `--duration-base` + `--duration-xslow` | `--ease-standard` + `--ease-decelerate` |
| Segment tap/deselect | Pull out / return 4px     | `--duration-fast`                      | `--ease-spring`                         |

All animations: `prefers-reduced-motion` safe (instant opacity fallback).

### SVG Implementation (key parameters)

ViewBox `0 0 200 200`. Circle: `cx=100 cy=100 r=75 fill=none stroke={color} strokeWidth=50 strokeLinecap=butt`. Transform: `rotate(${(offset/100*360) - 90}deg)` from center.

---

## 3. Budget Progress Bars

### Bar States

| Utilisation | Bar fill                                                     | Label color               | Row bg tint                  |
| ----------- | ------------------------------------------------------------ | ------------------------- | ---------------------------- |
| 0–79%       | `--color-budget-safe`                                        | `--color-text-secondary`  | none                         |
| 80–99%      | `--color-budget-warning`                                     | `--color-budget-warning`  | `--color-budget-warning-bg`  |
| 100%        | `--color-budget-safe`                                        | `--color-text-secondary`  | none                         |
| >100%       | main `--color-budget-safe`, excess `--color-budget-exceeded` | `--color-budget-exceeded` | `--color-budget-exceeded-bg` |

### Over-Budget Rendering

Two connected segments:

1. **Budget portion:** fills 100% of bar container, `--color-budget-safe`
2. **Boundary marker:** 2px vertical line `--color-text-primary` at 100% position
3. **Excess portion:** extends right, `--color-budget-exceeded`. Capped at 40% of bar width for display; if actual excess > 40%, show `+N%` label beside bar instead

`overflow: visible` on bar container so excess extends past the right edge.

### Row Layout

| Element                   | Spec                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Row padding               | `--space-4` all sides; `min-height: --space-16` (64px)                                                |
| Icon container            | 40×40px `--radius-sm --color-expense-bg`                                                              |
| Category name             | `--text-sm --weight-medium --color-text-primary`                                                      |
| Amounts `actual / budget` | `--text-xs --font-mono --color-text-secondary`; actual in `--color-budget-exceeded` when over         |
| Bar height                | 8px, `--radius-full`, track `--color-budget-bar-track`                                                |
| Percentage                | `--text-xs --font-mono`, color per state                                                              |
| Animation on mount        | `width 0% → final`, `--duration-xslow --ease-decelerate`; no animation under `prefers-reduced-motion` |
| Warning icon              | ⚠️ beside category name when 80–99% (required for color-blind accessibility)                          |
| Accessibility             | `role="progressbar"` with `aria-valuemin/max/now` and `aria-valuetext="¥42,000 of ¥52,500 — 80.0%"`   |

### Ordering

Descending utilisation (highest first). Zero-spend categories last.

### Unbudgeted Section

Expense categories with spend but no budget allocation shown below main list under "UNBUDGETED" section label (`--text-xs uppercase --tracking-wide`). Same row layout but no progress bar — icon, name, actual amount only.

---

## 4. Monthly Summary Cards

**Four cards** (income, expenses, investments, savings) + **one balance card**.

Each `SummaryCard`: uses `Card size="hero"`. Icon 36×36px `--radius-sm --color-{type}-bg`. Amount: `--text-xl --weight-extrabold --font-mono --color-{type}`.

**Balance card:** Shows net (`income − expenses − investments − savings`). Amount: `--text-2xl --weight-extrabold --font-mono`. Positive → `--color-income`; negative → `--color-expense`; zero → `--color-text-primary`.

**Card grid:** 2-column grid, `--space-4` gap. Balance card spans full width above or below the 2×2 grid.

**Amount display:** full number, never abbreviate (`¥320,000` not `¥320k`). Currency always visible.

---

## 5. Empty States

All use `EmptyState` component (`ghost` button variant for CTAs, centered, `fit-content` width).

| Widget                           | Empty condition                          | CTA                                    |
| -------------------------------- | ---------------------------------------- | -------------------------------------- |
| Pie chart                        | No transactions for selected type/period | None                                   |
| Budget bars                      | No budget configured                     | "Set Up Budget →" → `/settings/budget` |
| Transaction log (no filters)     | No transactions                          | "+ Add transaction"                    |
| Transaction log (filters active) | No matches                               | "Clear filters"                        |

**Rules:**

- Placeholder donut ring uses `--color-surface-raised` (never a type color)
- Description text uses `--color-text-secondary`
- Pie chart empty state keeps the type selector visible
- Budget bars at 0% utilisation are not the empty state — show bars at 0%; only show empty state if no budget exists at all

---

## 6. Loading Skeletons

Shimmer CSS (defined once in `global.css`):

```css
@keyframes shimmer {
    0% {
        background-position: -800px 0;
    }
    100% {
        background-position: 800px 0;
    }
}
.skeleton-shimmer {
    background: linear-gradient(
        90deg,
        var(--color-surface-raised) 25%,
        var(--color-surface-overlay) 50%,
        var(--color-surface-raised) 75%
    );
    background-size: 1600px 100%;
    animation: shimmer var(--duration-loading) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer {
        animation: none;
        background: var(--color-surface-raised);
    }
}
```

**Key rules:**

- Skeleton matches **exact dimensions** of live content — no layout shift on load
- All items in a list shimmer in sync — never independently
- Never mix skeleton and live data in the same list
- Default counts: 5 for budget bars and transaction rows, 4 for summary card grid
- Never show skeleton alongside a spinner

| Skeleton variant | Internal blocks                                                    |
| ---------------- | ------------------------------------------------------------------ |
| Summary card     | 36×36px icon placeholder + 64×12px label + 120×22px amount         |
| Pie chart        | Full donut ring shimmer via SVG linearGradient + legend row blocks |
| Budget bar       | 40×40px icon + 120×14px name + bar track (8px) + pct block         |
| Transaction row  | 40×40px icon + text lines + amount block                           |

---

## 7. Do / Don't

| ✅ Do                                                     | ❌ Don't                                  |
| --------------------------------------------------------- | ----------------------------------------- |
| Opacity steps of `--color-expense` for expense categories | Different hues per category               |
| `--color-budget-safe` for 0–79% bar                       | `--color-accent` for budget bar           |
| `--color-budget-warning` for 80–99%                       | `--color-warning` (different token group) |
| `--color-budget-exceeded` for excess bar                  | `--color-expense` for budget exceeded     |
| `--font-mono --weight-extrabold` for summary card amounts | `--font-sans` or lighter weight           |
| `--color-{type}` for legend amounts                       | Opacity-stepped color                     |
| `80.0%` (1 decimal)                                       | `80%` or `80.00%`                         |
| Full amount `¥320,000`                                    | Abbreviated `¥320k`                       |
| `--color-surface-raised` for empty state placeholder ring | Type color at low opacity                 |
| Shimmer skeleton matching live layout                     | Spinner over empty content area           |
