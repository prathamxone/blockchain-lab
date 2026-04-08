FILE_LENGTH_TAG=medium

# EXP-6_FRONTEND_PLAN - DVote (MVP + Frontend) Extensive Development Plan

> Blockchain Lab (ITL801) | University of Mumbai | BE IT SEM VIII
>
> Authoring scope: Exp-6 frontend only (UI, UX, routing, wallet auth UX, client state, and deployment).
>
> Canonical authority boundary: backend and Foundry remain final authority for security and chain finality.
>
> Mini-project exception applied: EXP-6_DOC.md authoring is intentionally out of scope for this phase.

---

## Table of Contents

- [0. Experiment Snapshot](#0-experiment-snapshot)
- [1. Pre-Flight Checklist](#1-pre-flight-checklist)
- [2. Repository File Map](#2-repository-file-map)
- [3. Sequential Development Phases](#3-sequential-development-phases)
- [4. Crucial Development Moments (CDM)](#4-crucial-development-moments-cdm)
- [5. Manual Execution Tasks (MET)](#5-manual-execution-tasks-met)
- [6. Verification Checklist](#6-verification-checklist)
- [7. Known Issues and Fixes](#7-known-issues-and-fixes)
- [8. Security Reminders](#8-security-reminders)
- [9. Git Commit Checkpoints](#9-git-commit-checkpoints)

---

## 0. Experiment Snapshot

| Field | Value |
|---|---|
| Experiment | Exp-6 - MINI PROJECT |
| Plan Scope | DVote (MVP + Frontend) only |
| Lab Outcome | LO6 - Develop and test a Full-fledged DApp using Ethereum/Hyperledger. |
| Bloom's Taxonomy Level | L5 |
| Primary Tool(s) | React 18, Vite 7, TypeScript, Tailwind CSS, shadcn/ui |
| Supporting Tool(s) | TanStack Router, TanStack Query, wagmi v2, viem 2.x, RainbowKit v2, Sonner, react-joyride |
| Runtime Baseline | Node 22.x LTS (mandatory) |
| Session Model | Access token in memory + refresh token in HttpOnly cookie |
| Role Homes | `/admin`, `/observer`, `/voter` |
| Wallet Connectors | MetaMask, WalletConnect, Coinbase Wallet, Rainbow |
| Login Policy | EOA-only for MVP session login |
| KYC Upload Policy | Images/PDF only, 10 MB docs, 5 MB profile photo, authorize TTL 10 min |
| Vote Token Policy | TTL 60s, 10s safety buffer, restart on expiry |
| Polling Policy | 15s active tab, 60s background tab, immediate refetch on focus |
| Freshness Policy | `fresh`, `stale`, `degraded` with restrictive gating when degraded |
| Freshness Source Policy | `GET /api/v1/system/freshness` is authoritative for KYC degraded gating |
| Degraded Action Gate | Block vote cast, escalation execute, and KYC submit |
| Aadhaar-only Fallback | Reason code mandatory + at least one additional evidence upload |
| Rerun UX Policy | 48h due-soon threshold + countdown + escalation CTA |
| Escalation Edit Policy | Immutable ticket after submit; corrections are append-only |
| Pagination Policy | Cursor first, offset fallback |
| Client Nonce Policy | UUID v7 per vote attempt |
| Draft Conflict Policy | Default server draft, explicit one-click local overwrite |
| Freshness Flicker Policy | 5s debounce, keep restrictive policy until stable |
| Vote Timeout Policy | Show uncertain state, briefly lock recast, auto-check status |
| Vote Status Lookup Policy | Use `/api/v1/votes/status` with lookup precedence `voteIntentId` then `wallet+electionId+clientNonce` |
| Finalization Display Policy | Backend terminal status only |
| Design Token Strategy | CSS-variable semantic tokens (shadcn compatible) |
| Typography Pairing | Sora (UI) + IBM Plex Mono (IDs/codes) |
| Icon System | Lucide icons |
| Theme Policy | Tri-color accent system on neutral surfaces, no dark mode in MVP |
| Motion Budget | 150-220ms standard; 250-320ms modal; reduced-motion mandatory |
| Data Density Policy | Comfortable and compact density toggle for admin/observer grids |
| Accessibility Target | WCAG AA mandatory + APCA checks for critical text/focus |
| Prerequisite Docs | `Exp-6/EXP-6_IDEA.md`, `Exp-6/docs/FEATURE_FRONTEND.md`, `Exp-6/docs/FEATURE_BACKEND.md`, `Exp-6/docs/FEATURE_FOUNDRY.md`, `docs/WIG.md`, `docs/PLAN_RULE.md` |
| Estimated Phases | 22 phases |
| FILE_LENGTH_TAG | medium (revalidated after final line count) |

### 0.1 Deployment and Routing Awareness Table

| Surface | Type | Identifier | Runtime/Port | Usage |
|---|---|---|---|---|
| Frontend local app | Local | localhost | 5173 | primary UI development |
| Backend local API | Local | localhost | 4000 | API integration during frontend development |
| Frontend preview | Hosted | Vercel preview URL | static + SPA | review and QA |
| Frontend production | Hosted | Vercel production URL | static + SPA | final user-facing runtime |
| Backend preview/prod | Hosted | separate Vercel service | Node serverless | auth, KYC, votes, inbox APIs |
| Sepolia | On-chain | chainId 11155111 | RPC provider | wallet network parity checks |

### 0.2 Policy Locks from Brainstorm Agreement

1. UI must follow tri-color brand accents on neutral surface hierarchy.
2. shadcn components must use CSS variable token mode.
3. new-york baseline style is mandatory; mixed style baselines are disallowed.
4. Feedback model is shadcn + Sonner; browser alerts are disallowed.
5. Animation budget is fixed and reduced-motion is mandatory.
6. Global custom scrollbar style is mandatory for page, modal, drawer, and table scroll areas.
7. Charts must use color-blind-safe palettes; tri-colors are highlights, not full palette.
8. Observer views must remain aggregate-only with defensive frontend masking if backend leaks sensitive fields.
9. Hard lock blocks route access; soft lock allows limited shell access with remediation CTA.
10. Route guard decision must complete before protected content render.
11. Upload authorize/finalize lifecycle is mandatory; submit without finalize-bind is disallowed.
12. Rerun lineage route is mandatory and superseded election actions remain hard-locked.
13. Tutorial progress is key-scoped by wallet + role + appVersion.
14. Role switch during tutorial resets to role-specific track while preserving prior role progress.
15. Escalation tickets are immutable after submit.
16. CORS pre-flight must include localhost + preview + production origins.
17. Polling cadence is fixed; focus event must trigger immediate refresh.
18. Freshness `degraded` state blocks sensitive actions.
19. KYC draft conflict requires explicit user decision path.
20. Final status cards rely on backend terminal responses only.

---

## 1. Pre-Flight Checklist

Run all checks before starting Phase 1. Do not proceed if any checkbox fails.

### 1.1 Node and Package Manager Baseline

- [ ] `node -v` outputs Node 22.x LTS
- [ ] `npm -v` outputs npm 10.x or newer
- [ ] `cd Exp-6/frontend && npm config get fund` runs without runtime errors
- [ ] `cd Exp-6/frontend && npm config get audit` runs without runtime errors

### 1.2 Repository and Branch Safety

- [ ] `cd /home/prats/Playground/SEM VIII/blockchain-lab && git rev-parse --abbrev-ref HEAD` is `b-pratham`
- [ ] `git status --short` is reviewed before frontend edits begin
- [ ] Existing non-frontend modified files are acknowledged and intentionally untouched

### 1.3 Frontend Workspace Presence

- [ ] `test -d Exp-6/frontend` returns exit code 0
- [ ] `find Exp-6/frontend -maxdepth 2 -type f | wc -l` is reviewed to confirm baseline scaffold state
- [ ] `test -f Exp-6/EXP-6_FRONTEND_PLAN.md` returns exit code 0

### 1.4 Ports and Local Runtime Safety

- [ ] `lsof -i :5173` is checked before running Vite dev server
- [ ] `lsof -i :4000` is checked for backend API port collision
- [ ] `lsof -i :8545` and `lsof -i :31337` are checked to avoid wallet network confusion

### 1.5 Environment and Secrets Hygiene

- [ ] `test -f Exp-6/frontend/.env.example` must pass before coding API or wallet features
- [ ] `git check-ignore -v Exp-6/frontend/.env` confirms `.env` is ignored
- [ ] No private keys, mnemonic, or wallet secrets are present in frontend source files

### 1.6 Research and Dependency Compatibility Matrix (Mandatory)

This pre-flight step is mandatory for frontend only and must be completed before implementation.

| Dependency Surface | Official Doc Verified | Compatibility Lock | Evidence Gate |
|---|---|---|---|
| Vite 7 | Yes | Node 22.x baseline | `npm view vite engines --json` reviewed |
| React 18 baseline | Yes | Works with selected ecosystem stack | package versions pinned in `package.json` |
| TanStack Router v1 | Yes | Router guards and typed routes | route guard skeleton compiles |
| TanStack Query v5 | Yes | React 18+ requirement satisfied | query provider compiles |
| wagmi v2 + viem 2.x | Yes | wallet stack parity | wallet config type-check passes |
| RainbowKit v2 | Yes | aligns with wagmi v2 | connector boot passes |
| Tailwind + shadcn | Yes | CSS variable theming lock | token classes render |
| Sonner | Yes | toast policy lock | toast smoke test passes |
| react-joyride | Yes | tutorial engine lock | tutorial mount smoke test passes |

- [ ] Compatibility matrix row entries are completed before Phase 2 starts
- [ ] Any incompatible package pair is resolved before first feature implementation

### 1.7 Design System Baseline Gate (Mandatory)

- [ ] Tri-color token set is declared: saffron `#E87F24`, white `#FBF6F6`, green `#48A111`
- [ ] Semantic support colors for error and info are defined as constrained tokens
- [ ] Neutral surface ramp is defined for background, card, border, and text hierarchy
- [ ] Typography pairing is declared: Sora + IBM Plex Mono
- [ ] Lucide icon baseline is declared for all UI contexts
- [ ] Density toggle policy is documented for admin/observer data views

### 1.8 Accessibility and Interaction Gate (Mandatory)

- [ ] WIG checklist items are referenced for keyboard, forms, focus, and navigation
- [ ] Minimum touch target policy is documented (44px mobile)
- [ ] Motion policy includes `prefers-reduced-motion` fallback
- [ ] Contrast baseline defined: WCAG AA plus APCA checks for critical text/focus states
- [ ] URL-state parity policy is documented for filters/tabs/pagination

### 1.9 API Contract and CORS Gate

- [ ] `VITE_API_BASE_URL` strategy defined for local, preview, and production
- [ ] CORS origin set includes localhost + preview + production
- [ ] Polling freshness contract fields are confirmed: `lastSyncedAt`, `nextPollAfterSec`, `freshnessState`
- [ ] `GET /api/v1/system/freshness` is confirmed as the authoritative degraded-gate source for KYC submit
- [ ] `/api/v1/votes/status` lookup precedence is confirmed: `voteIntentId`, then `wallet + electionId + clientNonce`
- [ ] Wallet status endpoint contract is confirmed for all lock states

### 1.10 Build and Toolchain Gate

- [ ] `cd Exp-6/frontend && npm install` exits 0
- [ ] `cd Exp-6/frontend && npm run build` exits 0 after scaffold
- [ ] `cd Exp-6/frontend && npm run lint` exits 0 (or documented as deferred with issue reference)
- [ ] `cd Exp-6/frontend && npm run test` exits 0 (or documented as deferred with issue reference)

### 1.11 Mini-Project Scope Protection Gate

- [ ] Plan writing remains limited to frontend scope only
- [ ] Foundry and backend documents are treated as integration dependencies, not implementation targets
- [ ] EXP-6_DOC creation remains explicitly deferred

---

## 2. Repository File Map

> Legend: CREATE = new file, UPDATE = modify existing, VERIFY = read-only reference.

| # | File Path (relative to `Exp-6/`) | Action | Phase | Purpose |
|---|---|---|---|---|
| 1 | `frontend/.nvmrc` | CREATE | 1 | lock Node runtime baseline |
| 2 | `frontend/.gitignore` | CREATE | 1 | ignore env and build outputs |
| 3 | `frontend/.env.example` | CREATE | 2 | env contract placeholders |
| 4 | `frontend/package.json` | CREATE | 2 | scripts and dependencies |
| 5 | `frontend/package-lock.json` | CREATE | 2 | dependency lockfile |
| 6 | `frontend/README.md` | CREATE | 22 | frontend runbook |
| 7 | `frontend/vercel.json` | CREATE | 21 | SPA rewrite and deploy routing |
| 8 | `frontend/vite.config.ts` | CREATE | 2 | Vite baseline config |
| 9 | `frontend/tsconfig.json` | CREATE | 2 | TS project config |
| 10 | `frontend/tsconfig.node.json` | CREATE | 2 | Node tooling TS config |
| 11 | `frontend/index.html` | CREATE | 2 | app entry shell |
| 12 | `frontend/postcss.config.js` | CREATE | 2 | Tailwind/PostCSS setup |
| 13 | `frontend/tailwind.config.ts` | CREATE | 4 | token mapping and content scan |
| 14 | `frontend/components.json` | CREATE | 4 | shadcn registry config |
| 15 | `frontend/src/main.tsx` | CREATE | 2 | React bootstrap |
| 16 | `frontend/src/App.tsx` | CREATE | 3 | app root composition |
| 17 | `frontend/src/styles/globals.css` | CREATE | 4 | base styles and CSS variables |
| 18 | `frontend/src/styles/tokens.css` | CREATE | 4 | semantic token declarations |
| 19 | `frontend/src/styles/scrollbar.css` | CREATE | 5 | global custom scrollbar styling |
| 20 | `frontend/src/styles/motion.css` | CREATE | 5 | motion tokens and reduced-motion overrides |
| 21 | `frontend/src/config/env.ts` | CREATE | 3 | env parsing and validation |
| 22 | `frontend/src/config/chains.ts` | CREATE | 7 | chain metadata and wallet network rules |
| 23 | `frontend/src/config/routes.ts` | CREATE | 6 | route constants |
| 24 | `frontend/src/config/polling.ts` | CREATE | 10 | polling cadence and freshness mapping |
| 25 | `frontend/src/config/roles.ts` | CREATE | 6 | role constants and route map |
| 26 | `frontend/src/lib/api/client.ts` | CREATE | 10 | API transport wrapper |
| 27 | `frontend/src/lib/api/errors.ts` | CREATE | 10 | deterministic error mapping |
| 28 | `frontend/src/lib/api/freshness.ts` | CREATE | 10 | freshness enum handling |
| 29 | `frontend/src/lib/api/retry.ts` | CREATE | 10 | bounded retry utilities |
| 30 | `frontend/src/lib/auth/challenge.ts` | CREATE | 7 | challenge-signature helpers |
| 31 | `frontend/src/lib/auth/session.ts` | CREATE | 8 | hydration and timeout logic |
| 32 | `frontend/src/lib/auth/tokens.ts` | CREATE | 8 | in-memory token helpers |
| 33 | `frontend/src/lib/wallet/config.ts` | CREATE | 7 | wagmi/rainbowkit setup |
| 34 | `frontend/src/lib/wallet/connectors.ts` | CREATE | 7 | connector definitions |
| 35 | `frontend/src/lib/wallet/guards.ts` | CREATE | 9 | wallet mismatch state helpers |
| 36 | `frontend/src/lib/upload/contracts.ts` | CREATE | 12 | authorize/finalize flow helpers |
| 37 | `frontend/src/lib/upload/validators.ts` | CREATE | 12 | file type/size validation |
| 38 | `frontend/src/lib/telemetry/client-events.ts` | CREATE | 18 | audit-friendly client events |
| 39 | `frontend/src/state/store.ts` | CREATE | 3 | global store composition |
| 40 | `frontend/src/state/auth-store.ts` | CREATE | 8 | auth state domain |
| 41 | `frontend/src/state/wallet-store.ts` | CREATE | 9 | wallet state domain |
| 42 | `frontend/src/state/ui-store.ts` | CREATE | 5 | shell and density preferences |
| 43 | `frontend/src/state/kyc-wizard-store.ts` | CREATE | 11 | wizard/draft state |
| 44 | `frontend/src/state/vote-store.ts` | CREATE | 16 | vote intent and cast state machine |
| 45 | `frontend/src/state/tutorial-store.ts` | CREATE | 19 | tutorial persistence state |
| 46 | `frontend/src/app/providers.tsx` | CREATE | 3 | provider composition |
| 47 | `frontend/src/app/router.tsx` | CREATE | 6 | TanStack router tree |
| 48 | `frontend/src/app/guards.ts` | CREATE | 6 | guard orchestration |
| 49 | `frontend/src/components/layout/AppShell.tsx` | CREATE | 5 | shared shell |
| 50 | `frontend/src/components/layout/TopNav.tsx` | CREATE | 5 | top navigation |
| 51 | `frontend/src/components/layout/RoleSidebar.tsx` | CREATE | 5 | role-aware sidebar |
| 52 | `frontend/src/components/layout/MobileDrawer.tsx` | CREATE | 5 | mobile navigation drawer |
| 53 | `frontend/src/components/layout/Footer.tsx` | CREATE | 5 | footer baseline |
| 54 | `frontend/src/components/ui/DataTable.tsx` | CREATE | 14 | dense/comfortable table primitive |
| 55 | `frontend/src/components/ui/StateCard.tsx` | CREATE | 15 | status surfaces |
| 56 | `frontend/src/components/ui/Timeline.tsx` | CREATE | 17 | election/rerun timeline |
| 57 | `frontend/src/components/ui/FreshnessBanner.tsx` | CREATE | 10 | freshness state rendering |
| 58 | `frontend/src/components/ui/UploadCard.tsx` | CREATE | 12 | media upload status card |
| 59 | `frontend/src/components/ui/EmptyState.tsx` | CREATE | 18 | fallback empty surfaces |
| 60 | `frontend/src/components/ui/ErrorState.tsx` | CREATE | 18 | recoverable error surfaces |
| 61 | `frontend/src/components/ui/ConfirmDialog.tsx` | CREATE | 16 | critical confirmation dialog |
| 62 | `frontend/src/components/ui/SafeActionButton.tsx` | CREATE | 16 | duplicate-safe action trigger |
| 63 | `frontend/src/components/ui/RoleBadge.tsx` | CREATE | 9 | role and lock state badge |
| 64 | `frontend/src/components/ui/PaginationBar.tsx` | CREATE | 15 | cursor/offset fallback paginator |
| 65 | `frontend/src/components/ui/FilterBar.tsx` | CREATE | 15 | synced filter controls |
| 66 | `frontend/src/components/ui/EmptyChartState.tsx` | CREATE | 18 | analytics empty-state view |
| 67 | `frontend/src/features/auth/LoginLanding.tsx` | CREATE | 7 | wallet-first login entry |
| 68 | `frontend/src/features/auth/ReauthGate.tsx` | CREATE | 8 | controlled re-auth flow |
| 69 | `frontend/src/features/auth/SessionTimeoutModal.tsx` | CREATE | 8 | timeout UX with resume path |
| 70 | `frontend/src/features/auth/LogoutAction.tsx` | CREATE | 8 | deterministic logout behavior |
| 71 | `frontend/src/features/wallet/WalletConnectorPanel.tsx` | CREATE | 7 | connector UI and status |
| 72 | `frontend/src/features/wallet/WalletMismatchView.tsx` | CREATE | 9 | mismatch and lock UX |
| 73 | `frontend/src/features/wallet/WalletStatusBanner.tsx` | CREATE | 9 | governance state banner |
| 74 | `frontend/src/features/kyc/KycWizardPage.tsx` | CREATE | 11 | multi-step KYC page |
| 75 | `frontend/src/features/kyc/steps/IdentityStep.tsx` | CREATE | 11 | identity capture step |
| 76 | `frontend/src/features/kyc/steps/ProfileStep.tsx` | CREATE | 11 | profile detail step |
| 77 | `frontend/src/features/kyc/steps/UploadStep.tsx` | CREATE | 12 | upload and finalize step |
| 78 | `frontend/src/features/kyc/steps/ReviewStep.tsx` | CREATE | 11 | submit review step |
| 79 | `frontend/src/features/kyc/KycResumeConflictModal.tsx` | CREATE | 11 | server/local draft choice |
| 80 | `frontend/src/features/profile/ProfileDetailsForm.tsx` | CREATE | 13 | voter/candidate detail form |
| 81 | `frontend/src/features/profile/ProfilePhotoManager.tsx` | CREATE | 13 | photo upload management |
| 82 | `frontend/src/features/owner/KycQueuePage.tsx` | CREATE | 14 | owner queue view |
| 83 | `frontend/src/features/owner/KycDecisionModal.tsx` | CREATE | 14 | approve/reject decisions |
| 84 | `frontend/src/features/observer/ObserverDashboardPage.tsx` | CREATE | 14 | observer shell entry |
| 85 | `frontend/src/features/observer/ObserverQueueSnapshot.tsx` | CREATE | 14 | aggregate-only queue module |
| 86 | `frontend/src/features/observer/AnomalyReportForm.tsx` | CREATE | 18 | observer anomaly submission |
| 87 | `frontend/src/features/elections/ElectionListPage.tsx` | CREATE | 15 | election listing |
| 88 | `frontend/src/features/elections/ElectionDetailPage.tsx` | CREATE | 15 | election detail and lifecycle |
| 89 | `frontend/src/features/elections/ElectionFilters.tsx` | CREATE | 15 | list filtering UI |
| 90 | `frontend/src/features/voting/VoteIntentPanel.tsx` | CREATE | 16 | token and confirm stage |
| 91 | `frontend/src/features/voting/VoteCastModal.tsx` | CREATE | 16 | cast flow modal |
| 92 | `frontend/src/features/voting/VoteStateCard.tsx` | CREATE | 16 | idle-to-terminal state card |
| 93 | `frontend/src/features/voting/VoteTimeoutFallback.tsx` | CREATE | 16 | uncertain-state fallback |
| 94 | `frontend/src/features/results/ResultsListPage.tsx` | CREATE | 17 | results listing |
| 95 | `frontend/src/features/results/ResultDetailPage.tsx` | CREATE | 17 | finalization outcome view |
| 96 | `frontend/src/features/rerun/LineagePage.tsx` | CREATE | 17 | parent-child lineage view |
| 97 | `frontend/src/features/rerun/RerunSlaCard.tsx` | CREATE | 17 | SLA and due-soon card |
| 98 | `frontend/src/features/rerun/EscalationTicketForm.tsx` | CREATE | 17 | admin escalation path |
| 99 | `frontend/src/features/inbox/InboxPage.tsx` | CREATE | 18 | inbox screen |
| 100 | `frontend/src/features/inbox/NotificationCard.tsx` | CREATE | 18 | notification item |
| 101 | `frontend/src/features/inbox/InboxFilters.tsx` | CREATE | 18 | inbox filters and sorting |
| 102 | `frontend/src/features/tutorials/TutorialOrchestrator.tsx` | CREATE | 19 | joyride orchestration |
| 103 | `frontend/src/features/tutorials/tutorial-config.ts` | CREATE | 19 | role-based tutorial tracks |
| 104 | `frontend/src/features/common/UnauthorizedPage.tsx` | CREATE | 6 | unauthorized fallback page |
| 105 | `frontend/src/features/common/NotFoundPage.tsx` | CREATE | 6 | not-found page |
| 106 | `frontend/src/components/a11y/SkipToContent.tsx` | CREATE | 20 | keyboard accessibility |
| 107 | `frontend/src/components/a11y/FocusOutlineDebug.tsx` | CREATE | 20 | focus QA helper |
| 108 | `frontend/src/lib/format/intl.ts` | CREATE | 15 | locale-safe formatting |
| 109 | `frontend/src/lib/format/mask.ts` | CREATE | 11 | sensitive value masking |
| 110 | `frontend/src/lib/router/url-state.ts` | CREATE | 15 | URL-state sync helpers |
| 111 | `frontend/src/lib/router/scroll.ts` | CREATE | 6 | history and scroll restoration |
| 112 | `frontend/src/lib/health/heartbeat.ts` | CREATE | 21 | safe health ping utility |
| 113 | `frontend/src/features/diagnostics/HealthBadge.tsx` | CREATE | 21 | non-critical health badge |
| 114 | `frontend/src/test/setup.ts` | CREATE | 22 | test setup |
| 115 | `frontend/src/test/unit/guards.test.ts` | CREATE | 22 | route guard unit tests |
| 116 | `frontend/src/test/unit/freshness.test.ts` | CREATE | 22 | freshness mapping tests |
| 117 | `frontend/src/test/integration/auth-flow.test.tsx` | CREATE | 22 | auth integration test |
| 118 | `frontend/src/test/integration/kyc-wizard.test.tsx` | CREATE | 22 | KYC integration test |
| 119 | `frontend/src/test/integration/vote-state-machine.test.tsx` | CREATE | 22 | vote flow integration test |
| 120 | `frontend/vitest.config.ts` | CREATE | 22 | test runner config |
| 121 | `frontend/playwright.config.ts` | CREATE | 22 | E2E config |
| 122 | `frontend/e2e/role-routing.spec.ts` | CREATE | 22 | role route matrix E2E |
| 123 | `frontend/e2e/vote-flow.spec.ts` | CREATE | 22 | vote journey E2E |
| 124 | `frontend/e2e/kyc-upload-ttl.spec.ts` | CREATE | 22 | upload TTL E2E |
| 125 | `frontend/public/favicon.svg` | CREATE | 2 | app icon |
| 126 | `frontend/public/manifest.webmanifest` | CREATE | 21 | metadata for deployment |
| 127 | `frontend/eslint.config.js` | CREATE | 2 | lint policy |
| 128 | `frontend/src/test/utils/mock-server.ts` | CREATE | 22 | API mock handlers |
| 129 | `EXP-6_IDEA.md` | VERIFY | 1 | product and UX intent source |
| 130 | `docs/FEATURE_FRONTEND.md` | VERIFY | 1 | frontend feature source |
| 131 | `docs/FEATURE_BACKEND.md` | VERIFY | 1 | backend contract source |
| 132 | `docs/FEATURE_FOUNDRY.md` | VERIFY | 1 | foundry parity source |
| 133 | `../docs/WIG.md` | VERIFY | 1 | web interface guideline source |
| 134 | `../docs/PLAN_RULE.md` | VERIFY | 1 | plan authoring standard |
| 135 | `../README.md` | VERIFY | 22 | root repository alignment |
| 136 | `../CONTRIBUTING.md` | VERIFY | 22 | commit and branch convention |
| 137 | `EXP-6_FRONTEND_PLAN.md` | UPDATE | all | plan lifecycle and checkpoints |
| 138 | `frontend/src/components/ui/LoadingButton.tsx` | CREATE | 11 | loading-safe submit button |

---

## 3. Sequential Development Phases

### Phase 1 - Research Lock and Runtime Baseline

Goal:
Establish non-negotiable compatibility and UI policy baselines before any scaffold code is authored.

Files Touched:

- `frontend/.nvmrc` (CREATE)
- `Exp-6/EXP-6_FRONTEND_PLAN.md` (UPDATE)

Logical Flow:

<!-- TOOL: MCP_DOCS -->
1. Verify official dependency documentation for Vite, React, Tailwind, shadcn, TanStack, wagmi, RainbowKit, Sonner, and react-joyride.
2. Freeze Node runtime baseline at 22.x for frontend work.
3. Freeze UI baseline: token strategy, typography, icon set, motion budget, and accessibility target.
4. Freeze integration boundaries with backend and Foundry documents.
5. Record all locked decisions in Snapshot and Pre-Flight sections before coding begins.

Exit Criteria:

- [ ] `test -f Exp-6/frontend/.nvmrc` exits 0
- [ ] Section 1.6 compatibility matrix is complete
- [ ] Section 0.2 policy lock list is complete

### Phase 2 - Frontend Scaffold and Dependency Installation

Goal:
Create a deterministic React + Vite + TypeScript baseline with locked dependencies.

Files Touched:

- `frontend/package.json` (CREATE)
- `frontend/package-lock.json` (CREATE)
- `frontend/.env.example` (CREATE)
- `frontend/vite.config.ts` (CREATE)
- `frontend/tsconfig.json` (CREATE)
- `frontend/tsconfig.node.json` (CREATE)
- `frontend/index.html` (CREATE)
- `frontend/postcss.config.js` (CREATE)
- `frontend/src/main.tsx` (CREATE)

Logical Flow:

<!-- TOOL: VITE -->
1. Initialize frontend project with React 18 and TypeScript.
2. Install locked dependencies and generate lockfile.
3. Add scripts for `dev`, `build`, `preview`, `lint`, and `test`.
4. Add env placeholders for API, WalletConnect, app version, and chain defaults.
5. Confirm build pipeline boots with no runtime startup errors.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm install` exits 0
- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] `cd Exp-6/frontend && npm run dev -- --host 127.0.0.1 --port 5173` starts successfully

### Phase 3 - Core App Composition and Provider Layer

Goal:
Set up provider architecture for router, query cache, wallet, session, and global state.

Files Touched:

- `frontend/src/App.tsx` (CREATE)
- `frontend/src/app/providers.tsx` (CREATE)
- `frontend/src/config/env.ts` (CREATE)
- `frontend/src/state/store.ts` (CREATE)

Logical Flow:

<!-- TOOL: REACT -->
1. Build top-level provider composition in deterministic order.
2. Add environment parsing and fail-fast runtime checks.
3. Initialize query client with safe defaults for retries and stale times.
4. Expose centralized global store for UI and workflow state domains.
5. Confirm app boot under empty-route placeholder screen.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] `cd Exp-6/frontend && npm run test -- --runInBand` exits 0 or is documented deferred

### Phase 4 - Design Token Foundation and shadcn Setup

Goal:
Implement semantic CSS-variable token system and shadcn baseline with new-york style.

Files Touched:

- `frontend/tailwind.config.ts` (CREATE)
- `frontend/components.json` (CREATE)
- `frontend/src/styles/globals.css` (CREATE)
- `frontend/src/styles/tokens.css` (CREATE)

Logical Flow:

<!-- TOOL: TAILWIND -->
1. Configure Tailwind content scanning and semantic token mapping.
2. Initialize shadcn with CSS variable mode enabled.
3. Define tri-color accents, neutral ramps, and constrained semantic support colors.
4. Register typography tokens for Sora and IBM Plex Mono.
5. Verify token classes render through `bg-*`, `text-*`, `border-*`, and `ring-*` utilities.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npx tailwindcss -i ./src/styles/globals.css -o /tmp/dvote.css` exits 0
- [ ] `cd Exp-6/frontend && npm run build` exits 0

### Phase 5 - Shell Layout, Navigation Patterns, and Motion Base

Goal:
Deliver shared app shell primitives with desktop sidebar, mobile drawer, and motion baseline.

Files Touched:

- `frontend/src/components/layout/AppShell.tsx` (CREATE)
- `frontend/src/components/layout/TopNav.tsx` (CREATE)
- `frontend/src/components/layout/RoleSidebar.tsx` (CREATE)
- `frontend/src/components/layout/MobileDrawer.tsx` (CREATE)
- `frontend/src/components/layout/Footer.tsx` (CREATE)
- `frontend/src/styles/scrollbar.css` (CREATE)
- `frontend/src/styles/motion.css` (CREATE)
- `frontend/src/state/ui-store.ts` (CREATE)

Logical Flow:

<!-- TOOL: SHADCN -->
1. Build responsive shell skeleton with role-aware navigation placeholders.
2. Implement desktop sidebar and mobile drawer pattern.
3. Add global custom scrollbar style for page and nested containers.
4. Apply motion tokens for 150-220ms standard transitions and modal budget range.
5. Add reduced-motion overrides and disable non-essential animations when preferred.
6. Add density preference state with comfortable and compact modes for future table surfaces.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] `cd Exp-6/frontend && npm run preview -- --host 127.0.0.1 --port 4173` starts and renders shell

### Phase 6 - Typed Routing, Guard Matrix, and URL State Foundations

Goal:
Implement deterministic route architecture with role-aware guard flow and URL-state consistency.

Files Touched:

- `frontend/src/app/router.tsx` (CREATE)
- `frontend/src/app/guards.ts` (CREATE)
- `frontend/src/config/routes.ts` (CREATE)
- `frontend/src/config/roles.ts` (CREATE)
- `frontend/src/lib/router/url-state.ts` (CREATE)
- `frontend/src/lib/router/scroll.ts` (CREATE)
- `frontend/src/features/common/UnauthorizedPage.tsx` (CREATE)
- `frontend/src/features/common/NotFoundPage.tsx` (CREATE)

Logical Flow:

<!-- TOOL: TANSTACK_ROUTER -->
1. Define canonical route tree for public and protected segments.
2. Implement `beforeLoad` guards for authentication, role policy, and governance state pre-check.
3. Add deterministic redirects for unauthorized and stale-role cases.
4. Add URL-state synchronization helpers for filters, tabs, and pagination.
5. Implement scroll restoration and deep-link refresh behavior.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] Unauthorized route navigation redirects to `/unauthorized` or role home as configured
- [ ] Back/forward retains URL-state and scroll restoration in route smoke test

### Phase 7 - Wallet Connection and Challenge-Verify Login UX

Goal:
Integrate wallet connectors and challenge-signature login sequence with EOA-only guardrails.

Files Touched:

- `frontend/src/lib/wallet/config.ts` (CREATE)
- `frontend/src/lib/wallet/connectors.ts` (CREATE)
- `frontend/src/lib/auth/challenge.ts` (CREATE)
- `frontend/src/features/auth/LoginLanding.tsx` (CREATE)
- `frontend/src/features/wallet/WalletConnectorPanel.tsx` (CREATE)
- `frontend/src/config/chains.ts` (CREATE)

Logical Flow:

<!-- TOOL: WAGMI -->
1. Configure wagmi, viem, and RainbowKit connectors.
2. Render wallet connector panel with chain and address state feedback.
3. Implement challenge request and signature submission flow.
4. Enforce EOA-only login path and show deterministic smart-wallet unsupported guidance.
5. Handle signature rejection, challenge expiry, and invalid challenge errors with explicit UX states.

Exit Criteria:

- [ ] Wallet connect and disconnect flow works for all selected connectors
- [ ] `POST /api/v1/auth/challenge` and `POST /api/v1/auth/verify` integration path is functional
- [ ] Unsupported smart-account login path is blocked with clear messaging

### Phase 8 - Session Hydration, Timeout, and Re-auth Continuity

Goal:
Establish secure session lifecycle with in-memory access token and cookie-driven refresh continuity.

Files Touched:

- `frontend/src/lib/auth/session.ts` (CREATE)
- `frontend/src/lib/auth/tokens.ts` (CREATE)
- `frontend/src/state/auth-store.ts` (CREATE)
- `frontend/src/features/auth/ReauthGate.tsx` (CREATE)
- `frontend/src/features/auth/SessionTimeoutModal.tsx` (CREATE)
- `frontend/src/features/auth/LogoutAction.tsx` (CREATE)

Logical Flow:

<!-- TOOL: AUTH -->
1. Store access token in memory-only state and never persist refresh token in browser storage.
2. Implement startup hydration through refresh flow and guarded route render.
3. Track inactivity and enforce controlled timeout re-auth flow at 30 minutes.
4. Preserve resumable draft context and route intent without auto-submitting sensitive actions.
5. Implement deterministic logout clearing all sensitive state domains.

Exit Criteria:

- [ ] Refresh-based session hydration works after hard reload
- [ ] Timeout path redirects through re-auth and restores intended route when permitted
- [ ] Access token is not present in localStorage/sessionStorage

### Phase 9 - Wallet Governance State and Lock UX

Goal:
Implement wallet governance state handling before protected route access and sensitive action execution.

Files Touched:

- `frontend/src/lib/wallet/guards.ts` (CREATE)
- `frontend/src/state/wallet-store.ts` (CREATE)
- `frontend/src/features/wallet/WalletMismatchView.tsx` (CREATE)
- `frontend/src/features/wallet/WalletStatusBanner.tsx` (CREATE)
- `frontend/src/components/ui/RoleBadge.tsx` (CREATE)

Logical Flow:

<!-- TOOL: ROUTE_GUARD -->
1. Fetch wallet governance state using `GET /api/v1/wallet/status`.
2. Map hard-lock states to full block routes.
3. Map soft-lock states to limited shell + remediation CTA.
4. Render deterministic mismatch and pending-approval UX surfaces.
5. Emit client telemetry for lock events without exposing sensitive metadata.

Exit Criteria:

- [ ] All governance states render distinct UX and allowed actions
- [ ] Hard lock prevents protected route entry
- [ ] Soft lock allows limited shell with blocked sensitive actions

### Phase 10 - API Client Contract, Error Envelopes, and Freshness Model

Goal:
Build resilient API integration layer with deterministic error mapping and freshness-driven behavior.

Files Touched:

- `frontend/src/lib/api/client.ts` (CREATE)
- `frontend/src/lib/api/errors.ts` (CREATE)
- `frontend/src/lib/api/freshness.ts` (CREATE)
- `frontend/src/lib/api/retry.ts` (CREATE)
- `frontend/src/config/polling.ts` (CREATE)
- `frontend/src/components/ui/FreshnessBanner.tsx` (CREATE)

Logical Flow:

<!-- TOOL: API_CLIENT -->
1. Implement API wrapper with correlation-id aware error handling.
2. Map status codes (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `5xx`) to UI states.
3. Parse freshness envelope fields and enforce action gating for `degraded`.
4. Resolve KYC degraded-gate state from `GET /api/v1/system/freshness` as authoritative source.
5. Apply polling cadence policy: 15s active, 60s background, immediate focus refetch.
6. Add 5s debounce for freshness flicker before lifting restrictive gates.

Exit Criteria:

- [ ] Freshness states render correctly from mocked API responses
- [ ] Global freshness endpoint contract drives KYC degraded-gate state deterministically
- [ ] Degraded state blocks vote cast, escalation execute, and KYC submit actions
- [ ] Polling switches between active and background cadence as specified

### Phase 11 - KYC Wizard, Validation, and Draft Conflict Resolution

Goal:
Deliver multi-step KYC UX with server-synced drafts, masking, and explicit conflict handling.

Files Touched:

- `frontend/src/features/kyc/KycWizardPage.tsx` (CREATE)
- `frontend/src/features/kyc/steps/IdentityStep.tsx` (CREATE)
- `frontend/src/features/kyc/steps/ProfileStep.tsx` (CREATE)
- `frontend/src/features/kyc/steps/ReviewStep.tsx` (CREATE)
- `frontend/src/features/kyc/KycResumeConflictModal.tsx` (CREATE)
- `frontend/src/state/kyc-wizard-store.ts` (CREATE)
- `frontend/src/lib/format/mask.ts` (CREATE)
- `frontend/src/components/ui/LoadingButton.tsx` (CREATE)

Logical Flow:

<!-- TOOL: FORMS -->
1. Build step wizard with deterministic step states and validation checkpoints.
2. Implement Aadhaar and EPIC input canonicalization and mask rendering rules.
3. Implement draft autosave and restore mechanism tied to backend draft version.
4. When server draft is newer, default to server and offer explicit local overwrite action.
5. Prevent duplicate submission and show loading button with preserved label.

Exit Criteria:

- [ ] Wizard supports resume to exact step after re-auth
- [ ] Server-newer draft conflict opens explicit decision modal
- [ ] Sensitive fields are masked in list/review contexts

### Phase 12 - Upload Authorize/Finalize Lifecycle and TTL Guardrails

Goal:
Implement secure media upload lifecycle with strict TTL handling and finalize-bind enforcement.

Files Touched:

- `frontend/src/features/kyc/steps/UploadStep.tsx` (CREATE)
- `frontend/src/lib/upload/contracts.ts` (CREATE)
- `frontend/src/lib/upload/validators.ts` (CREATE)
- `frontend/src/components/ui/UploadCard.tsx` (CREATE)

Logical Flow:

<!-- TOOL: UPLOAD_FLOW -->
1. Request upload authorization contract before each upload attempt.
2. Validate MIME and size: docs <= 10 MB, profile photo <= 5 MB.
3. Upload object and require finalize-bind before enabling KYC submit.
4. If authorize TTL expires, force re-authorize path and preserve draft context.
5. Render file-state badges: uploading, uploaded, scan-pending, rejected, requires-reupload.

Exit Criteria:

- [ ] Upload without authorize contract is blocked
- [ ] Expired authorize contract triggers re-authorize flow
- [ ] Submit action remains blocked until finalize-bind success

### Phase 13 - Voter/Candidate Profile Details and Photo Management

Goal:
Finalize profile UX for voter/candidate paths with deterministic save, status, and media controls.

Files Touched:

- `frontend/src/features/profile/ProfileDetailsForm.tsx` (CREATE)
- `frontend/src/features/profile/ProfilePhotoManager.tsx` (CREATE)
- `frontend/src/features/kyc/steps/ProfileStep.tsx` (UPDATE)
- `frontend/src/features/kyc/steps/ReviewStep.tsx` (UPDATE)

Logical Flow:

<!-- TOOL: PROFILE_UX -->
1. Implement profile details form with draft and submit actions.
2. Add status badges for draft, submitted, under-review, approved, rejected.
3. Add photo add/replace/remove actions with policy-aware restrictions.
4. Keep immutable submit snapshot for review surface.
5. Ensure text fields remain resilient for short and long user content.

Exit Criteria:

- [ ] Profile save and submit flows work with draft persistence
- [ ] Photo manager supports add/replace/remove with policy checks
- [ ] Build and route smoke tests pass for voter and candidate profile paths

### Phase 14 - Owner Queue Operations and Observer Aggregate-only Surfaces

Goal:
Implement owner KYC review interfaces and observer-safe aggregate modules without identity leakage.

Files Touched:

- `frontend/src/features/owner/KycQueuePage.tsx` (CREATE)
- `frontend/src/features/owner/KycDecisionModal.tsx` (CREATE)
- `frontend/src/features/observer/ObserverDashboardPage.tsx` (CREATE)
- `frontend/src/features/observer/ObserverQueueSnapshot.tsx` (CREATE)
- `frontend/src/components/ui/DataTable.tsx` (UPDATE)

Logical Flow:

<!-- TOOL: ROLE_SURFACES -->
1. Build owner queue page with sortable and filterable submission cards.
2. Add owner decision modal for approve, reject, and resubmit actions.
3. Build observer dashboard with aggregate-only status distributions.
4. Add defensive masking layer to hide sensitive fields even if backend accidentally includes them.
5. Add density toggle behavior for large queue data rendering.

Exit Criteria:

- [ ] Owner role can view actionable queue rows and decision controls
- [ ] Observer role cannot view identity-linked queue data
- [ ] Density toggle switches between comfortable and compact without layout breakage

### Phase 15 - Election Discovery, Detail Surfaces, and URL-synced Filters

Goal:
Implement election browsing and detail pages with lifecycle context, filtering, and shareable URLs.

Files Touched:

- `frontend/src/features/elections/ElectionListPage.tsx` (CREATE)
- `frontend/src/features/elections/ElectionDetailPage.tsx` (CREATE)
- `frontend/src/features/elections/ElectionFilters.tsx` (CREATE)
- `frontend/src/components/ui/StateCard.tsx` (UPDATE)
- `frontend/src/components/ui/PaginationBar.tsx` (CREATE)
- `frontend/src/components/ui/FilterBar.tsx` (CREATE)
- `frontend/src/lib/format/intl.ts` (CREATE)
- `frontend/src/lib/router/url-state.ts` (UPDATE)

Logical Flow:

<!-- TOOL: QUERY_LAYER -->
1. Build election list with search, status chips, and deterministic pagination.
2. Persist filter and pagination state in URL query params.
3. Build election detail page with lifecycle timeline and candidate presentation.
4. Add localized date/time and numeric formatting for election timing and counts.
5. Render finalization status placeholders for non-finalized states.

Exit Criteria:

- [ ] Election list filter state survives refresh and shareable URL reopen
- [ ] Election detail page renders lifecycle timeline and candidate set
- [ ] Pagination works with cursor-first and offset fallback strategy

### Phase 16 - Vote Intent, Cast State Machine, and Conflict Safety

Goal:
Implement vote journey state machine with token TTL rules, idempotency handling, and uncertain timeout fallback.

Files Touched:

- `frontend/src/features/voting/VoteIntentPanel.tsx` (CREATE)
- `frontend/src/features/voting/VoteCastModal.tsx` (CREATE)
- `frontend/src/features/voting/VoteStateCard.tsx` (CREATE)
- `frontend/src/features/voting/VoteTimeoutFallback.tsx` (CREATE)
- `frontend/src/state/vote-store.ts` (CREATE)
- `frontend/src/components/ui/SafeActionButton.tsx` (CREATE)
- `frontend/src/components/ui/ConfirmDialog.tsx` (CREATE)

Logical Flow:

<!-- TOOL: VOTE_FLOW -->
1. Request one-time vote token and bind it to wallet and election context.
2. Enforce 60s TTL with visible countdown and 10s safety buffer warning.
3. Run vote state machine transitions from idle to terminal states.
4. Handle `409` conflicts with deterministic already-recorded messaging.
5. On relay timeout uncertainty, block immediate recast and query `/api/v1/votes/status` using `voteIntentId` first, then `wallet + electionId + clientNonce` fallback.
6. Render safe recast guidance only after lookup response is terminal or retry window guidance is provided.

Exit Criteria:

- [ ] Vote token expiry forces restart flow
- [ ] Duplicate cast clicks are suppressed in-flight
- [ ] Timeout uncertainty state renders with safe follow-up guidance
- [ ] Timeout auto-check honors vote-status lookup precedence (`voteIntentId` -> tuple fallback)

### Phase 17 - Results, Rerun Lineage, and Escalation Split Flows

Goal:
Implement result rendering parity, lineage UX, superseded election behavior, and escalation split.

Files Touched:

- `frontend/src/features/results/ResultsListPage.tsx` (CREATE)
- `frontend/src/features/results/ResultDetailPage.tsx` (CREATE)
- `frontend/src/features/rerun/LineagePage.tsx` (CREATE)
- `frontend/src/features/rerun/RerunSlaCard.tsx` (CREATE)
- `frontend/src/features/rerun/EscalationTicketForm.tsx` (CREATE)
- `frontend/src/components/ui/Timeline.tsx` (UPDATE)

Logical Flow:

<!-- TOOL: RERUN_UX -->
1. Render result outcomes with exact backend enum parity.
2. Build lineage page showing parent-child election relationships.
3. Hard-lock action controls for superseded elections and route users to child rerun election.
4. Render SLA states with 48h due-soon threshold and countdown.
5. Implement escalation split: admin ticket creation and ECI execute path.
6. Enforce immutable escalation ticket after submission.

Exit Criteria:

- [ ] All finalization outcomes render correctly
- [ ] Superseded election actions remain blocked
- [ ] Escalation submit path is immutable after completion

### Phase 18 - Inbox, Alerts, Observer Anomalies, and Freshness-driven Gating

Goal:
Deliver inbox and observability features with locked polling cadence and consistent degraded-mode behavior.

Files Touched:

- `frontend/src/features/inbox/InboxPage.tsx` (CREATE)
- `frontend/src/features/inbox/NotificationCard.tsx` (CREATE)
- `frontend/src/features/inbox/InboxFilters.tsx` (CREATE)
- `frontend/src/features/observer/AnomalyReportForm.tsx` (CREATE)
- `frontend/src/lib/telemetry/client-events.ts` (UPDATE)
- `frontend/src/components/ui/EmptyState.tsx` (UPDATE)
- `frontend/src/components/ui/ErrorState.tsx` (UPDATE)
- `frontend/src/components/ui/EmptyChartState.tsx` (CREATE)

Logical Flow:

<!-- TOOL: OBSERVABILITY -->
1. Implement inbox with category, priority, and read/unread actions.
2. Apply locked polling cadence and focus refetch behavior.
3. Render freshness banner and gate sensitive actions when degraded.
4. Implement observer anomaly report flow with client-side validation and rate-limit messaging.
5. Add telemetry events for critical UX actions and guard outcomes.

Exit Criteria:

- [ ] Inbox polling follows 15s/60s cadence and focus refresh
- [ ] Degraded state visibly gates sensitive actions
- [ ] Observer anomaly submission flow works with clear retry/error paths

### Phase 19 - Guided Tutorials and Role-based Onboarding

Goal:
Implement role-specific tutorial orchestration with resume, replay, and role-switch safety.

Files Touched:

- `frontend/src/features/tutorials/TutorialOrchestrator.tsx` (CREATE)
- `frontend/src/features/tutorials/tutorial-config.ts` (CREATE)
- `frontend/src/state/tutorial-store.ts` (UPDATE)

Logical Flow:

<!-- TOOL: JOYRIDE -->
1. Create owner, observer, and voter/candidate tutorial tracks.
2. Persist tutorial progress using `wallet + role + appVersion` keying.
3. Implement resume from last step when tutorial is incomplete.
4. On role change, reset to new role track and preserve old role progress separately.
5. Add replay controls from help/profile surfaces.

Exit Criteria:

- [ ] Tutorial auto-start works for first-time role sessions
- [ ] Role change resets to correct tutorial track
- [ ] Replay action launches tutorial on demand

### Phase 20 - Accessibility and WIG Compliance Hardening

Goal:
Harden frontend interactions against WIG requirements for keyboard, focus, forms, and semantics.

Files Touched:

- `frontend/src/components/a11y/SkipToContent.tsx` (CREATE)
- `frontend/src/components/a11y/FocusOutlineDebug.tsx` (CREATE)
- `frontend/src/components/layout/AppShell.tsx` (UPDATE)
- `frontend/src/components/ui/LoadingButton.tsx` (UPDATE)
- `frontend/src/styles/globals.css` (UPDATE)

Logical Flow:

<!-- TOOL: A11Y -->
1. Add skip link and heading hierarchy safeguards.
2. Enforce visible focus rings and modal focus trap behavior.
3. Ensure form inputs permit paste and set first-error focus on invalid submit.
4. Add `aria-live` polite updates for toasts and inline validation.
5. Validate touch target sizes and no dead-zone behavior.

Exit Criteria:

- [ ] Keyboard-only walkthrough passes for auth, KYC, vote, and inbox flows
- [ ] Focus is never lost during modal and async transitions
- [ ] A11Y linting or audit checks pass with no blocker-level violations

### Phase 21 - Performance, Asset Splitting, and Vercel Deployment Configuration

Goal:
Optimize bundle behavior and configure deployment for preview and production reliability.

Files Touched:

- `frontend/vercel.json` (CREATE)
- `frontend/public/manifest.webmanifest` (CREATE)
- `frontend/src/lib/health/heartbeat.ts` (CREATE)
- `frontend/src/features/diagnostics/HealthBadge.tsx` (CREATE)
- `frontend/vite.config.ts` (UPDATE)

Logical Flow:

<!-- TOOL: VERCEL -->
1. Add route-level code splitting for heavy feature modules.
2. Configure SPA rewrites in `vercel.json` for deep links.
3. Validate preview and production origin settings against backend CORS allowlist.
4. Add non-blocking health badge for optional frontend diagnostics.
5. Validate first-load and route-transition performance with realistic throttling.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm run build` exits 0 with expected split chunks
- [ ] Deep link routes load correctly in `npm run preview`
- [ ] Preview/prod CORS origin values are documented and verified

### Phase 22 - Test Matrix, Release Verification, and Frontend Runbook

Goal:
Finalize quality gates, automated tests, and operational documentation for maintainable frontend delivery.

Files Touched:

- `frontend/src/test/setup.ts` (CREATE)
- `frontend/src/test/unit/guards.test.ts` (CREATE)
- `frontend/src/test/unit/freshness.test.ts` (CREATE)
- `frontend/src/test/integration/auth-flow.test.tsx` (CREATE)
- `frontend/src/test/integration/kyc-wizard.test.tsx` (CREATE)
- `frontend/src/test/integration/vote-state-machine.test.tsx` (CREATE)
- `frontend/vitest.config.ts` (CREATE)
- `frontend/playwright.config.ts` (CREATE)
- `frontend/e2e/role-routing.spec.ts` (CREATE)
- `frontend/e2e/vote-flow.spec.ts` (CREATE)
- `frontend/e2e/kyc-upload-ttl.spec.ts` (CREATE)
- `frontend/README.md` (CREATE)

Logical Flow:

<!-- TOOL: TESTING -->
1. Add unit tests for route guards and freshness transitions.
2. Add integration tests for auth, KYC wizard, and vote state machine.
3. Add E2E scenarios for role routing, vote flow, and upload TTL behavior.
4. Build frontend runbook with setup, scripts, env keys, and troubleshooting notes.
5. Run final test/build matrix before signoff.

Exit Criteria:

- [ ] `cd Exp-6/frontend && npm run test` exits 0
- [ ] `cd Exp-6/frontend && npm run test:e2e` exits 0 or documented deferred with reason
- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] `frontend/README.md` includes setup, env keys, scripts, and known constraints

---

## 4. Crucial Development Moments (CDM)

### CDM-1 - Runtime and Package Compatibility Drift (Phase 1/2)

Risk:
Frontend stack drifts across Node, Vite, wagmi, and RainbowKit and fails unpredictably.

Why it matters:
Compatibility drift causes avoidable setup failures and delays before feature implementation.

What to do:
1. Lock Node to 22.x and validate with `.nvmrc`.
2. Freeze dependency versions in lockfile.
3. Confirm Vite and wallet stack compatibility before coding feature modules.

Common mistake:
Using latest tags ad-hoc without validating peer dependency requirements.

### CDM-2 - Token Strategy Drift from CSS Variables to Inline Colors (Phase 4)

Risk:
Component styles bypass semantic tokens and create visual inconsistency.

Why it matters:
Token bypass makes tri-color governance, accessibility checks, and future refactors difficult.

What to do:
1. Enforce CSS-variable semantic token usage in shadcn setup.
2. Reject direct hard-coded color values in component-level class strings unless justified.
3. Keep semantic mapping for status colors and focus rings centralized.

Common mistake:
Hard-coding temporary colors during rapid UI iteration and never normalizing.

### CDM-3 - Tri-color Overuse and Contrast Degradation (Phase 4/5/20)

Risk:
Tri-color accents are over-applied and reduce content readability and visual hierarchy.

Why it matters:
Brand styling should not degrade legibility, especially for election-critical screens.

What to do:
1. Keep neutral surfaces as base and use tri-colors for intentional accents.
2. Validate WCAG AA and APCA thresholds for critical text and focus states.
3. Use constrained semantic support colors for error and info states.

Common mistake:
Applying saffron/green as large background blocks across dense data views.

### CDM-4 - Protected Content Flash Before Guard Resolution (Phase 6)

Risk:
Unauthorized users briefly see protected content during route hydration.

Why it matters:
Even brief exposure violates role boundary expectations.

What to do:
1. Resolve auth, role, and wallet governance state before protected render.
2. Render placeholder shell while guard checks are in progress.
3. Use deterministic redirects for disallowed routes.

Common mistake:
Running guard checks only inside page components instead of route loader/beforeLoad.

### CDM-5 - Wallet Chain Mismatch and Unsupported Login Path (Phase 7)

Risk:
Users connect wrong chain or unsupported smart-account login path and get ambiguous failures.

Why it matters:
Wallet UX confusion directly hurts trust and task completion.

What to do:
1. Show explicit chain mismatch banner and guided chain switch action.
2. Enforce EOA-only login policy with deterministic message for unsupported path.
3. Keep wallet status and role mapping visible in session context.

Common mistake:
Allowing signature attempt before chain/account checks complete.

### CDM-6 - Token Persistence Safety Regression (Phase 8)

Risk:
Access or refresh tokens end up in persistent browser storage.

Why it matters:
Persistent token leakage raises session hijack risk.

What to do:
1. Keep access token in memory only.
2. Keep refresh token backend-controlled in HttpOnly cookie.
3. Audit storage usage and clear sensitive state on logout.

Common mistake:
Storing token copies in localStorage for convenience during debugging.

### CDM-7 - Timeout Resume Triggers Unsafe Automatic Actions (Phase 8/16)

Risk:
User timeout recovery auto-submits stale vote or KYC actions.

Why it matters:
Unsafe auto-actions can create duplicate or unintended operations.

What to do:
1. Resume only state, never auto-submit protected mutations.
2. Require explicit user confirmation after re-auth in sensitive workflows.
3. Re-validate freshness and token validity before action re-enable.

Common mistake:
Replaying pending mutation queue immediately after session restoration.

### CDM-8 - Governance Lock State Misinterpretation (Phase 9)

Risk:
Hard lock and soft lock are handled the same in UI.

Why it matters:
Incorrect lock semantics either over-block legitimate users or under-protect sensitive routes.

What to do:
1. Hard lock: full route block.
2. Soft lock: limited shell plus remediation path.
3. Keep lock-state transitions sourced from backend contract.

Common mistake:
Caching governance state too aggressively and showing stale permissions.

### CDM-9 - Freshness Contract Ignored in Action Layer (Phase 10/18)

Risk:
Sensitive actions remain enabled when `freshnessState` is degraded.

Why it matters:
Degraded systems increase risk of inconsistent outcomes.

What to do:
1. Gate vote cast, escalation execute, and KYC submit on degraded.
2. Debounce state changes for 5s to prevent rapid gate flapping.
3. Show clear degraded banner with retry guidance.

Common mistake:
Treating freshness as cosmetic status only.

### CDM-10 - KYC Draft Conflict Silent Overwrite (Phase 11)

Risk:
Local draft replaces newer server draft without explicit user decision.

Why it matters:
Silent overwrite can lose review-critical KYC data.

What to do:
1. Detect version conflict before merge.
2. Default to server draft.
3. Offer explicit local overwrite action with confirmation.

Common mistake:
Auto-merging JSON payloads without field ownership policy.

### CDM-11 - Upload Finalize-Bind Gap (Phase 12)

Risk:
User submits KYC while uploaded artifacts are not finalize-bound.

Why it matters:
Unbound media invalidates review integrity and traceability.

What to do:
1. Keep submit disabled until finalize-bind success.
2. Force re-authorize on TTL expiry.
3. Preserve draft but invalidate stale upload references.

Common mistake:
Treating successful object upload as equivalent to bound submission state.

### CDM-12 - Observer Data Leakage in Aggregate Screens (Phase 14)

Risk:
Observer screens show identity-linked fields due to backend response drift.

Why it matters:
Observer role is intentionally restricted to aggregate context.

What to do:
1. Apply frontend defensive masking as second safety layer.
2. Emit telemetry warning if forbidden fields are detected.
3. Hide controls that imply owner-level remediation.

Common mistake:
Rendering all fields from API without role-aware sanitization.

### CDM-13 - Vote Token Expiry and Race Conditions (Phase 16)

Risk:
Vote token expires mid-cast and creates ambiguous UX.

Why it matters:
Ambiguity in vote workflow damages user trust.

What to do:
1. Show countdown and safety buffer warning.
2. Force restart when token expires.
3. On relay timeout uncertainty, run status checks before recast.

Common mistake:
Allowing immediate recast without checking previous relay status.

### CDM-14 - Superseded Election Action Leakage (Phase 17)

Risk:
Superseded parent election still exposes action controls.

Why it matters:
Superseded parent must be historical, not actionable.

What to do:
1. Hard-lock vote and escalation actions for superseded election pages.
2. Route user toward child rerun context.
3. Keep lineage timeline visible for transparency.

Common mistake:
Checking only status chip text without enforcing action policy.

### CDM-15 - Escalation Mutability Regression (Phase 17)

Risk:
Escalation ticket can be edited after submission.

Why it matters:
Post-submit mutability breaks audit expectations.

What to do:
1. Enforce immutable ticket surfaces after submit.
2. Route corrections through append-only follow-up path.
3. Keep actor and timestamp metadata visible.

Common mistake:
Reusing editable form component for both create and post-submit views.

### CDM-16 - Tutorial Role-switch State Collision (Phase 19)

Risk:
Tutorial state from one role incorrectly resumes on another role.

Why it matters:
Mis-scoped tutorials confuse users and hide important role actions.

What to do:
1. Key progress by wallet + role + appVersion.
2. Reset track on role switch.
3. Preserve prior role progress for when role context returns.

Common mistake:
Using wallet-only key scope.

### CDM-17 - Accessibility Regressions During UI Polish (Phase 20)

Risk:
Visual polish introduces focus loss, keyboard traps, or contrast failures.

Why it matters:
Election workflows must remain operable and inclusive.

What to do:
1. Re-run keyboard walkthrough after each UI polish pass.
2. Verify focus indicators and modal trap behavior.
3. Re-check contrast for changed tokens and status badges.

Common mistake:
Removing visible focus styling during visual cleanup.

### CDM-18 - Preview/Production Origin Mismatch (Phase 21)

Risk:
Vercel preview/prod URLs fail against backend CORS allowlist.

Why it matters:
Auth and API calls fail despite healthy local development.

What to do:
1. Validate localhost, preview, and production origins before deployment.
2. Keep environment mapping explicit and versioned.
3. Re-test auth and protected routes after preview deploy.

Common mistake:
Testing only local runtime and skipping preview origin validation.

---

## 5. Manual Execution Tasks (MET)

### MET-1 - Runtime and Scaffold Validation (before Phase 2)

1. Open terminal in `Exp-6/frontend`.
2. Run `node -v` and confirm Node 22.x.
3. Run `npm install`.
4. Run `npm run build`.
5. Record output snapshot in development notes.

### MET-2 - Wallet Connector Sanity (before Phase 7)

1. Connect MetaMask account.
2. Connect WalletConnect account.
3. Connect Coinbase wallet account.
4. Connect Rainbow wallet account.
5. Confirm connector labels and address previews render correctly.

### MET-3 - Chain Context Validation (before Phase 7)

1. Set wallet to wrong chain and attempt login.
2. Confirm mismatch guidance appears.
3. Switch to expected chain.
4. Retry login and confirm success path.

### MET-4 - CORS Triple-Origin Check (before Phase 10)

1. Test localhost frontend against backend.
2. Deploy preview frontend and test against preview/backend origin rules.
3. Test production domain mapping plan in staging notes.
4. Confirm all three origins are documented in env checklist.

### MET-5 - Token Visual Baseline Review (before Phase 5 and after Phase 20)

1. Review saffron, white, green token usage in navigation and CTAs.
2. Review error/info semantic colors for readability.
3. Review neutral ramps for content-heavy screens.
4. Confirm no hard-coded rogue color values remain.

### MET-6 - Contrast and Focus Audit (during Phase 20)

1. Check body text contrast against background.
2. Check button and form control contrast.
3. Check focus ring contrast in light theme.
4. Check status chip readability and non-color cues.
5. Record pass/fail in QA checklist.

### MET-7 - Keyboard and Navigation Walkthrough (during Phase 20)

1. Navigate login, KYC, vote, and inbox flows with keyboard only.
2. Confirm skip link works.
3. Confirm focus trap in modal/dialog.
4. Confirm focus returns after modal close.
5. Confirm no keyboard dead ends.

### MET-8 - KYC Happy Path Manual Run (after Phase 11)

1. Start KYC wizard.
2. Complete identity and profile steps.
3. Save draft.
4. Resume draft and submit.
5. Confirm status transitions render as expected.

### MET-9 - Aadhaar-only Fallback Manual Run (after Phase 11/12)

1. Select Aadhaar-only fallback path.
2. Select required reason code.
3. Upload at least one additional evidence file.
4. Finalize-bind all uploads.
5. Confirm submit button enables only after all required artifacts are bound.

### MET-10 - Upload TTL Expiry Drill (after Phase 12)

1. Request upload authorization.
2. Wait beyond TTL window.
3. Attempt finalize action.
4. Confirm forced re-authorize path appears.
5. Confirm draft remains recoverable.

### MET-11 - Session Timeout and Resume Drill (after Phase 8)

1. Start KYC step and remain idle past timeout.
2. Re-authenticate through controlled flow.
3. Confirm route intent restore.
4. Confirm wizard resumes exact prior step.
5. Confirm no auto-submit action occurred.

### MET-12 - Vote Token Expiry Drill (after Phase 16)

1. Request vote token.
2. Wait until token expiry.
3. Attempt cast with expired token.
4. Confirm restart flow guidance.
5. Request fresh token and complete cast flow.

### MET-13 - Vote Timeout Uncertain-State Drill (after Phase 16)

1. Simulate delayed/no-response relay outcome.
2. Confirm uncertain-state card appears.
3. Confirm immediate recast is temporarily blocked.
4. Confirm status check action is offered.
5. Confirm safe follow-up route to results or history.

### MET-14 - Observer Masking Safety Drill (after Phase 14/18)

1. Login as observer.
2. Open queue and anomaly surfaces.
3. Confirm identity-linked fields are absent.
4. Confirm aggregate counts and trends remain visible.
5. Confirm no owner remediation controls appear.

### MET-15 - Rerun Lineage and Superseded Drill (after Phase 17)

1. Open parent election marked superseded.
2. Confirm vote and escalation actions are locked.
3. Open lineage route.
4. Confirm child rerun link is available.
5. Confirm SLA countdown and due-soon state behavior.

### MET-16 - Escalation Immutability Drill (after Phase 17)

1. Create escalation ticket as admin.
2. Re-open ticket detail view.
3. Confirm edit controls are absent.
4. Add correction through append-only flow.
5. Confirm audit timeline shows both records.

### MET-17 - Tutorial Role-switch Drill (after Phase 19)

1. Start tutorial as one role.
2. Switch role context.
3. Confirm new role tutorial starts at step 1.
4. Switch back to original role.
5. Confirm prior role progress is preserved.

### MET-18 - Responsive Shell and Density Drill (after Phase 5/14)

1. Test shell on mobile width.
2. Test shell on tablet width.
3. Test shell on laptop width.
4. Test shell on wide desktop width.
5. Toggle table density and confirm stable layout.

### MET-19 - Performance and Throttling Drill (after Phase 21)

1. Run browser CPU throttle scenario.
2. Run slow network profile.
3. Validate route split behavior.
4. Validate list virtualization behavior.
5. Record bottlenecks and fixes.

### MET-20 - Secret and Hygiene Sweep (before final commit)

1. Run `git status --short`.
2. Confirm `.env` is not tracked.
3. Search for accidental secret-like strings.
4. Confirm no sensitive identifiers appear in screenshots/log snippets.
5. Complete final pre-commit checklist.

---

## 6. Verification Checklist

All checklists in this section must pass before frontend implementation is declared complete.

### 6.1 Build and Type Validation

- [ ] `cd Exp-6/frontend && npm run build` exits 0
- [ ] `cd Exp-6/frontend && npm run lint` exits 0 (or deferred with issue ID)
- [ ] `cd Exp-6/frontend && npm run test` exits 0 (or deferred with issue ID)

### 6.2 Routing and Guard Validation

- [ ] Protected route access is blocked before content render for unauthorized roles
- [ ] Role home redirects work for admin, observer, voter/candidate paths
- [ ] Deep-link refresh works for protected routes after session hydration
- [ ] URL-state sync works for filters, tabs, and pagination

### 6.3 Authentication and Session Validation

- [ ] Wallet challenge/verify flow succeeds for supported EOA wallets
- [ ] Unsupported smart-wallet login path is blocked with deterministic guidance
- [ ] Access token remains memory-only and is absent from localStorage/sessionStorage
- [ ] Timeout re-auth flow restores route intent without auto-submitting sensitive actions

### 6.4 Wallet Governance Validation

- [ ] `WalletMismatchLocked` blocks route entry
- [ ] `WalletSwitchPendingApproval` shows limited shell and remediation guidance
- [ ] `WalletSwitchApprovedAwaitingOnChainRebind` state surfaces deterministic next-step guidance
- [ ] `WalletSwitchRejected` state displays rejection and retry/support path

### 6.5 KYC and Upload Validation

- [ ] Wizard supports deterministic step progression and resume
- [ ] Server-newer draft conflict modal defaults to server and supports explicit overwrite
- [ ] Aadhaar-only path enforces reason code and additional evidence requirement
- [ ] Upload authorize/finalize flow is mandatory before submit
- [ ] Upload TTL expiry forces re-authorize path and blocks submit until re-bound

### 6.6 Vote, Results, and Rerun Validation

- [ ] Vote token TTL and safety buffer behavior is enforced
- [ ] Idempotency conflicts show deterministic non-duplicating UX state
- [ ] Relay timeout uncertainty state appears with safe follow-up actions
- [ ] Timeout follow-up uses `/api/v1/votes/status` with lookup precedence (`voteIntentId`, then `wallet + electionId + clientNonce`)
- [ ] Finalization outcomes render exact backend enum values
- [ ] Superseded election actions are hard-locked and lineage route is accessible
- [ ] Rerun SLA states (`on-track`, `due-soon`, `breached`) render correctly when provided

### 6.7 Escalation and Inbox Validation

- [ ] Escalation ticket creation works for admin role
- [ ] Escalation ticket edit is blocked after submission
- [ ] Inbox category and priority sorting works
- [ ] Read/unread state updates correctly

### 6.8 Freshness and Polling Validation

- [ ] Polling cadence is 15s active and 60s background
- [ ] Window focus triggers immediate refresh
- [ ] `GET /api/v1/system/freshness` is authoritative for KYC degraded-gate decisions
- [ ] `degraded` freshness blocks vote cast, escalation execute, and KYC submit
- [ ] 5s debounce prevents rapid restrictive gate flicker

### 6.9 Observer and Privacy Validation

- [ ] Observer views remain aggregate-only with no identity-linked rows
- [ ] Defensive masking hides leaked sensitive fields if backend payload drifts
- [ ] Observer anomaly submission and status workflow operates without owner controls

### 6.10 Accessibility and WIG Validation

- [ ] Keyboard-only path works across auth, KYC, vote, and inbox
- [ ] Focus-visible and modal focus trap behavior are stable
- [ ] Form validation focuses first error on submit failure
- [ ] `aria-live` updates are present for toasts and validation feedback
- [ ] Touch targets and no dead-zone behavior satisfy WIG requirements

### 6.11 Performance and Deployment Validation

- [ ] Route-level code splitting is active in production build
- [ ] Large list rendering is virtualized where required
- [ ] `vercel.json` rewrite rules support SPA deep links
- [ ] Preview and production origins are validated against backend CORS policy

### 6.12 Security and Hygiene Validation

- [ ] No secrets in frontend source files, snapshots, or committed env files
- [ ] Sensitive identifiers are masked in non-detail views
- [ ] Internal backend endpoints `/ready` and `/startup` are not consumed by frontend flows
- [ ] Pre-commit secret sweep and grep checks pass

### 6.13 Plan Integrity Validation

- [ ] Section order remains `0` through `9` with no mandatory section omitted
- [ ] Phase count and file map references remain consistent
- [ ] CDM and MET references align with phase numbering
- [ ] FILE_LENGTH_TAG is revalidated after final line count

---

## 7. Known Issues and Fixes

### Issue-1 - Vite config ESM/CJS mismatch

Symptom:
Build fails with ESM import or config loading errors.

Root Cause:
Config format mismatches package module mode.

Fix:

```bash
cd Exp-6/frontend
npm pkg set type=module
npm run build
```

### Issue-2 - Tailwind utilities not generated

Symptom:
Token-based classes such as `bg-background` do not apply.

Root Cause:
Tailwind content paths or CSS imports are incomplete.

Fix:

```bash
cd Exp-6/frontend
rg "content:" tailwind.config.ts
rg "globals.css|tokens.css" src/main.tsx src/App.tsx
npm run build
```

### Issue-3 - shadcn theme mode accidentally initialized without CSS variables

Symptom:
Semantic token classes do not map as expected.

Root Cause:
`components.json` configured with non-variable mode.

Fix:

```bash
cd Exp-6/frontend
cat components.json
# If cssVariables is false and project requires true, reinitialize component setup in a controlled migration.
```

### Issue-4 - Wallet hooks fail at runtime

Symptom:
wagmi hooks throw provider/context errors.

Root Cause:
Missing `WagmiProvider` and/or `QueryClientProvider` wrapping order.

Fix:

```bash
cd Exp-6/frontend
rg "WagmiProvider|QueryClientProvider" src/app/providers.tsx
npm run build
```

### Issue-5 - WalletConnect connection never resolves

Symptom:
WalletConnect modal opens but session does not establish.

Root Cause:
Invalid or missing project ID in environment.

Fix:

```bash
cd Exp-6/frontend
rg "VITE_WALLETCONNECT_PROJECT_ID" .env.example src/config/env.ts
```

### Issue-6 - Session refresh fails on preview deployment

Symptom:
Login works locally but preview re-auth fails unexpectedly.

Root Cause:
Cookie and CORS settings not aligned for preview domain.

Fix:

```bash
cd /home/prats/Playground/SEM VIII/blockchain-lab
echo "Verify backend cookie policy and CORS includes preview origin"
```

### Issue-7 - Route guard redirect loop

Symptom:
Protected route constantly redirects between login and protected path.

Root Cause:
Hydration state and guard checks race each other.

Fix:

```bash
cd Exp-6/frontend
rg "hydration|beforeLoad|redirect" src/app
```

### Issue-8 - Upload finalize fails after delay

Symptom:
Upload succeeds but finalize endpoint rejects with stale contract error.

Root Cause:
Authorize TTL expired before finalize-bind call.

Fix:

```bash
cd Exp-6/frontend
echo "Implement forced re-authorize and re-bind path when TTL expires"
```

### Issue-9 - Sensitive actions still enabled during degraded freshness

Symptom:
Vote/escalation/KYC submit actions remain enabled while `freshnessState` is degraded.

Root Cause:
UI gate condition not uniformly applied across action components.

Fix:

```bash
cd Exp-6/frontend
rg "freshnessState|degraded" src
```

### Issue-10 - Observer sees restricted fields in edge payloads

Symptom:
Observer UI accidentally renders identity-linked values.

Root Cause:
Defensive masking layer not applied before render.

Fix:

```bash
cd Exp-6/frontend
rg "observer|mask|aggregate" src/features/observer src/lib/format
```

### Issue-11 - Tutorial step target missing after UI refactor

Symptom:
Tutorial exits or stalls on a removed selector.

Root Cause:
Joyride targets drifted after layout changes.

Fix:

```bash
cd Exp-6/frontend
rg "target:" src/features/tutorials
echo "Add graceful skip behavior for missing targets"
```

### Issue-12 - Production chunk warning for large modules

Symptom:
Build output warns about oversized chunks and slower first-load.

Root Cause:
Feature modules not split or lazy loaded sufficiently.

Fix:

```bash
cd Exp-6/frontend
npm run build
echo "Apply route-level lazy loading and split heavy feature modules"
```

---

## 8. Security Reminders

1. Never store private keys, mnemonics, or API secrets in frontend source.
2. Keep access token in memory only.
3. Never persist refresh token in localStorage or sessionStorage.
4. Keep `.env` ignored and use `.env.example` placeholders only.
5. Do not expose full Aadhaar or EPIC values in list or shared screens.
6. Apply masking for identity values in all non-detail contexts.
7. Enforce role deny-by-default for routes and UI actions.
8. Treat backend `403` as expected safety fallback and render deterministic denial UI.
9. Block sensitive actions when freshness is degraded.
10. Do not auto-submit vote or KYC actions after session restoration.
11. Require explicit confirmation for vote cast and destructive owner actions.
12. Enforce immutable escalation tickets after submit.
13. Maintain observer aggregate-only rendering policy.
14. Validate upload MIME/type/size before transfer.
15. Enforce upload authorize/finalize contract before KYC submit.
16. Keep route guards authoritative and pre-render for protected screens.
17. Do not consume internal `/ready` and `/startup` endpoints from frontend UX.
18. Sanitize error surfaces and avoid leaking backend internals.
19. Emit telemetry without PII payload leakage.
20. Re-run secret sweep and sensitive-data scan before each major commit.

---

## 9. Git Commit Checkpoints

Commit at phase boundaries only after exit criteria pass.

| Checkpoint | Phase | Suggested Commit Message |
|---|---|---|
| CP-1 | 1 | `config(exp-6): lock frontend runtime and policy baselines` |
| CP-2 | 2 | `feat(exp-6): scaffold frontend workspace and dependency baseline` |
| CP-3 | 3 | `feat(exp-6): add provider composition and env parsing layer` |
| CP-4 | 4 | `style(exp-6): establish tokenized theme and shadcn setup` |
| CP-5 | 5 | `feat(exp-6): implement responsive shell and motion foundation` |
| CP-6 | 6 | `feat(exp-6): add typed router guards and URL-state utilities` |
| CP-7 | 7 | `feat(exp-6): integrate wallet connectors and challenge login flow` |
| CP-8 | 8 | `feat(exp-6): implement session hydration and timeout reauth flow` |
| CP-9 | 9 | `feat(exp-6): add wallet governance lock-state UX handling` |
| CP-10 | 10 | `feat(exp-6): implement API client and freshness-driven gating` |
| CP-11 | 11 | `feat(exp-6): add kyc wizard with draft conflict handling` |
| CP-12 | 12 | `feat(exp-6): add upload authorize finalize ttl guardrails` |
| CP-13 | 13 | `feat(exp-6): implement profile details and photo management` |
| CP-14 | 14 | `feat(exp-6): build owner queue and observer aggregate views` |
| CP-15 | 15 | `feat(exp-6): implement election listing detail and url filters` |
| CP-16 | 16 | `feat(exp-6): implement vote token cast state machine and safety` |
| CP-17 | 17 | `feat(exp-6): add results rerun lineage and escalation split` |
| CP-18 | 18 | `feat(exp-6): add inbox observability and anomaly workflows` |
| CP-19 | 19 | `feat(exp-6): add role based tutorials with resume replay` |
| CP-20 | 20 | `fix(exp-6): harden accessibility and wig compliance behaviors` |
| CP-21 | 21 | `chore(exp-6): optimize build chunks and configure vercel routing` |
| CP-22 | 22 | `test(exp-6): add unit integration e2e suites and frontend runbook` |

### 9.1 Commit Hygiene Rules

1. Do not batch multiple unfinished phases into one checkpoint commit.
2. Do not commit with failing build unless explicitly documented and approved.
3. Keep commit scope limited to frontend paths for this plan execution.
4. Keep generated snapshots and transient artifacts out of commits unless required.
5. Re-run secret hygiene checks before each checkpoint commit.

### 9.2 Post-Plan Note

1. This plan intentionally excludes `EXP-6_DOC.md` authoring.
2. EXP-6 documentation report will be produced after DVote implementation reaches stable readiness.

