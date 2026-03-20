# Spacing & Layout

> Spacing scale, screen structure, safe area rules, card/list padding, modal layout, and grid rules. All values from **design_tokens.md § spacing**. No hardcoded pixel values in components.

---

## 1. Spacing Decision Guide

When choosing a spacing token, ask in order:

1. Screen edge? → `--space-4` (16px) horizontal padding both sides
2. Between two separate sections? → `--space-6` (24px)
3. Inside a card or list row? → `--space-5` (20px) card padding, `--space-4` row padding
4. Between related elements in same row? → `--space-3` (12px)
5. Icon-to-label gap? → `--space-1` or `--space-2`
6. Button/input height? → `--space-12` (48px)

---

## 2. Screen Layout Structure

Three vertical zones — never overlap:

| Zone | Height | Token / value |
| --- | --- | --- |
| Top bar | 56px | `--z-sticky`, `position: sticky, top: 0` |
| Scrollable content | `flex: 1` | `overflow-y: auto`, `-webkit-overflow-scrolling: touch` |
| Bottom navbar | 64px + safe area | `position: fixed, bottom: 0`, `--z-sticky` |

**Top bar:** `background: --color-bg` (masks scrolling content). Hidden on onboarding and full-screen modals.

**Content padding:** top `--space-4`; horizontal `--space-4` both sides; bottom `calc(var(--space-16) + var(--space-safe-bottom) + var(--space-4))`.

**Content width:** `viewport − 32px` on mobile. Capped at 720px centered on desktop (≥1280px).

---

## 3. Safe Area & Navbar Clearance

```css
/* Bottom navbar */
.bottom-navbar {
  height:         calc(var(--space-16) + var(--space-safe-bottom));
  padding-bottom: var(--space-safe-bottom);
}

/* Bottom sheet footer / sticky form footer */
.sheet-footer { padding-bottom: calc(var(--space-5) + var(--space-safe-bottom)); }
.sticky-footer { padding-bottom: calc(var(--space-4) + var(--space-safe-bottom)); }
```

**Rule:** Never hardcode `34px` or any safe area pixel value — always use `env(safe-area-inset-bottom, 0px)` via `--space-safe-bottom`.

**Content clearance:** `padding-bottom: calc(var(--space-16) + var(--space-safe-bottom) + var(--space-4))` — ensures last item is not hidden behind navbar.

---

## 4. Card & List Padding

| Component | Padding |
| --- | --- |
| Dashboard card | `--space-5` (20px) all sides |
| Transaction list row | `--space-4` vertical, `--space-4` horizontal |
| Section header between groups | `--space-6` (24px) top margin |
| Between two cards | `--space-4` (16px) gap |
| Bottom sheet inner content | `--space-7` (28px) horizontal |
| Modal content area | `--space-7` (28px) horizontal, `--space-6` vertical |

---

## 5. Modal & Bottom Sheet Layout

**Bottom sheet structure**:

- Drag handle: 36×4px, centered, `--color-border-strong`, `--radius-full`, 10px below sheet top edge
- Header: title centered, optional close × top-right (44×44px tap area)
- Content: `--space-7` horizontal padding, `--space-5` top, scrollable if needed
- Footer: two-button row, `--space-7` horizontal, `--space-5` bottom, `--space-3` between buttons; add `--space-safe-bottom`
- `border-radius: var(--radius-lg) var(--radius-lg) 0 0` (top corners only)

**Confirmation dialog**:

- Max width: 320px, centered with `--shadow-lg`, `--radius-lg`
- Padding: `--space-7` all sides
- Icon centered at top, title, description, then two buttons stacked or side-by-side

**Backdrop:** `rgba(0, 0, 0, 0.5)`, `z-index: var(--z-overlay)`, dismisses on tap.

---

## 6. Grid & Column Rules

**Mobile (default):** single column, full width minus `--space-4` padding each side.

**Dashboard grid**:

- Monthly summary cards: 2-column grid, gap `--space-4`
- Each card takes 50% minus half the gap

**Tablet (≥768px):** max-width 640px, centered. Some sections go 2-column.

**Desktop (≥1280px):** max-width 720px, centered with `auto` horizontal margins.

---

## 7. Component-Specific Layout Rules

**Bottom navbar:** 5 equal-width tabs, `--space-16` height, icons 24px, labels `--text-2xs`. Scan FAB elevated above by `--space-2`.

**Scan FAB:** 56×56px, `--radius-full`, `--shadow-fab`, `--z-fab`. Centered in navbar cutout.

**Form layout:** fields stacked vertically, `--space-6` between field groups, `--space-4` between label and next field, `--space-3` between input and its error/hint.

**Transaction list row:** `min-height: --space-12` (48px), `--space-4` horizontal padding, icon container 40×40px on left, amount right-aligned.

**Budget progress bar row:** row `min-height: --space-12`, bar height 8px, category name + ⚠️ on left, `¥actual / ¥budget` + `%` on right.

---

## 8. Touch Target Rules

Minimum 44×44px for all interactive elements. See **accessibility.md § 3** for full inventory.

Use fixed-size wrapper with `display: flex; align-items: center; justify-content: center` to expand tap area without visually distorting the element.

---

## 9. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| `padding: var(--space-4)` | `padding: 16px` |
| `calc(var(--space-16) + var(--space-safe-bottom))` for navbar height | `height: 64px` |
| `--space-6` between sections | `margin-top: 25px` |
| `--space-12` for button height | `height: 48px` |
| `env(safe-area-inset-bottom, 0px)` | `padding-bottom: 34px` |
| Bottom sheet footer gets `--space-safe-bottom` | Ignoring safe area on modals |
