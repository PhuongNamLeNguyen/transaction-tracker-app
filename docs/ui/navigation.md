# Navigation

> Bottom navbar, scan FAB, screen hierarchy, routing, back navigation, modal vs screen decisions, and transition animations. Uses React Router v6.

---

## 1. Architecture

Flat tab-based navigation at top level; stack-based push for sub-screens. Modals float above current screen without adding to the navigation stack.

**Key principle:** The navbar is always visible on main app screens. Only full-screen destinations get their own route. Transient flows (transaction creation, image review) use bottom sheets and overlays — not routes.

---

## 2. Route Definitions

```typescript
// frontend/src/router.tsx
// Public routes:
{ path: '/login' }
{ path: '/register' }
{ path: '/verify-email' }
{ path: '/forgot-password' }
{ path: '/reset-password' }

// Protected (ProtectedRoute → OnboardingGuard):
{ path: '/' }                      // DashboardPage
{ path: '/transactions' }          // TransactionsPage
{ path: '/transactions/:id' }      // TransactionDetailPage
{ path: '/budgets' }               // BudgetsPage
{ path: '/settings' }              // SettingsPage
{ path: '/settings/deleted' }      // DeletedTransactionsPage

// Protected but exempt from OnboardingGuard:
{ path: '/onboarding' }

// Fallback:
{ path: '*', element: <Navigate to="/" replace /> }
```

**Navbar visibility**:

- Hidden on: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding`
- Always visible on all other routes, including sub-screens like `/transactions/:id`

---

## 3. Bottom Navbar

| Position | Label | Route |
| --- | --- | --- |
| 1 | Home | `/` |
| 2 | Transactions | `/transactions` |
| 3 (center) | — (Scan FAB) | No route |
| 4 | Budget | `/budgets` |
| 5 | Settings | `/settings` |

**Active state:** matched by `useLocation()`. Child routes match their parent tab (`/transactions/:id` → Transactions tab active; `/settings/deleted` → Settings tab active). Active: icon + label in `--color-accent`, 2px top border `--color-accent`. Inactive: `--color-text-secondary`.

**Tap active tab:** scrolls current screen to top.

---

## 4. Scan FAB

The only entry point for creating any transaction. Does not push a route.

**Flow**:

1. Tap FAB → type selector expands in-place (`--ease-spring --duration-slow`; options stagger 30ms apart)
2. Select type → type menu collapses → entry method BottomSheet opens
3. Select entry method:
   - Manual → transaction entry form BottomSheet
   - Upload / Camera → device picker/camera → ImagePreview overlay → AI extraction → draft review BottomSheet

**Type is held in local state** (`TransactionCreateFlow` component) — never in URL.

**Dismiss rules**:

| Action | Result |
| --- | --- |
| Backdrop tap (FAB menu) | Dismiss menu |
| Backdrop tap (entry method sheet) | Dismiss sheet |
| Backdrop tap (form sheet, unsaved) | Show discard dialog |
| Hardware back | Same as backdrop tap for topmost overlay |

---

## 5. Screen Flow Maps

### Auth - Screen Flow Maps

```text
App start → valid token? → No → /login
/login → valid credentials → OnboardingGuard → / or /onboarding
/register → submit → /login + "check email" toast
/forgot-password → submit → /login + "check email" toast (always)
/reset-password → submit → /login + "password updated" toast
```

### Onboarding

`OnboardingGuard` checks `cycle_start_day` and `target_currency`. If either null → `/onboarding` (cannot be bypassed).

Wizard: 3 steps managed by internal state at `/onboarding` (no sub-routes). Step Back doesn't lose data. Submit → `navigate('/', { replace: true })`.

### Transaction Creation

```text
Scan FAB → type select → entry method sheet
  ├── Manual   → form sheet → review (in-place) → POST → /transactions/:id
  └── Image    → upload → AI scan → draft review sheet → confirm → POST → /transactions/:id
```

### Transaction Detail & Edit

```text
/transactions/:id
  ├── Edit (header)  → edit form BottomSheet → save → reload
  ├── Split row tap  → split edit BottomSheet → save → reload
  ├── Swipe split    → soft-delete + undo toast
  └── Permanent del  → ConfirmationDialog → navigate('/transactions', { replace: true })
```

---

## 6. Back Navigation Rules

**Hardware/gesture back**:

- Main tab screen: no back (tab root)
- Sub-screen: pop to parent
- Bottom sheet: close sheet (with unsaved-changes guard if dirty)

**Unsaved changes guard:** if form `isDirty`, show a ConfirmationDialog ("Discard changes?") before closing. If not dirty, close immediately.

**Post-action navigation:**

| Action | Navigate to | replace? |
| --- | --- | --- |
| Transaction created | `/transactions/:id` | No |
| Transaction deleted | `/transactions` | Yes |
| Onboarding complete | `/` | Yes |
| Logout | `/login` | Yes |
| Detail screen for non-existent resource | `/transactions` | Yes |

---

## 7. Modal vs Screen Decision Rules

| Use a **Screen** (route) when | Use a **BottomSheet** when | Use a **Dialog** when |
| --- | --- | --- |
| Content takes full screen height | Task is focused with 1–5 fields | Requires yes/no decision |
| User needs to bookmark / share it | Doesn't need browser history | Destructive or irreversible action |
| Multiple sections / scroll-heavy | Should disappear on backdrop tap | Short message with one action |
| Reached from multiple places in the app | Part of a multi-step flow | |

**Quick reference:**

| Surface | Screen | Sheet | Dialog |
| --- | --- | --- | --- |
| Transaction entry form | — | ✅ | — |
| Transaction detail | ✅ | — | — |
| Edit form | — | ✅ | — |
| Category picker | — | ✅ | — |
| Delete confirmation | — | — | ✅ |
| Preference edit | — | ✅ | — |
| Log out confirmation | — | — | ✅ |

---

## 8. Deep Links

| Notification type | `action_url` | Result |
| --- | --- | --- |
| `transaction.saved` | `/transactions/:id` | Navigate to detail |
| `receipt.draft_ready` | `/drafts/:receiptId` | Open draft review sheet (virtual route — handled by `NotificationDeepLinkHandler`) |
| `budget.warning` / `budget.exceeded` | `/budgets` | Navigate to budgets |
| `cycle.started` / `cycle.ending_soon` | `/` | Navigate to dashboard |
| `security.*` | `/settings` | Navigate to settings |

`/drafts/:receiptId` is a virtual path — not a real route. `NotificationDeepLinkHandler` mounted at app root intercepts it and opens the draft review BottomSheet.

---

## 9. Transition Animations

### Screen transitions

| Direction | Animation | Duration | Easing |
| --- | --- | --- | --- |
| Push (deeper) | New screen in from right; current out to left | `--duration-slow` | `--ease-decelerate` enter / `--ease-accelerate` exit |
| Pop (back) | Current out to right; previous in from left | `--duration-slow` | `--ease-accelerate` exit / `--ease-decelerate` enter |
| Tab switch | Cross-fade only (no slide) | `--duration-base` | `--ease-standard` |
| Replace | Fade only | `--duration-base` | `--ease-standard` |

### Modal transitions

| Surface | Open | Close |
| --- | --- | --- |
| Bottom Sheet | Slide up, `--duration-slow --ease-decelerate` | Slide down, `--duration-base --ease-accelerate` |
| Dialog | Scale 0.9→1.0 + fade, `--duration-slow` | Scale out + fade, `--duration-base` |
| Scan FAB expand | Stagger in, `--ease-spring --duration-slow` | Collapse, `--duration-base --ease-accelerate` |
| Image Preview | Fade in | Fade out |

**Rules:** Open is always slower than close. Slides reduce to opacity-only fade under `prefers-reduced-motion`. Never animate during data loading — show skeleton first.

---

## 10. Route Guards

```text
Request any URL →
  1. Valid token? No → /login
  2. Onboarding complete? No → /onboarding
  3. Route exists? No → / (fallback)
  4. Render
```

---

## 11. Navigation Rules

- Always `useNavigate()` — never `window.location.href`
- `{ replace: true }` after: logout, onboarding completion, transaction delete, redirect-on-notfound
- Never put transient flow state (type, step) in URL — keep in local state
- Bottom sheets and dialogs open/close via state — never call `navigate()` on modal open
