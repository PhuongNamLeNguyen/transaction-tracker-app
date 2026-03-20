# UI Design System — Overview

> This folder contains the UI design system for Transaction Tracker. It is the single source of truth for all visual decisions: tokens, components, layout rules, gestures, and accessibility standards. All AI-generated frontend code and all human-written components must follow these docs. When a rule in this folder conflicts with code elsewhere in the project, this folder wins.

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. How to Use These Docs](#2-how-to-use-these-docs)
- [3. File Index](#3-file-index)
- [4. Core Principles](#4-core-principles)
- [5. Tech Stack Notes](#5-tech-stack-notes)

---

## 1. Purpose

The UI docs folder exists to answer one question before a single line of frontend code is written:

> **"What does this look like, and how does it behave?"**

Without this folder, visual decisions get made individually on each component — colors are hardcoded, spacing is guessed, swipe thresholds differ between screens, and dark mode breaks in unpredictable places. These docs prevent that by establishing rules once and applying them everywhere.

**This folder is for**:

- AI code generation — reference these docs before writing any `.tsx` component or page
- Human developers — check here before choosing a color, spacing value, or interaction pattern
- Design reviews — use these docs to evaluate whether an implementation matches intent

**This folder is not for**:

- Backend logic, API shapes, or database rules — those live in `docs/` and `docs/features/`
- Feature behavior (what a screen does) — that lives in `docs/features/`; this folder only covers how it looks and feels

---

## 2. How to Use These Docs

### For AI code generation

Before generating any frontend component, page, or screen, read the relevant files first:

| Task | Read these files first |
| --- | --- |
| Building any component | `design_tokens.md`, `components.md` |
| Building a screen or page | `design_tokens.md`, `spacing_layout.md`, `navigation.md` |
| Any form or input | `forms.md`, `design_tokens.md` |
| Any list with swipe actions | `gestures_interactions.md`, `components.md § Swipe Row` |
| Any chart or data visualization | `charts_visualizations.md`, `colors.md` |
| Any notification or toast | `notifications_feedback.md` |
| Applying colors | `colors.md`, `design_tokens.md` |
| Applying text styles | `typography.md`, `design_tokens.md` |
| Dark mode support | `design_tokens.md`, `colors.md § Dark Mode Behavior` |
| Accessibility concerns | `accessibility.md` |

### For human developers

When in doubt about a visual or interaction decision, look it up here before implementing. If the relevant rule does not exist in these docs, add it before writing the code — do not make one-off decisions in component files.

### Tokens first, values never

Never hardcode a color hex, pixel value, font size, or shadow in a component. Always use a CSS variable from `design_tokens.md`. Example:

```tsx
// WRONG
<div style={{ color: '#EF4444', padding: '16px' }}>

// RIGHT
<div className="text-danger px-4">
// or
<div style={{ color: 'var(--color-danger)', padding: 'var(--space-4)' }}>
```

### Feature docs and UI docs work together

The feature docs in `docs/features/` describe **what** a screen does. The UI docs describe **how** it looks. Both are needed. For example:

- `docs/features/transaction_create.md` defines the manual entry form fields and validation rules
- `docs/ui/forms.md` defines how form fields look, how errors are displayed, and how the two-button footer is laid out
- `docs/ui/components.md` defines the specific Input, Dropdown, and Button components used

---

## 3. File Index

| File | What it covers |
| --- | --- |
| `design_tokens.md` | All CSS variables: colors, spacing, radius, shadows, z-index, animation durations, breakpoints. **Read this file before all others.** |
| `colors.md` | Semantic color usage — when and why each token is used. Transaction type colors, budget state colors, status indicators, dark mode behavior. |
| `typography.md` | Font family, type scale, weight scale, line heights, usage rules per element, currency/percentage number formatting, truncation rules. |
| `spacing_layout.md` | Spacing scale, screen layout structure, safe area and navbar clearance, card/list padding, modal layout, grid and column rules. |
| `components.md` | Every reusable component: anatomy, variants, props, states (default, hover, disabled, loading, error). The most-used reference file. |
| `navigation.md` | Bottom navbar spec, scan button behavior, screen hierarchy and routing, back navigation rules, modal vs screen decisions, transition animations. |
| `forms.md` | Form layout, field states, inline validation, the review/confirm pattern, two-button footer, amount field, required vs optional fields. |
| `gestures_interactions.md` | Swipe-to-delete, swipe-to-restore, the 50% threshold rule, undo toast, pull-to-refresh, tap target sizes. |
| `charts_visualizations.md` | Pie chart spec, budget progress bars, monthly summary cards, category-to-color mapping, empty states, loading skeletons. |
| `notifications_feedback.md` | Toast variants and durations, bell icon and unread badge, notification centre panel, loading states, confirmation dialogs. |
| `accessibility.md` | Contrast ratios, tap target sizes, focus management, screen reader labels, reduced motion, color-blind safe patterns. |

---

## 4. Core Principles

These principles underpin every decision in this design system. When a specific rule does not cover a case, apply these principles to make the decision.

### Consistency over cleverness

Every screen should feel like it belongs to the same app. Use the same component for the same job — do not invent a one-off variation because it looks slightly better on a particular screen. Consistency builds trust with users and reduces cognitive load.

### Tokens, never magic numbers

Every color, spacing value, font size, radius, and shadow comes from `design_tokens.md`. A component file should contain zero hardcoded visual values. This is what makes dark mode, responsive scaling, and design updates possible without touching individual components.

### Four transaction types, four consistent colors

Income, expense, investment, and saving each have a fixed color that is used in every context — list rows, charts, summary cards, amount labels. The mapping never changes. Any new component that displays a transaction type must use the corresponding token from `colors.md § 2`. There are no exceptions.

### Soft actions before hard ones

Destructive actions (deletion) are always soft first — swipe to soft-delete, then permanent delete requires an explicit second confirmation. This mirrors the data model (`transaction_splits.deleted_at`) and prevents user error. No component should hard-delete anything in a single gesture without a confirmation step.

### Nothing is saved until the user confirms

The review-and-confirm pattern (see `forms.md § 6`) is used on every flow that writes to the database. The UI must never show a success state until the backend has responded with a success. Loading states (spinners, skeleton screens) are shown during the request. This applies to manual entry, AI draft confirmation, budget setup, and account setup.

### Light and dark mode are equal citizens

Every component is designed for both themes simultaneously. There is no "then we'll add dark mode later." Every color token has both a light and dark value in `design_tokens.md`. When building a component, verify both modes before considering it done.

### Finance demands precision

Amounts are never truncated, never approximated, and never displayed without a currency code. Percentage values are always shown to one decimal place. The typography rules for number formatting in `typography.md § 6` are strict — follow them exactly.

---

## 5. Tech Stack Notes

Understanding the tech stack prevents common mistakes when generating or writing frontend code.

**Framework:** React 18 with TypeScript. All components are functional components with hooks. Class components are not used.

**Build tool:** Vite. Import paths use absolute aliases configured in `vite.config.ts` — use `@/components/...` not `../../components/...`.

**Styling:** CSS custom properties (variables) defined in a global stylesheet, consumed via `style={{ ... }}` or utility class names. There is no Tailwind in this project — do not generate Tailwind utility classes. Do not use CSS-in-JS libraries (styled-components, emotion). Write styles as CSS variables and class names.

**Component files:** One component per file, PascalCase filename matching the component name (e.g. `TransactionRow.tsx` exports `TransactionRow`). Co-locate the component's CSS module or styles in the same folder.

**State management:** Local state with `useState` and `useReducer`. Server state with custom hooks in `frontend/src/hooks/`. No Redux or Zustand — do not introduce global state libraries.

**Routing:** React Router v6. Page components live in `frontend/src/pages/`. Navigation uses `useNavigate` — no direct `window.location` manipulation.

**Naming conventions** (from `coding_conventions.md`):

| Item | Convention | Example |
| --- | --- | --- |
| Component files | PascalCase | `TransactionForm.tsx` |
| Hook files | camelCase, `use` prefix | `useTransactions.ts` |
| Page files | PascalCase, `Page` suffix | `DashboardPage.tsx` |
| Utility files | kebab-case | `currency-utils.ts` |
| CSS variables | kebab-case, `--` prefix, namespaced | `--color-accent`, `--space-4` |

**TypeScript strictness:** `strict: true` is enforced. The `any` type is forbidden — use `unknown` and narrow, or define a proper interface. All component props must be typed with an interface or type alias. All API response shapes come from `shared/types/` (see `data_models.md`).
