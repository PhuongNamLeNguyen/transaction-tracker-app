# Design Tokens

> Single source of truth for all visual values. No component may hardcode a color hex, pixel value, font size, radius, or shadow — always use `var(--token-name)`. For usage semantics see **colors.md**, **typography.md**, **spacing_layout.md**.

---

## How to Apply

```css
.component { background-color: var(--color-surface); padding: var(--space-4); }
```

```tsx
<span style={{ color: 'var(--color-expense)' }}>−¥3,500</span>
```

---

## Full CSS Variable Reference

```css
:root {
  /* ─── Palette (raw values — never use directly in components) ──── */
  --palette-orange-900: #3D1A06;
  --palette-orange-800: #6B2D0E;
  --palette-orange-700: #9C4A18;
  --palette-orange-600: #CC6A28;
  --palette-orange-500: #E07B39;   /* ginger cat — dominant brand tone */
  --palette-orange-400: #F0A050;
  --palette-orange-300: #F5BC80;
  --palette-orange-200: #FAD9B5;
  --palette-orange-100: #FEF0E0;
  --palette-orange-50:  #FFFAF5;
  --palette-green-700:  #1A6B3A;
  --palette-green-500:  #22863A;
  --palette-green-100:  #D1FAE5;
  --palette-red-700:    #B91C1C;
  --palette-red-500:    #DC2626;
  --palette-red-100:    #FEE2E2;
  --palette-amber-500:  #D97706;
  --palette-amber-100:  #FEF3C7;
  --palette-blue-500:   #2563EB;
  --palette-purple-500: #7C3AED;
  --palette-neutral-0:  #FFFFFF;

  /* ─── Backgrounds ──────────────────────────────────────────────── */
  --color-bg:              var(--palette-orange-50);   /* page/screen */
  --color-surface:         var(--palette-neutral-0);   /* cards, rows, modals */
  --color-surface-raised:  var(--palette-orange-100);  /* inputs, selected states */
  --color-surface-overlay: rgba(61, 26, 6, 0.04);      /* tap ripple */

  /* ─── Text ─────────────────────────────────────────────────────── */
  --color-text-primary:   var(--palette-orange-900);   /* headings, labels */
  --color-text-secondary: var(--palette-orange-500);   /* timestamps, hints */
  --color-text-tertiary:  var(--palette-orange-300);   /* placeholders, disabled */
  --color-text-inverse:   var(--palette-neutral-0);    /* text on filled buttons */
  --color-text-link:      var(--palette-orange-700);   /* tappable inline text */

  /* ─── Borders ──────────────────────────────────────────────────── */
  --color-border:        var(--palette-orange-200);    /* card borders, inputs */
  --color-border-strong: var(--palette-orange-400);    /* focused inputs */
  --color-divider:       var(--palette-orange-100);    /* list separators */

  /* ─── Transaction Types (fixed, never change) ──────────────────── */
  --color-income:          var(--palette-green-500);
  --color-income-bg:       var(--palette-green-100);
  --color-expense:         var(--palette-red-500);
  --color-expense-bg:      var(--palette-red-100);
  --color-investment:      var(--palette-purple-500);
  --color-investment-bg:   #EDE9FE;
  --color-saving:          var(--palette-blue-500);
  --color-saving-bg:       #DBEAFE;

  /* ─── Budget States ─────────────────────────────────────────────── */
  --color-budget-safe:          var(--palette-orange-600);  /* 0–79% */
  --color-budget-warning:       var(--palette-amber-500);   /* 80–99% */
  --color-budget-warning-bg:    var(--palette-amber-100);
  --color-budget-exceeded:      var(--palette-red-500);     /* ≥100% */
  --color-budget-exceeded-bg:   var(--palette-red-100);
  --color-budget-bar-track:     var(--palette-orange-100);

  /* ─── Semantic / Feedback ──────────────────────────────────────── */
  --color-success:     var(--palette-green-500);
  --color-success-bg:  var(--palette-green-100);
  --color-warning:     var(--palette-amber-500);
  --color-warning-bg:  var(--palette-amber-100);
  --color-error:       var(--palette-red-500);
  --color-error-bg:    var(--palette-red-100);
  --color-info:        var(--palette-blue-500);
  --color-info-bg:     #DBEAFE;

  /* ─── Interactive ───────────────────────────────────────────────── */
  --color-accent:            var(--palette-orange-700);  /* primary buttons, active tab */
  --color-accent-hover:      var(--palette-orange-800);
  --color-accent-bg:         var(--palette-orange-100);  /* selected row tint */
  --color-destructive:       var(--palette-red-500);     /* danger buttons */
  --color-destructive-hover: var(--palette-red-700);
  --color-focus-ring:        var(--palette-orange-700);
  --color-scan-fab:          var(--palette-orange-600);

  /* ─── Spacing (8pt grid) ────────────────────────────────────────── */
  --space-1:           4px;   /* icon-to-label gap */
  --space-2:           8px;   /* tight inline gap */
  --space-3:           12px;  /* between related row elements */
  --space-4:           16px;  /* standard screen edge padding */
  --space-5:           20px;  /* card inner padding */
  --space-6:           24px;  /* section gap */
  --space-7:           28px;  /* modal padding, form group gap */
  --space-8:           32px;  /* major section separation */
  --space-10:          40px;  /* screen top padding */
  --space-12:          48px;  /* button/input/row height baseline */
  --space-16:          64px;  /* bottom navbar height */
  --space-safe-bottom: env(safe-area-inset-bottom, 0px);

  /* ─── Border Radius ─────────────────────────────────────────────── */
  --radius-xs:   4px;     /* badges, small pills */
  --radius-sm:   8px;     /* inputs, small cards */
  --radius-md:   12px;    /* default card radius */
  --radius-lg:   16px;    /* bottom sheets, modals */
  --radius-xl:   20px;    /* dashboard summary cards */
  --radius-2xl:  24px;    /* large modals */
  --radius-full: 9999px;  /* pills, circular FAB, progress bar ends */

  /* ─── Shadows ───────────────────────────────────────────────────── */
  --shadow-none:   none;
  --shadow-xs:     0 1px 2px rgba(61, 26, 6, 0.06);
  --shadow-sm:     0 1px 3px rgba(61, 26, 6, 0.10), 0 1px 2px rgba(61, 26, 6, 0.06);
  --shadow-card:   0 2px 8px rgba(61, 26, 6, 0.08), 0 1px 3px rgba(61, 26, 6, 0.06);
  --shadow-md:     0 4px 12px rgba(61, 26, 6, 0.10), 0 2px 4px rgba(61, 26, 6, 0.06);
  --shadow-lg:     0 8px 24px rgba(61, 26, 6, 0.12), 0 4px 8px rgba(61, 26, 6, 0.06);
  --shadow-fab:    0 4px 16px rgba(61, 26, 6, 0.24), 0 2px 6px rgba(61, 26, 6, 0.12);
  --shadow-inset:  inset 0 1px 3px rgba(61, 26, 6, 0.08);

  /* ─── Z-Index ───────────────────────────────────────────────────── */
  --z-base:         0;
  --z-raised:       10;    /* sticky list headers */
  --z-sticky:       100;   /* top bar */
  --z-fab:          200;   /* scan FAB */
  --z-dropdown:     300;   /* pickers */
  --z-overlay:      400;   /* modal backdrop */
  --z-modal:        500;   /* bottom sheets, dialogs */
  --z-toast:        600;
  --z-notification: 600;
  --z-top:          9999;

  /* ─── Animation ─────────────────────────────────────────────────── */
  --duration-instant: 80ms;
  --duration-fast:    150ms;
  --duration-base:    200ms;
  --duration-slow:    300ms;
  --duration-xslow:   400ms;
  --duration-loading: 1200ms;

  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-linear:     linear;

  /* ─── Breakpoints ───────────────────────────────────────────────── */
  --bp-sm:  360px;
  --bp-md:  430px;
  --bp-lg:  768px;
  --bp-xl:  1024px;
  --bp-2xl: 1280px;

  /* ─── Typography ────────────────────────────────────────────────── */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans',
               Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-mono: 'SF Mono', SFMono-Regular, ui-monospace, 'Cascadia Code',
               'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --text-2xl:  28px;
  --text-xl:   22px;
  --text-lg:   18px;
  --text-base: 16px;
  --text-sm:   14px;
  --text-xs:   12px;
  --text-2xs:  10px;

  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;
  --weight-extrabold: 800;

  --leading-none:    1;
  --leading-tight:   1.25;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-loose:   2;

  --tracking-tight:  -0.01em;
  --tracking-normal:  0;
  --tracking-wide:    0.04em;
  --tracking-wider:   0.08em;
}

/* ─── Dark Mode Overrides ───────────────────────────────────────────── */
[data-theme="dark"] {
  --color-bg:              #231408;
  --color-surface:         #3D1E0A;
  --color-surface-raised:  #2E1608;
  --color-surface-overlay: rgba(255, 255, 255, 0.06);

  --color-text-primary:    #FFF0E0;
  --color-text-secondary:  #C8906A;
  --color-text-tertiary:   #7A5535;
  --color-text-inverse:    var(--palette-orange-900);
  --color-text-link:       var(--palette-orange-400);

  --color-border:          rgba(255, 255, 255, 0.10);
  --color-border-strong:   rgba(255, 255, 255, 0.20);
  --color-divider:         rgba(255, 255, 255, 0.06);

  --color-expense:         var(--palette-red-700);
  --color-investment-bg:   #2E1065;
  --color-saving-bg:       #1E3A8A;

  --color-budget-safe:     var(--palette-orange-400);
  --color-budget-exceeded: var(--palette-red-700);
  --color-budget-bar-track:rgba(255, 255, 255, 0.08);

  --color-error:           var(--palette-red-700);
  --color-info-bg:         #1E3A8A;

  --color-accent:          var(--palette-orange-400);
  --color-accent-hover:    var(--palette-orange-300);
  --color-accent-bg:       var(--palette-orange-200);
  --color-focus-ring:      var(--palette-orange-400);
  --color-scan-fab:        var(--palette-orange-500);

  --shadow-sm:   0 1px 3px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.32), 0 1px 3px rgba(0,0,0,0.20);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.40), 0 2px 4px rgba(0,0,0,0.24);
  --shadow-lg:   0 8px 24px rgba(0,0,0,0.48), 0 4px 8px rgba(0,0,0,0.24);
  --shadow-fab:  0 4px 16px rgba(0,0,0,0.56), 0 2px 6px rgba(0,0,0,0.32);
}
```

---

## Key Rules

- **Layering:** `--color-bg` → `--color-surface` → `--color-surface-raised` → `--color-surface-overlay`. Never skip a level.
- **Transaction type colors** (`--color-income/expense/investment/saving`) are **identical in both themes** — do not override them in dark mode.
- **Dark mode:** Set `data-theme="dark"` on `<html>`. All `var()` tokens update automatically — no component needs to read the theme value.
- **Nested radius rule:** inner radius = outer radius − padding (rounded to nearest token).
- **Shadows:** Never stack two shadow tokens. Shadows only on surfaces above `--color-bg`.
- **Animation:** All transitions must respect `prefers-reduced-motion` — see **accessibility.md § 6**.
