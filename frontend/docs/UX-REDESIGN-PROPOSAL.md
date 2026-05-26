# UX Audit & Redesign Proposal — Finanza AI Frontend

**Date:** 2026-05-23
**Author:** UXDesigner (Agent 513f01a8)
**Issue:** SEL-50

---

## Executive Summary

Finanza AI's frontend has a solid foundation: strong visual identity, thorough dark mode, responsive design, and a well-structured component architecture. However, several **high-severity usability issues** limit the product's polish, trustworthiness, and conversion potential — specifically around form validation, destructive actions, accessibility, and information architecture.

This proposal organizes findings into **4 priority tiers** and recommends specific redesign actions for each.

---

## 1. Critical & High-Severity Issues (Fix Immediately)

### 1.1 Native `confirm()` / `prompt()` for Destructive Actions

**Files:** `BudgetsView.tsx`, `GoalsView.tsx`, `RecurringView.tsx`

**Problem:** Three views use browser-native `confirm()` and `prompt()` dialogs for destructive operations (delete budget, delete goal, delete recurring transaction, deposit to goal). These dialogs:
- Are unstylable and break the app's visual language
- Block the main thread (no async fallback)
- Provide zero validation UX (e.g., `prompt()` accepts empty strings)
- Feel jarring after a polished glass-morphism UI

**Fix:** Replace all native dialogs with a shared `ConfirmationModal` component:
  - Props: `title`, `message`, `confirmLabel`, `variant` (danger/warning), `onConfirm`, `onCancel`
  - For deposit/amount entry: use the existing `TransactionForm` pattern or a `PromptModal` with validated input
  - Add loading state on confirm (`isProcessing`)
  - Add keyboard support (Enter to confirm, Escape to cancel)

### 1.2 Hardcoded Category Lists

**Files:** `BudgetView.tsx:L261-291`, `TransactionForm.tsx:L254-279`

**Problem:** Category selectors hardcode category names like 'Moradia', 'Restaurante / Delivery' with optgroup labels split by the 50/30/20 method. This is extremely brittle:
- If a category is renamed, deleted, or added server-side, the UI silently breaks (the category just won't appear in the list)
- New categories from the backend are invisible to the user
- Hardcoded optgroup logic duplicates what the backend already knows about category classification

**Fix:**
- Fetch categories from the API and render dynamically
- Group by `type` (INCOME/EXPENSE) or a `classification` field rather than hardcoded optgroup labels
- Add a fallback "Other" option for uncategorized
- Cache categories to avoid a loading flash on re-renders

### 1.3 Keyboard Navigation Gaps

**Files:** Most interactive components

**Problem:** Dropdown menus (AccountsSection, CreditCardsSection), month selector, action menus, and modals lack keyboard navigation:
- No ArrowKey navigation in month grids
- No `aria-activedescendant` or `role="grid"` on calendar-like controls
- No `aria-haspopup`, `aria-expanded`, or `role="menu"` on context menus
- Escape key not consistently wired across modals (MonthSelector doesn't close on Escape)

**Fix:**
- Audit all interactive widgets and add proper ARIA attributes
- Wire Escape key as a universal modal/dropdown close via a shared `useKeyboardClose` hook
- Add ArrowKey navigation for grid-based selectors
- Add `focus-trap` for all modal/dialog overlays

### 1.4 No Testing or Accessibility Audit Infrastructure

**Problem:** No unit tests, integration tests, or a11y tooling in the frontend pipeline. This is a code quality and product risk:
- No way to verify that new changes don't break existing UX
- No way to run automated a11y checks (axe, Lighthouse CI)
- Refactoring hardcoded category lists (1.2) or dialogs (1.1) has no safety net

**Fix:**
- Add Vitest + React Testing Library as devDependencies
- Write tests for critical flows: login, transaction CRUD, budget creation, goal deposit, invoice display
- Add `@axe-core/react` for in-development a11y warnings
- Add a CI step that runs tests and a11y checks

---

## 2. Medium-Severity Issues (Next Sprint)

### 2.1 No Optimistic Updates

**Problem:** Every CRUD action (addTransaction, deleteBudget, etc.) waits for the API response, then re-fetches all data via `refreshData()`. This creates noticeable latency on every user action.

**Fix:** Introduce optimistic updates:
- On create: add a temporary `id` immediately to the local state, then reconcile on API success
- On delete: remove from local state immediately, roll back on API error
- On update: patch local state immediately, roll back on error
- Use React Query (`@tanstack/react-query`) to manage cache, stale-while-revalidate, and optimistic updates without manual state management

### 2.2 Esc键未关闭的 Dropdowns / Modals

**Problem:** MonthSelector dropdown, NotificationCenter panel, and some modal forms do not close on Escape key press.

**Fix:** Extract a shared `useEscapeKey` hook:
```typescript
function useEscapeKey(handler: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}
```

Wire this into all modals, panels, and dropdowns.

### 2.3 Missing Loading & Saving States

**Problem:** Budget creation, goal deposit, recurring item save — many submit buttons show no loading indicator during API calls. Users may click multiple times or wonder if the action registered.

**Fix:** Standardize a `useSubmitState` pattern:
- Return `{ isSubmitting, submitError, handleSubmit }` with auto-disable
- Show a spinner inside the button during submission
- Disable the form during submission

### 2.4 Amount Input Locale Parsing is Fragile

**Files:** `TransactionForm.tsx`, `BudgetsView.tsx`, `GoalsView.tsx`

**Problem:** Amount inputs parse Brazilian format (`1.234,56`) with ad-hoc string replacement. If a user types a dot as decimal separator (common in US/international locale), the value is misinterpreted.

**Fix:**
- Create a shared `CurrencyInput` component that:
  - Uses `inputMode="decimal"` for mobile keyboard
  - Formats on blur, parses raw input on change
  - Accepts both `.` and `,` as decimal separators
  - Shows formatted currency in a non-editable overlay while typing
- Test across locales (pt-BR, en-US, es, de, fr)

### 2.5 Inconsistent Privacy Blurring

**Files:** `GoalsView.tsx`, `TransactionForm.tsx`, `StatCard.tsx`

**Problem:** Privacy mode uses different blur levels (`blur-sm`, `blur-md`, `blur-md select-none opacity-50`). The opacity reduction on some elements may confuse users into thinking the card is broken.

**Fix:** Standardize on a single CSS class like `.privacy-blur { @apply blur-md select-none; }` with a consistent behavior across all views. Add a subtle visual indicator (lock icon or pattern overlay) so users know the blur is intentional.

### 2.6 Emojis as Interactive Indicators

**Files:** `RecurringView.tsx` (✅/⭕), `LandingView.tsx` (🇧🇷 🔒 🆓), `NotificationCenter.tsx` (⏰)

**Problem:** Emojis used as toggle states and feature icons:
- ✅/⭕ for active/inactive toggle — screen readers announce "check mark button" or "hollow circle button"
- 🇧🇷 for "feito para brasileiros" — announced as "Flag of Brazil"
- No consistent accessible alternative

**Fix:**
- Replace emoji indicators with semantic components:
  - `ToggleSwitch` or `Switch` with `role="switch"` and `aria-checked`
  - Feature icons with `<span aria-hidden="true">` + accessible label
- Use lucide-react icons consistently (already in the project)

### 2.7 401 Silent Failure in DataProvider

**File:** `context/DataProvider.tsx`

**Problem:** `fetchResource` silently catches 401 errors (line 85). If the user's session expires, the app continues to show stale/empty data with no indication that re-authentication is needed.

**Fix:**
- When a 401 is caught in `fetchResource`, dispatch a session-expired event
- Create a `SessionExpiredModal` that appears on any 401
- Redirect to login with a message: "Sua sessão expirou. Faça login novamente."

---

## 3. Low-Severity but Quality-of-Life Improvements

### 3.1 Credit Card Installments Disconnect

**Problem:** When viewing a credit card, users cannot see its installments. They must navigate to "Faturas" (Invoices) to view installment details. This creates an information gap.

**Fix:** Show a mini invoice summary below each credit card with:
- Next installment amount
- Next closing date
- Total remaining
- Click-to-view link to the full invoice

### 3.2 Goal Deposit Doesn't Create Transaction

**Problem:** When a user deposits into a goal, no corresponding transaction is created. The money is "magically" added, which undermines the app's core promise of accurate financial tracking.

**Fix:** When a goal deposit is made:
- Auto-create an expense transaction: "Depósito: {goal name}" in a "Metas" category
- Link the transaction to the goal for traceability
- Show a toast: "Depósito registrado! Transação criada automaticamente."

### 3.3 No "Today" Shortcut in MonthSelector

**Problem:** Users navigating months must click backward/forward many times to return to the current month. No "Today" or "Current Month" button exists.

**Fix:** Add a small "Hoje" text button in the month selector header that jumps back to the current month/year.

### 3.4 Mobile Timeline Loses Visual Metaphor

**Problem:** The TimelineView's central line and alternating card layout is hidden on mobile (`hidden md:block`), reducing it to a plain list without the visual timeline metaphor.

**Fix:** On mobile, keep the left-aligned green/red dot style (like the native iOS/mobile timeline pattern) instead of hiding the metaphor entirely.

### 3.5 Over-Budget Filter Missing

**Problem:** Users must visually scan all budget cards to see which are overspent. No "Show over-budget only" filter exists.

**Fix:** Add a filter toggle at the top of the Budgets view: "Apenas estourados" (Only over-budget).

### 3.6 Landing Page Accessibility

**File:** `LandingView.tsx`

**Problem:**
- No skip-to-content link
- Navigation links use `<a href>` instead of React Router `<Link>`, causing full page reloads on legal/privacy pages
- `animate-pulse` on gradient heading violates WCAG 2.2.2 (motion)
- Emoji-only icons for feature highlights

**Fix:**
- Add skip-to-content link at top of page
- Use `<Link>` from React Router for internal navigation
- Add `prefers-reduced-motion` media query to stop hero animation
- Replace emoji icons with lucide-react icons + text labels

---

## 4. Strategic Redesign Recommendations

### 4.1 Information Architecture Overhaul

**Current state:** The sidebar navigation has 10 items (Dashboard, Contas, Orçamentos, Metas, Faturas, Timeline, Recorrentes, Extrato, Settings, plus admin-only Feedbacks/Admin). This is too many primary navigation items for a financial app.

**Recommendation:**

```
Level 1 (always visible):
├── Dashboard (summary + insights)
├── Movimentações (extrato + timeline merged)
├── Planejamento (orçamentos + metas + recorrentes merged)
└── Contas (accounts + credit cards + invoices merged)

Level 2 (settings area):
├── Configurações
└── Admin (if admin)
```

This reduces primary navigation from 9-10 to **4 items**, which:
- Follows Hick's Law (reduced choice improves decision time)
- Groups related mental models (planning includes budgets + goals + recurring)
- Merges timeline + history into one "Transactions" area
- Keeps settings/admin as secondary

### 4.2 Onboarding Flow Rethink

**Current state:** The onboarding widget on the dashboard shows steps (create account, add transactions, etc.), but the user must figure out the app's flow on their own.

**Recommendation:**
- After registration → guided 3-step wizard:
  1. "Adicione sua primeira conta" (opens Accounts tab)
  2. "Registre seu primeiro gasto" (opens TransactionForm)
  3. "Configure seu primeiro orçamento" (opens Budgets tab)
- Progress indicator at top: "Passo 1 de 3"
- Dismissible (user can skip to dashboard)

### 4.3 Premium Upgrade Experience

**Current state:** The free plan has hard limits enforced by `ExceedingContext`, but the upgrade prompt is only in the Settings view.

**Recommendation:**
- In-context upgrade prompts: when user hits a limit (e.g., tries to create a 2nd account on free plan), show a contextual UpgradeModal instead of a generic error toast
- Upgrade CTA in the sidebar (small "Premium" badge with sparkle icon)
- Feature comparison tooltip on premium-only features (e.g., AI insights daily limit)

### 4.4 Consistent Empty States

**Current state:** Each view has its own empty state implementation — some use custom illustrations, others use simple text. The DashboardView shows a detailed empty state with instructions, but some views like RecurringView are vague.

**Recommendation:**
- Create a reusable `EmptyState` component:
  - Props: `icon`, `title`, `description`, `actionLabel`, `onAction`
  - Consistent styling across all views
  - Action button that guides the user to the next step (e.g., "Criar primeira conta")

---

## Implementation Roadmap

### Phase 1 — Safety & Trust (Current Sprint)
- [ ] Replace native `confirm()`/`prompt()` with custom `ConfirmationModal` (BudgetView, GoalsView, RecurringView)
- [ ] Fetch categories from API (BudgetView, TransactionForm)
- [ ] Wire Escape key across all modals/panels
- [ ] Add loading states to all submit buttons
- [ ] Handle 401 session expiry gracefully

### Phase 2 — Quality (Next Sprint)
- [ ] Standardize privacy blur (shared CSS class)
- [ ] Replace emoji indicators with accessible components
- [ ] Add keyboard navigation (month selector arrow keys, menu roles)
- [ ] Standardize amount input with locale-agnostic `CurrencyInput`
- [ ] Add "Today" shortcut to MonthSelector
- [ ] Add test infrastructure (Vitest + RTL)
- [ ] Goal deposit auto-creates transaction

### Phase 3 — Polish (Following Sprint)
- [ ] Optimistic updates via React Query
- [ ] Over-budget filter in BudgetsView
- [ ] Mobile timeline visual metaphor
- [ ] Credit card inline invoice summary
- [ ] Landing page accessibility fixes

### Phase 4 — Strategy (Future)
- [ ] Information architecture overhaul (reduce sidebar to 4 items)
- [ ] Guided onboarding wizard
- [ ] Contextual upgrade prompts
- [ ] Consistent `EmptyState` component across all views

---

## Visual Design Consistency Audit

| Element | Status | Issue |
|---------|--------|-------|
| Border radius | ✅ Consistent `rounded-2xl` / `rounded-[2.5rem]` on cards | — |
| Color system | ✅ Income=emerald, Expense=rose/red, Primary=cyan-600 | — |
| Typography | ✅ `font-black` for emphasis, `tracking-widest` for labels | — |
| Dark mode | ✅ Comprehensive with `.dark:` variants | — |
| Glass morphism | ✅ `glass-card` class reused across Dashboard, History, Settings | — |
| Button hierarchy | ✅ Primary (cyan), secondary (slate), danger (rose) | — |
| Loading states | ⚠️ Skeleton usage inconsistent | Missing in Budgets, Goals, Recurring |
| Error toasts | ⚠️ Some use emojis (`🚀`), some don't | Standardize |
| Empty states | ⚠️ Inconsistent patterns | See 4.4 |

---

## Key Metrics to Track After Redesign

1. **Task success rate** — Can users create a transaction, add a goal deposit, delete a budget without confusion?
2. **Time on task** — How long does it take to complete key workflows?
3. **Error rate** — How many form validation errors occur per session?
4. **Support tickets** — Track issues mentioning "can't delete", "lost data", "category not found"
5. **a11y compliance** — Run axe-core audit before/after (target: 0 critical, 0 serious violations)

---

*This document is a living proposal. Prioritization should be validated with user testing before committing to the full roadmap.*
