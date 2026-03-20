# Gestures & Interactions

> Swipe-to-delete, swipe-to-restore, 50% threshold rule, undo toast, pull-to-refresh, tap targets, and all touch interaction patterns. For `SwipeRow` component spec see **components.md**. For toast details see **components.md § Toast**.

---

## 1. Gesture Philosophy

- **Reversibility first.** Every destructive gesture has an undo opportunity before data is permanently lost.
- **50% threshold is universal.** All swipe actions use the same rule. Learn once, applies everywhere.
- **Gestures confirm, not substitute.** Every gesture action is also reachable by tap — nothing is gesture-only.

---

## 2. Swipe-to-Delete

### Where it applies

| Screen | Row type | Delete type | Recoverable |
| --- | --- | --- | --- |
| Transaction detail — split list | SplitRow | **Soft** (sets `deleted_at`) | Yes — Settings → Deleted Transactions |
| Settings → Deleted Transactions | Deleted split row | **Permanent** (hard-delete) | No — requires ConfirmationDialog |
| Notification centre | NotificationRow | **Permanent** | No |

### The 50% Threshold Rule

Threshold = 50% of the row's **full rendered width** (not a fixed pixel value). This scales correctly across all devices.

- `< 50%`: action button revealed; user can tap it or swipe back
- `≥ 50%`: action fires immediately on finger release; haptic feedback

### Visual States During Swipe

| State | Visual |
| --- | --- |
| Resting | Normal row |
| < 50% swiped | Row translates left 1:1; action button (80px) slides in; opacity 0→1 over first 20px |
| ≥ 50% swiped | Entire row background tints to action color at 0.15 opacity; action label bolds |
| Released < 50% | Snap back: `--ease-spring`, `--duration-base` |
| Released ≥ 50% | Row exits left `--ease-accelerate --duration-base`; list contracts |

### Soft vs Permanent Delete

```text
Soft:      Swipe ≥50% → soft-delete API → row disappears → undo toast (3s)
Permanent: Swipe ≥50% → ConfirmationDialog → "Delete Permanently" tap → hard-delete API
```

**Rule:** Soft-delete never shows a confirmation dialog — undo toast is the safety net. Permanent delete **always** shows a ConfirmationDialog — no exceptions.

### Delete Action Colors

| Type | Button background |
| --- | --- |
| Soft delete | `--color-budget-warning` (amber — signals reversible) |
| Permanent delete | `--color-destructive` (red — signals irreversible) |
| Notification delete | `--color-destructive` |

---

## 3. Swipe-to-Restore

Only on **Settings → Deleted Transactions**. Swipe right ≥ 50%.

Restore button: 80px, `--color-income` background. No confirmation dialog — restore is immediate. Haptic feedback on threshold.

---

## 4. Undo Toast

**When offered:** after every soft-delete action.

**Timing:** 3 seconds from appearance. Timer pauses while the Undo button has keyboard focus (accessibility). Dismisses on: timer expiry, Undo tap, or user navigates away.

**What Undo does:** cancels the pending soft-delete API call if still within 3s window. The item reappears in place. If timer expires without Undo, the soft-delete API call is made.

**Note:** The API call is **deferred** until the undo window expires — undo is a local cancel, not a second API call.

---

## 5. Swipe-to-Dismiss (Toast)

Swiping a toast upward (≥ 40px) dismisses it immediately. No threshold percentage — any definitive upward swipe dismisses.

---

## 6. Pull-to-Refresh

**Where it applies:** Transactions list, Dashboard, Notification centre, Deleted Transactions.

**Threshold:** 60px pull distance (with rubber-band resistance curve using `sqrt(delta) * 4`).

**Behavior:** pull indicator (spinner) appears above list content; on release ≥ 60px, spinner activates and `onRefresh` fires; list updates on completion.

**Conflict with bottom sheets:** `overscroll-behavior-y: contain` on all modal/sheet scroll regions prevents pull-to-refresh triggering on the underlying page.

**Accessibility:** provide a Refresh button in the panel header (visible or `VisuallyHidden`) as the pointer-alternative.

---

## 7. Tap Targets

All interactive elements: **44×44px minimum**.

| Element | Tap target | Method |
| --- | --- | --- |
| Buttons, inputs, list rows | Intrinsic (48px height) | `--space-12` height |
| Bottom navbar tabs | Intrinsic (64px height) | Full navbar height |
| Scan FAB | Intrinsic (56px) | Size itself |
| Top bar icons, bell icon | 44×44px | Fixed-size wrapper |
| Checkbox / toggle | 44×44px | Fixed-size wrapper |
| Close ×, drag handle | 44×44px | Fixed-size wrapper |
| Category pill (tappable) | 44px height minimum | `min-height: 44px` |

**Invisible tap area pattern:** `44px × 44px` wrapper button with `display: flex; align-items: center; justify-content: center`. Never use `pointer-events: none` on child to expand parent tap area.

Adjacent targets: minimum **8px** apart.

---

## 8. Long Press

Only use: **Settings → Deleted Transactions** — 500ms hold enters multi-select mode (primary path: "Select" button in top bar). No other long press actions exist.

Visual feedback: 0.97 scale pulse over 200ms while held. Haptic: 10ms pulse on activation.

---

## 9. Backdrop Tap

| Surface | Behavior |
| --- | --- |
| Bottom sheet (no unsaved changes) | Dismiss directly |
| Bottom sheet (form with unsaved data) | Show discard dialog |
| Confirmation dialog | Dismiss (same as Cancel) |
| Scan FAB type menu | Dismiss |
| Notification centre | Dismiss |

Backdrop is a separate element at `z-index: --z-overlay`. Never attach dismiss logic to the sheet container itself.

---

## 10. Scroll Behavior

All scrollable regions:

```css
overflow-y: auto;
-webkit-overflow-scrolling: touch;
overscroll-behavior-y: contain;  /* prevents scroll chaining into parent */
```

**Scroll-to-top:** tapping the already-active navbar tab scrolls to top (`window.scrollTo({ top: 0, behavior: 'smooth' })`).

**Position preservation:** list scroll position is preserved on navigate-to-detail and back (React Router scroll restoration or custom cache).

---

## 11. Haptic Feedback

`navigator.vibrate(10)` on: swipe ≥ 50% threshold (any direction), long press activation. Always feature-detect: `if ('vibrate' in navigator)`. Progressive enhancement only.

---

## 12. Gesture Conflict Resolution

SwipeRow inside a vertical scroll list: on `touchmove`, check if `deltaY > deltaX` within first 10px. If vertical dominates → bail out (allow scroll). If horizontal dominates → call `e.preventDefault()` and take over. Note: handlers calling `preventDefault()` must be `{ passive: false }`.

---

## 13. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| 50% threshold as % of row width | Fixed pixel threshold |
| Undo toast for soft delete (no dialog) | Confirmation dialog for soft delete |
| ConfirmationDialog always for permanent delete | Gesture-only permanent delete |
| Amber for soft-delete action button | Red for soft delete |
| Defer API call; undo = local cancel | Immediate API + second undo API call |
| `--ease-spring` for snap-back | Linear or instant snap |
| Feature-detect haptics | Assume `navigator.vibrate` exists |
| Show discard dialog on dirty form backdrop tap | Always dismiss or always show dialog |
| Angle-check first 10px for gesture/scroll conflict | Block all scrolling in SwipeRow |
