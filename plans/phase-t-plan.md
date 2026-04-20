# Phase T — Accessibility and WIG Compliance Hardening

**Authority:** `EXP-6_FRONTEND_EXECUTION_WALKTHROUGH.md` (Phase T) + `EXP-6_FRONTEND_PLAN.md` (Phase 20) + `docs/WIG.md`

---

## Files to Create/Update

| File | Action | Priority |
|------|--------|----------|
| `frontend/src/components/a11y/FocusOutlineDebug.tsx` | CREATE | 🔴 HIGH |
| `frontend/src/components/layout/AppShell.tsx` | UPDATE | 🔴 HIGH |
| `frontend/src/components/ui/LoadingButton.tsx` | UPDATE | 🔴 HIGH |
| `frontend/src/styles/globals.css` | UPDATE | 🔴 HIGH |
| `frontend/src/index.css` | UPDATE | 🟡 MED |

---

## Detailed Task List

### T-1: CREATE FocusOutlineDebug.tsx
**Purpose:** Debug tool to visualize focus rings on all interactive elements
- Toggle visibility via URL param or localStorage
- Overlay showing focus ring boundaries
- Helps verify CDM-17 compliance

### T-2: UPDATE AppShell.tsx
**Verify:**
- `id="main-content"` on main content region
- `SkipToContent` component renders first
- `scroll-margin-top` on main content for skip link
- Focus rings visible on all nav elements
- Role-based navigation renders correctly

### T-3: UPDATE LoadingButton.tsx
**Verify:**
- `aria-live` region for loading state
- Button disabled with spinner during loading
- Original label preserved (not replaced)
- Focus maintained during loading state

### T-4: UPDATE globals.css / index.css
**Add:**
- `touch-action: manipulation` for mobile
- `-webkit-tap-highlight-color` per WIG
- Focus-visible ring styles (saffron ring per design tokens)
- `prefers-reduced-motion` support

### T-5: FORM INPUT COMPLIANCE CHECK
**Check all forms:**
- [ ] Paste NOT blocked (`-webkit-text-security: none` check)
- [ ] First-error focus on invalid submit
- [ ] `autocomplete` attributes present
- [ ] `inputmode` for numeric/email/tel
- [ ] No `outline: none` without replacement

### T-6: ARIA-LIVE AUDIT
**Check:**
- Toast notifications use `aria-live="polite"`
- Inline validation errors announce properly
- Loading states announce state changes

### T-7: TOUCH TARGET VALIDATION
**WIG Requirement:** ≥44×44px on mobile
- Check all buttons, links, interactive elements
- Verify no dead zones on checkboxes/radios

### T-8: MODAL FOCUS TRAP
**Verify:**
- shadcn Dialog focus trap behavior
- Focus returns to trigger on close
- Tab cycles within modal

---

## MET Execution

| MET | Description | When |
|-----|-------------|------|
| MET-5 | Token Visual Baseline Review | After CSS updates |
| MET-6 | Contrast and Focus Audit | After all focus changes |
| MET-7 | Keyboard Navigation Walkthrough | After all interactive elements |

---

## Exit Criteria

- [ ] `npm run build` passes
- [ ] Keyboard-only walkthrough passes for auth, KYC, vote, inbox flows
- [ ] Focus never lost during modal/async transitions
- [ ] First-error focus fires on form submit failure
- [ ] WCAG AA contrast passes for critical text
- [ ] Touch targets ≥44×44px verified

---

## CDM-17 Reminder
> Re-run keyboard walkthrough AFTER each UI polish pass. CSS cleanup often removes focus outlines.

---

## Commit Message
`fix(exp-6): harden accessibility and wig compliance behaviors`
