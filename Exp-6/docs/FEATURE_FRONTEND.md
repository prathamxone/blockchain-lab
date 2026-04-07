# DVote (MVP + Frontend) - Technical Feature Description

Authoring scope: Exp-6 Frontend only  
Status: Draft baseline for implementation  
Last updated: 2026-04-08

---

## 1. Purpose and Scope

This document defines the complete technical feature description for the DVote mini-project
frontend layer in Exp-6. It is the implementation contract for frontend architecture,
route-level role controls, wallet-first authentication UX, KYC and media workflows,
voting interaction behavior, accessibility compliance, and deployment constraints.

This specification is aligned to:

- ITL801 LO6 expectations for a full-fledged DApp mini project
- DVote idea constraints finalized during brainstorming for frontend MVP
- Foundry boundaries in `Exp-6/docs/FEATURE_FOUNDRY.md`
- Backend contracts in `Exp-6/docs/FEATURE_BACKEND.md`
- Repository standards in `README.md`, `CONTRIBUTING.md`, and `docs/WIG.md`

### 1.1 In Scope (Frontend MVP)

- React + Vite frontend in `Exp-6/frontend`
- Hybrid app delivery model: static public entry plus authenticated SPA app shell
- Role-aware route and component access for Admin/ECI/SRO/RO/Observer/Voter/Candidate personas
- Wallet connection and signed-challenge authentication UX integration with backend
- KYC submission wizard with resumable drafts and strict fallback handling
- Voter/Candidate profile details and profile-photo management UX for KYC simulation
- Election discovery, vote-intent, vote-cast, and result visibility UX
- Inbox and anomaly-focused observability UI surfaces
- First-time guided tutorials per role with resume and replay support
- Tri-color design system and accessibility baseline derived from WIG
- Vercel-compatible build, route, and performance strategy

### 1.2 Out of Scope (for this document)

- Backend service implementation details (Prisma, Turso internals, cache internals)
- Foundry contract internals, on-chain role assignment mechanics, and contract gas-level behavior
- Legal certification claims for production election systems
- Advanced cryptographic anonymity systems (zk vote privacy, homomorphic tally, blind signatures)
- Native mobile app implementation (Android/iOS)

### 1.3 Core Decisions (Locked)

- Frontend app model: Vite hybrid model (static landing + SPA app shell)
- Router: TanStack Router for typed route guards and context-driven authorization
- Wallet stack: MetaMask, WalletConnect, Coinbase Wallet, Rainbow
- Session model: access token in memory + refresh token via secure cookie path
- Canonical post-login role homes: `/admin`, `/observer`, `/voter`
- Role source of truth: backend env bootstrap + backend DB authoritative mapping
- Wallet governance source: frontend route and shell safety uses `GET /api/v1/wallet/status`
- Realtime baseline: polling first (`15s` active tab, `60s` background tab)
- Polling freshness contract: backend enum `fresh | stale | degraded` is rendered as explicit UI states
- KYC flow: guided step wizard with exact-step resume after re-login
- Aadhaar-only fallback: mandatory reason code + mandatory additional evidence upload
- Upload contract policy: 10-minute authorization TTL and mandatory finalize-bind before KYC submit
- Observer visibility: masked queue snapshots only (no identity-linked clear-text)
- Observer masking schema: aggregate-only responses, no document object identifiers or per-user identity rows
- Finalization outcome parity: frontend uses exact backend outcomes (`CandidateWon`, `NotaTriggeredRerun`, `TieLotCandidateWon`, `TieLotNotaTriggeredRerun`)
- Rerun lifecycle parity: frontend includes `RerunRequired`, `Superseded`, lineage visibility, and rerun deadline UX
- Rerun escalation split: Admin raises escalation ticket, ECI executes rerun action path
- Tutorial engine: `react-joyride` controlled tours for all core personas
- Tutorial persistence: key by `wallet + role + appVersion`
- Login signature scope: MVP wallet login is EOA-only; ERC-1271 remains Foundry KYC attestation scope and is not used for frontend session login
- Ops endpoint boundary: `/ready` and `/startup` are internal protected endpoints and not part of frontend-consumed contracts
- Theme policy: tri-color system, no dark mode in MVP

---

## 2. Functional Goals

1. Deliver a trustworthy role-aware interface that mirrors backend and on-chain authorization constraints.
2. Provide deterministic navigation and guard behavior for all personas.
3. Enable complete KYC UX flow for Voter/Candidate with profile details and profile photo simulation.
4. Prevent accidental or ambiguous vote actions through explicit stateful UX.
5. Preserve user progress across controlled timeout events without violating security rules.
6. Provide clear and accessible election updates, inbox notifications, and anomaly workflows.
7. Ensure frontend behavior remains resilient under API delays, retries, and stale state conditions.
8. Enforce accessibility and interaction quality gates from `docs/WIG.md`.
9. Optimize startup, route load, and list performance for Vercel-hosted delivery.
10. Produce an implementation-ready frontend specification with measurable acceptance criteria.

---

## 3. Non-Goals

1. Implementing backend KYC adjudication logic in frontend.
2. Allowing role assignment from client-side only metadata.
3. Persisting secrets, private keys, or high-risk credentials in browser storage.
4. Building full offline-first vote casting in MVP.
5. Introducing dark mode variant in MVP.
6. Replacing backend or on-chain enforcement with frontend-only checks.

---

## 4. Frontend System Topology (MVP)

### 4.1 Hybrid App Delivery Model

The frontend uses a hybrid strategy to satisfy both landing-page clarity and protected-app complexity:

- Public entry: static landing surface (`/`) with informational and onboarding content.
- Authenticated app shell: SPA runtime for all protected role routes and election workflows.

This resolves two constraints together:

- Clear public entry and project positioning without booting the full private app shell.
- Typed route guards and nested state flows inside a single authenticated runtime.

### 4.2 Runtime Topology

```text
Browser Client
  |
  v
Vite Frontend (Hybrid Delivery)
  |- Public Landing Surface (/)
  |- Protected SPA App Shell
		|- Router Guards + Role Context
		|- Wallet Connect + Auth Session Layer
		|- KYC Wizard + Media Upload UX
		|- Election, Vote, Results UX
		|- Inbox + Observer Anomaly UX
		|- Guided Tours + Accessibility Helpers
  |
  +--> Backend API (/api/v1/*)
  +--> Wallet Providers (EIP-1193)
  +--> On-chain Read Layer (via backend or direct read utilities as allowed)
```

### 4.3 Runtime and Hosting Constraints

- Deployment target: Vercel frontend project for static and SPA resources.
- Authenticated app shell relies on same-origin or configured cross-origin API access.
- Deep-link safety for SPA routes must be handled with explicit rewrite policy in `vercel.json`.
- Frontend environment variables are non-authoritative and cannot define security permissions.
- Browser runtime must support modern ESM, wallet provider injection, and secure cookie behavior.

### 4.4 Primary Dependency Baseline

- `React` + `TypeScript` + `Vite`
- `@tanstack/react-router` for route tree and role guards
- `@tanstack/react-query` for server-state caching and polling control
- `wagmi` + `viem` + `@rainbow-me/rainbowkit` for wallet connectivity
- `tailwindcss` + `shadcn/ui` for UI primitives and tokenized design system
- `react-hook-form` + `zod` (or equivalent typed validation stack)
- `react-joyride` for guided role-specific tutorials
- Optional list virtualization utility for large queue and inbox surfaces

---

## 5. Route Architecture and Navigation Model

### 5.1 Canonical Route Spaces

| Route Space | Purpose | Access Policy |
|---|---|---|
| `/` | Public landing and pre-auth entry | Public |
| `/admin` + `/admin/*` | Owner management shell | Owner roles only |
| `/observer` + `/observer/*` | Observer monitoring shell | Observer role only |
| `/voter` + `/voter/*` | Voter/Candidate personalized shell | Voter/Candidate role only |
| `/elections` | Shared election discovery list | Authenticated |
| `/elections/:uelectionid` | Election detail and voting context | Authenticated + election-eligible checks |
| `/elections/:uelectionid/lineage` | Parent-child rerun lineage and SLA status view | Authenticated + role-aware visibility |
| `/results` | Result listing | Authenticated |
| `/results/:uelectionid` | Election-specific result view | Authenticated |
| `/unauthorized` | Explicit denial surface | Authenticated but disallowed |
| `/not-found` | Missing route fallback | Any |

### 5.2 Guard Strategy

TanStack Router `beforeLoad` guards are mandatory for protected route trees:

1. Validate authenticated session presence.
2. Resolve role from backend session payload (not frontend env claims).
3. Resolve wallet governance state from `GET /api/v1/wallet/status`.
4. Enforce route-role compatibility matrix.
5. Enforce governance lock-state transitions before route entry.
6. Redirect with deterministic destination and reason state.

Guard behavior must be non-flashy:

- No protected content should render before denial redirect decision.
- Guard resolves prior to component hydration of protected content.

### 5.3 Redirect Rules (Deterministic)

1. Unauthenticated user accessing protected route -> redirect to `/` with `redirect` target parameter.
2. Authenticated user without role permission -> redirect to role home route.
3. Governance-locked wallet state -> redirect to lock-state view and block sensitive actions.
4. Unknown role state or stale session role -> redirect to safe re-auth state and clear local role cache.
5. Post-login redirect restores intended target if role policy allows it.

### 5.4 Role Home Enforcement

Role homes are strict for MVP:

- Owner roles default to `/admin`.
- Observer defaults to `/observer`.
- Voter/Candidate defaults to `/voter`.

Cross-role route visits are denied with explicit reason messaging and audit-friendly client event logging.

### 5.5 Navigation and History Behavior

- Browser back/forward must preserve location and scroll restoration semantics.
- Deep links to valid protected routes remain stable after refresh.
- URL must reflect state for filters/tabs/pagination where applicable.
- Route transitions in critical flows should preserve unsaved warnings before hard navigation.

### 5.6 Error and Fallback Surfaces

- `404` route renders branded not-found page with role-aware recovery links.
- Guard errors render safe fallback and trigger silent session revalidation.
- API unavailability in route loaders renders resilient partial UI rather than white-screen failure.

---

## 6. Authentication, Wallet Connectivity, and Session Model

### 6.1 Wallet Connector Policy

MVP connector set is fixed:

- MetaMask (primary)
- WalletConnect
- Coinbase Wallet
- Rainbow

Connector UI must display:

- wallet brand
- connected address preview
- chain status
- mismatch warnings when connected wallet does not match allowed role-wallet policy

Connector compatibility notes:

- MVP login path accepts EOA signatures only.
- Smart-account and ERC-1271 wallets must show deterministic not-supported-for-login guidance and prompt switch to an EOA wallet.
- ERC-1271 mention in frontend is parity context for Foundry KYC attestation, not frontend auth-session creation.

### 6.2 Authentication Handshake UX

Frontend authentication sequence:

1. User connects wallet.
2. Frontend requests backend nonce challenge (`POST /api/v1/auth/challenge`).
3. Wallet signs canonical challenge message.
4. Frontend submits signature (`POST /api/v1/auth/verify`).
5. Backend returns access context + refresh cookie flow.
6. Frontend fetches wallet governance state (`GET /api/v1/wallet/status`).
7. Frontend resolves role, governance lock state, and route-home redirection.

Failure branches must include explicit UX messaging for:

- rejected wallet signature
- expired challenge
- replayed/invalid challenge
- unsupported chain context
- unsupported contract-wallet login path in MVP (prompt switch to EOA wallet)

### 6.3 Session Token Storage Policy

- Access token is held in memory only (runtime store).
- Refresh token is cookie-managed (secure, httpOnly, backend-controlled).
- Frontend never stores refresh token in localStorage/sessionStorage.
- On hard refresh, frontend performs session restore handshake using refresh flow.

### 6.4 Session Timeout and Continuity

- Inactivity timeout target: 30 minutes.
- Any protected API action updates last-activity marker.
- On timeout, user is moved to controlled re-auth flow.
- Draft state and resumable UI state are restored after successful re-auth where policy permits.
- Forbidden automatic behavior: silently submitting vote after session restoration.

### 6.5 Wallet Lock Governance Model

Role wallet locking policy in frontend must mirror backend governance:

1. Admin
	- hard lock only
	- no wallet switch path
	- mismatch forces logout and reconnect with registered wallet

2. ECI/SRO/RO
	- hard lock primary behavior
	- switch allowed only after admin-approved reassignment
	- resumed access only after backend role remap and on-chain role rebind complete

3. Observer
	- dynamic backend-managed role records
	- re-verification flow required on wallet reassignment
	- frontend reflects pending, approved, and rejected reassignment states

### 6.6 Wallet Mismatch UX States

Required wallet mismatch states:

- `WalletMismatchLocked`
- `WalletSwitchPendingApproval`
- `WalletSwitchApprovedAwaitingOnChainRebind`
- `WalletSwitchRejected`

Each state must show:

- clear reason
- permitted next action
- expected SLA hint (where available)
- support/retry path

---

## 7. Role Experience and Access Surface

### 7.1 Owner Experience (`/admin`)

Owner dashboards cover:

- KYC queue review operations
- election management operations
- candidate profile and nomination verification views
- anomaly triage and inbox monitoring
- governance and policy notices

Owner UI can include observer visibility modules, but write permissions stay role-gated.

### 7.2 Observer Experience (`/observer`)

Observer surfaces are read-heavy with controlled reporting rights:

- election process telemetry
- anomaly reporting and anomaly status tracking
- masked KYC queue snapshots (counts, state distribution, timestamp windows)
- observer inbox

Observer must not see raw identity details, unmasked document metadata, or owner-only controls.

### 7.3 Voter and Candidate Experience (`/voter`)

Voter/Candidate shell includes:

- personal KYC status and submission progress
- profile details and profile photo management
- election eligibility and participation states
- vote flow guidance, confirmation states, and result visibility
- role-scoped inbox notifications

Candidate-specific sections include nomination metadata and election participation status,
without exposing owner-side queue controls.

### 7.4 Permission-to-UI Mapping Principle

- UI visibility is deny-by-default.
- Every privileged interaction maps to an explicit backend permission check.
- Frontend hides unauthorized controls and still tolerates backend `403` safety responses.
- Route-level and component-level checks are both required.

### 7.5 Persona Parity and Shared Components

Shared primitives (tables, timeline cards, inbox list, status chips, modal shells) should remain
consistent while permission wrappers determine what actions appear for each role.

---

## 8. KYC UX, Profile Media, and Identity Evidence Model

### 8.1 KYC Wizard Structure

KYC in frontend must use a guided step wizard with deterministic progression and resumability.

Recommended step model:

1. Identity selection and constituency context
2. Aadhaar and EPIC input capture
3. Profile details capture
4. Profile photo and document evidence upload
5. Declaration and final review
6. Submission acknowledgement

The wizard must support:

- inline validation
- save-and-resume behavior
- explicit step status chips (`not-started`, `in-progress`, `completed`, `needs-action`)
- conflict-safe resume when server version differs from local draft

### 8.2 Identity Inputs and Validation Surface

Identity form UX requirements:

- strict canonicalization before submission
- format-level validation hints for Aadhaar/EPIC fields
- no persistent plaintext logging in client diagnostics
- masked display of sensitive values in review pages
- localized but English-first microcopy for MVP

Form controls must remain typing-friendly:

- no character-blocking anti-patterns while typing
- validate on blur and on submit
- focus first invalid field on submit failure

### 8.3 Aadhaar-Only Fallback UX

Aadhaar-only flow is allowed but gated by strict frontend policy:

1. User explicitly declares EPIC unavailable.
2. UI requires fallback reason code selection.
3. UI requires additional evidence upload before submit action is enabled.
4. Confirmation step highlights that review scrutiny is elevated.
5. Submission payload carries fallback flags expected by backend.
6. Frontend preserves hash-linked traceability references (for example `reasonCodeHash`) when returned by backend for audit-consistent display.

Frontend must never auto-bypass these steps through hidden defaults.

### 8.4 Voter/Candidate Profile Details Management

Profile details are first-class KYC artifacts in frontend MVP.

Voter/Candidate profile details flow includes:

- personal display name
- constituency metadata (non-authoritative display)
- contact and communication preferences (where allowed)
- nomination descriptors for candidate persona path
- profile status badges (`draft`, `submitted`, `under-review`, `approved`, `rejected`)

Profile forms must support:

- draft autosave checkpoints
- explicit `Save Draft` and `Submit for Review` actions
- immutable snapshot preview at submit stage

### 8.5 Profile Picture and Document Upload Workflow

Profile photo and KYC evidence flow is mandatory in MVP.

Frontend upload requirements:

1. Request short-lived upload contract from backend.
2. Validate MIME, extension, and file size preflight on client.
3. Upload via backend-authorized object path flow.
4. Bind uploaded object references to KYC submission draft.
5. Render secure preview cards with version and upload timestamp.

Supported media actions:

- add profile photo
- replace profile photo
- remove profile photo (pre-submit and policy-allowed post-submit states)
- upload document images
- re-upload rejected evidence

File-state UX badges:

- `uploading`
- `uploaded`
- `scan-pending` (if backend async checks exist)
- `rejected`
- `requires-reupload`

### 8.6 Owner Review and Queue Visibility Surfaces

Owner queue views should include:

- candidate and voter submission cards
- profile photo thumbnail and metadata integrity indicators
- reason-code visibility for Aadhaar-only fallback cases
- hash-linked traceability reference visibility where backend exposes `reasonCodeHash`
- action controls for approve/reject/resubmit

Observer queue views remain masked:

- counts and status distributions only
- no raw profile image visibility
- no unmasked identity details

### 8.7 KYC Resume and Concurrency Rules

Resumable KYC policy:

- if session expires, frontend restores user to exact wizard step after re-auth
- draft resume is versioned to prevent silent overwrite of newer server drafts
- merge conflicts show explicit side-by-side choice (server vs local draft)

Submission locking rules:

- while submission is in-flight, wizard actions lock with spinner and progress message
- duplicate submit clicks are blocked
- failed submissions expose retry with preserved draft

### 8.8 Privacy and Safety UX Rules

- never render full Aadhaar/EPIC in list views
- sensitive fields in UI logs and error traces must be redacted
- screenshots for lab documentation should avoid exposing unmasked real-like identifiers
- profile media previews must use scoped URLs and avoid long-lived public links

---

## 9. Election Discovery, Voting, and Result UX Model

### 9.1 Election Discovery

Election list requirements:

- search and filter by constituency, state, and status
- clear status chips for `registration-open`, `voting-open`, `paused`, `closed`, `finalized`, `rerun-required`, `superseded`
- deterministic pagination and URL-synced filters
- skeleton loading states to avoid layout shift

### 9.2 Election Detail Surface

Election detail page must include:

- lifecycle timeline
- candidate listing with active/inactive indicators
- candidate-cap aware rendering (contesting cap 15) where backend metadata is available
- explicit NOTA pseudo-candidate treatment as a dedicated option outside contesting-cap counting
- voter eligibility status block
- vote window countdown and timezone context
- contextual warnings near opening/closing boundaries
- finalization outcome card using backend parity enums
- rerun lineage snapshot (parent/child pointers where present)
- rerun deadline and due-soon indicator contract

### 9.3 Vote Intent Token Flow

Before cast action:

1. Frontend requests one-time vote token (`POST /api/v1/votes/token`).
2. Frontend binds token to current wallet + election context.
3. Frontend displays short-lived token validity indicator.

If token request fails, cast controls remain disabled with actionable retry messaging.

### 9.4 Vote Cast UX States

Vote cast state machine in frontend:

`idle -> validating -> signing-or-confirming -> relaying -> confirmed | failed | expired`

Required interaction guarantees:

- single-action confirm interaction
- disabled duplicate cast clicks during in-flight state
- deterministic final state card with transaction/result reference

### 9.5 Idempotency and Replay-safe Feedback

Frontend must support backend hybrid idempotency semantics:

- repeated click with same active intent should reuse pending state rather than creating new intents
- conflict responses must render a dedicated conflict state card
- terminal success can be re-opened from activity history instead of re-casting

### 9.6 Time Boundary and Lifecycle Edge UX

Late boundary handling:

- if vote window closes during user interaction, cast call failure must map to clear closure message
- UI should refresh lifecycle state immediately after closure response
- voting controls collapse into read-only result-pending panel when election no longer accepts votes

Pause handling:

- if election enters pause state, cast action disabled instantly on next poll cycle
- paused reason messaging shown if available in backend payload

### 9.7 Result Visibility Model

Result pages must:

- identify source freshness using exact backend enum (`fresh | stale | degraded`)
- display declared winner and vote counts when finalized
- show provisional messaging when finalization has not completed
- preserve route-level shareability for authenticated users

### 9.8 Rerun and Lineage UX Contract

Frontend must support rerun lifecycle parity with backend and Foundry contracts:

- handle `RerunRequired` result state with explicit rerun messaging
- handle `Superseded` parent state with strict action lock
- expose dedicated lineage route: `/elections/:uelectionid/lineage`
- show parent-child relationship and rerun status timeline

Superseded election behavior:

- voting and sensitive actions are hard-locked
- primary call-to-action links to child rerun election context
- parent election remains browseable as read-only historical context

### 9.9 Finalization Outcome and Escalation UX

Frontend must use exact outcome values from backend contract:

- `CandidateWon`
- `NotaTriggeredRerun`
- `TieLotCandidateWon`
- `TieLotNotaTriggeredRerun`

Rerun cap and fallback policy rendering:

- frontend messaging must reflect one-rerun-only policy from Foundry
- if rerun election also resolves with NOTA top outcome, UI must display highest non-NOTA candidate finalization outcome

Rerun SLA UX policy:

- display rerun deadline countdown
- due-soon threshold is 48 hours before deadline
- show SLA states (`on-track`, `due-soon`, `breached`) where provided by backend

Escalation flow split:

- Admin may create escalation ticket with required fields (reason category, note, evidence hash/reference)
- ECI executes rerun action path after escalation ticket stage

---

## 10. Inbox, Alerts, and Observability UX

### 10.1 Notification Priority Model (Locked)

MVP priority levels:

- Critical
- High
- Normal

Priority drives visual emphasis, ordering, and optional action affordances.

### 10.2 Inbox Categories

Minimum category set:

- KYC lifecycle updates
- election lifecycle updates
- anomaly lifecycle updates
- vote relay completion/failure updates
- security/session events

Each item must include:

- timestamp
- source role or system actor
- actionable link (where available)
- read/unread status

### 10.3 Polling and Freshness Strategy

Locked polling policy:

- Active tab: 15-second interval
- Background tab: 60-second interval

Polling controls must support:

- visibility-aware throttling
- manual refresh action
- exact freshness-state mapping from backend `fresh | stale | degraded`

Freshness behavior contract:

- `fresh`: normal interactions enabled
- `stale`: interactions remain enabled with refresh advisory
- `degraded`: degraded banner shown and sensitive actions (vote cast, escalation execute paths) are disabled until recovery

### 10.4 Observer Anomaly Flow

Observer can:

- submit anomaly report
- attach structured context fields
- track anomaly status transitions

Observer cannot:

- execute owner remediation actions
- view unmasked KYC identifiers

Observer aggregate-only schema expectations:

- expose counts by status, trend windows, and SLA indicators only
- do not expose per-user identity rows
- do not expose document/media object identifiers or raw profile metadata

### 10.5 Error, Empty, and Retry States

Inbox and observability modules must always include:

- empty-state guidance
- degraded-mode messaging when API unavailable
- retry affordances with backoff-friendly hints
- no dead-end screens

---

## 11. Guided Tutorial and First-time Onboarding System

### 11.1 Engine and Control Model

`react-joyride` is the locked tutorial engine for MVP.

Tutorial controls:

- Next
- Back
- Skip
- Close

Control behavior is fully controlled from app state to support role-aware branching and resume.

### 11.2 Persona-specific Tutorial Tracks

Separate tutorial tracks are required for:

- Owner roles
- Observer role
- Voter/Candidate role

Each track highlights:

- primary navigation points
- role-critical actions
- warning-sensitive operations
- support/help entry points
- wallet governance lock-state recovery guidance
- rerun and escalation lifecycle guidance (role-specific)

### 11.3 Persistence and Resume Policy

Tutorial progress key:

`tutorial:{wallet}:{role}:{appVersion}`

Rules:

- first visit for key -> auto-start tutorial
- incomplete tutorial -> resume from last step on next eligible login
- completed tutorial -> no auto-start until version policy dictates

### 11.4 Replay Policy

Users can manually replay tutorial from profile/help area at any time.

Recommended replay triggers:

- manual user action
- major app version change (optional policy toggle)

### 11.5 Accessibility Rules for Tutorial Layer

- keyboard navigable controls mandatory
- focus management must remain deterministic during step changes
- tooltip text must be screen-reader friendly
- reduced-motion preference must be honored for tutorial transitions

### 11.6 Tutorial Failure Handling

- target-missing steps should skip gracefully and continue
- route-transition steps should wait for target readiness
- failure telemetry should be captured without leaking sensitive selectors/data
- rerun/escalation tutorial steps should be conditional and only render when corresponding backend states are present

---

## 12. Design System and Visual Language

### 12.1 Color Token Policy

Base tri-color tokens (locked):

- Saffron: `#E87F24`
- White: `#FBF6F6`
- Green: `#48A111`

Semantic extensions are mandatory for:

- text hierarchy
- success/warning/error/information states
- borders and focus rings
- panel and surface layering

### 12.2 No Dark Mode Policy (MVP)

- Dark mode is out of scope for MVP.
- Design tokens should still keep semantic naming to avoid future migration debt.
- Contrast targets must remain valid in the single approved theme.

### 12.3 Core UI Composition

UI shell expectations:

- top navigation bar
- role-aware sidebar
- content region between navbar and footer
- modal/popover/sheet/alert primitives for high-context actions

### 12.4 Motion and Transition Rules

- motion used only where it clarifies interaction flow
- animate transform and opacity only
- no layout-jank transitions on width/height/top/left
- reduced-motion variant required for all non-essential animations

### 12.5 Scrolling and Large Data Handling

- custom scroll areas for global and local containers
- virtualization for list views likely to exceed practical item thresholds
- modal and drawer scroll containment to avoid background scroll bleed

### 12.6 Responsive Layout Baseline

Required target breakpoints:

- mobile
- tablet
- laptop
- wide desktop

Layouts must preserve action discoverability and avoid dead zones on small screens.

---

## 13. Accessibility and WIG Compliance Baseline

Frontend implementation must satisfy mandatory rules from `docs/WIG.md`.

### 13.1 Keyboard and Focus

- all interactive controls must be reachable via keyboard
- visible focus rings are mandatory
- modal/dialog focus trapping and return behavior must be deterministic
- no hidden focus loss during async transitions

### 13.2 Form Behavior

- submit from Enter where appropriate
- inline validation near field
- focus first error on failed submit
- support paste for codes/identifiers
- preserve form values across controlled rerenders

### 13.3 Semantics and ARIA

- icon-only buttons require descriptive labels
- `aria-live` used for toasts and validation updates
- heading hierarchy and skip links included in app shell
- status communication must not rely on color only

### 13.4 Touch and Target Quality

- minimum hit targets for mobile and desktop requirements
- avoid interaction dead zones around checkboxes/radios
- explicit affordances for clickable cards and controls

### 13.5 Content Resilience

- support short, medium, and very long text values
- handle empty/error/sparse states without broken layouts
- tabular number rendering where numeric comparison is important

---

## 14. Frontend State Architecture

### 14.1 State Layer Separation

State domains should be separated by responsibility:

1. Session and auth state
2. Role and permission context
3. Server-state cache (query/mutation)
4. Form and wizard local state
5. UI preference state (tour progress, panel layout preferences)

### 14.2 Server-state Cache Policy

Recommended query strategy:

- key-by-route and role context
- explicit stale times for election/inbox data
- polling orchestration through query layer
- mutation invalidation rules per entity family

Polling implementation guidance:

- use query-driven dynamic intervals aligned to visibility state (`15s` active, `60s` background)
- map backend `freshnessState` directly into query-driven UI transitions
- keep retry behavior bounded for degraded states to avoid request storms

### 14.3 KYC Wizard State Model

Wizard state includes:

- current step index
- per-step validation status
- draft payload version id
- media upload references
- submission lock state

State must be serializable for resume flow and conflict reconciliation.

### 14.4 Vote Interaction State Model

Vote state store should capture:

- selected election and candidate context
- token request lifecycle
- relay submission lifecycle
- terminal status references

This state must be cleared safely after terminal completion and audit card persistence.

### 14.5 Persistence Boundaries

- Sensitive values should not be persisted beyond minimum required UX need.
- Access token remains in memory only.
- Tutorial and non-sensitive preference states may persist with versioned keys.
- Draft persistence must remain backend-synchronized and version-aware.

### 14.6 Recovery and Rehydration Rules

- app startup performs session rehydration handshake
- route guard waits for auth hydration before rendering protected surfaces
- stale local state without valid session must be discarded deterministically

---

## 15. API Integration Contract Baseline

### 15.1 Namespace and Environment Contract

Frontend API integration assumptions:

- backend namespace: `/api/v1`
- API base URL sourced from frontend environment variable
- environment variables in frontend are operational only, never authorization truth

Suggested env keys (frontend side):

- `VITE_API_BASE_URL`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_APP_VERSION`
- `VITE_CHAIN_ID_DEFAULT`

### 15.2 Endpoint Families Consumed by Frontend

Auth:

- `POST /api/v1/auth/challenge`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

KYC:

- `POST /api/v1/kyc/submissions`
- `GET /api/v1/kyc/me`
- `GET /api/v1/owner/kyc/queue`
- `POST /api/v1/owner/kyc/{submissionId}/decision`

Elections, results, and votes:

- `GET /api/v1/elections`
- `GET /api/v1/elections/{electionId}`
- `GET /api/v1/results`
- `GET /api/v1/results/{electionId}`
- `POST /api/v1/votes/token`
- `POST /api/v1/votes/cast`

Observer and inbox:

- `POST /api/v1/observer/anomalies`
- `GET /api/v1/observer/anomalies`
- `GET /api/v1/inbox`
- `POST /api/v1/inbox/{notificationId}/read`

Wallet governance:

- `GET /api/v1/wallet/status`

Upload contract lifecycle:

- `POST /api/v1/uploads/authorize`
- `POST /api/v1/uploads/finalize`

Rerun orchestration and lineage:

- `GET /api/v1/elections/{electionId}/rerun/status`
- `POST /api/v1/owner/elections/{electionId}/rerun/escalation-ticket`
- `POST /api/v1/eci/elections/{electionId}/rerun/execute`
- `GET /api/v1/elections/{electionId}/lineage`

Ops and health (optional frontend diagnostics surface):

- `GET /health`

Internal protected endpoints not consumed by frontend:

- `/ready`
- `/startup`

### 15.3 Upload Contract for KYC Media

Frontend media upload sequence must align with backend R2 policy:

1. Request upload authorization and object metadata contract from backend (`POST /uploads/authorize`).
2. Validate file preconditions on client.
3. Upload object via authorized path.
4. Confirm object reference binding with KYC draft/submission (`POST /uploads/finalize`).
5. Allow KYC submit only when required artifacts are finalize-bound.

Upload lifecycle contract requirements:

- authorization TTL is 10 minutes
- expired authorization invalidates pending upload state
- stale authorization requires forced re-authorize flow
- selected files tied to expired authorization must be re-bound before submit

Failure handling requirements:

- stale upload contract -> re-request path
- invalid file type/size -> local validation block
- partial upload failure -> preserve draft and offer retry
- delete rollback failure -> show explicit remediation action
- authorization TTL expiry -> force re-authorize and block submit until finalize-bind is restored

### 15.4 Response Envelope Expectations

Frontend expects normalized responses carrying:

- correlation/request id
- machine-readable error code
- user-safe message
- optional retryability hint
- required freshness metadata for always-on polling routes:
	- `lastSyncedAt`
	- `nextPollAfterSec`
	- `freshnessState` (`fresh | stale | degraded`)
- freshness metadata is mandatory on:
	- `GET /api/v1/elections`
	- `GET /api/v1/elections/{electionId}`
	- `GET /api/v1/results`
	- `GET /api/v1/results/{electionId}`
	- `GET /api/v1/inbox`

All network failures and non-2xx responses map to deterministic UI state machines.

### 15.5 Error Mapping Rules

- `400` -> field or payload validation errors
- `401` -> auth required/re-auth trigger
- `403` -> permission denial surface
- `404` -> not found fallback path
- `409` -> conflict state (idempotency or stale state)
- `422` -> domain-specific validation guidance
- `429` -> rate-limit guidance and retry window hint
- `5xx` -> degraded mode messaging and retry pattern

---

## 16. Security and Privacy Controls (Frontend Side)

### 16.1 Mandatory Controls

1. Deny-by-default UI for privileged operations.
2. No storage of private keys or raw secrets.
3. Access token in memory only.
4. Masking of high-sensitivity identifiers in all non-detail views.
5. Strict file validation before upload attempts.
6. Sanitized error rendering to avoid leaking backend internals.

### 16.2 Session and CSRF Considerations

- Frontend should assume cookie security attributes are backend-controlled.
- Mutating requests must carry expected CSRF contract signals where backend requires them.
- Session refresh loops must include retry bounds to avoid infinite loops.

### 16.3 Sensitive Data Rendering Policy

- no full Aadhaar/EPIC in table/list rows
- masked identity values in shared contexts
- profile photos shown only in authorized contexts
- observer contexts use masked/aggregated views only

### 16.4 Client-side Abuse Hardening

- throttle repeated action triggers in UI for sensitive workflows
- disable duplicate submit behavior for KYC and vote operations
- surface anti-replay hints when backend rejects reused actions

### 16.5 Audit-friendly UX Signals

Frontend should emit structured client events for:

- route denial events
- wallet mismatch lock events
- tutorial completion/skip events
- repeated submission suppression events
- rerun escalation ticket submissions
- rerun execute attempts and governance-block outcomes

Event payloads must avoid raw PII.

### 16.6 Internal Endpoint Boundary

- Frontend must not rely on `/ready` or `/startup` for normal user-facing diagnostics.
- Any internal diagnostics view should consume frontend-safe backend business routes instead of protected ops probes.

---

## 17. Performance, Build, and Deployment Strategy

### 17.1 Build and Code-splitting Baseline

- route-level lazy loading for protected feature modules
- split large UI dependencies and wallet modules where practical
- avoid monolithic first-load bundles for role shells

### 17.2 Rendering and List Performance

- virtualize long lists (queue/inbox/election tables)
- memoize heavy row renderers where profiling identifies bottlenecks
- keep polling updates incremental to reduce layout churn

### 17.3 Network Efficiency

- cache election and inbox queries with sensible stale windows
- use conditional refetch where backend contract supports it
- respect visibility state for polling frequency changes
- drive polling UI by backend freshness enum (`fresh | stale | degraded`)
- pause or gate sensitive actions under degraded freshness state until recovery

### 17.4 Vercel Routing and Deploy Semantics

- configure rewrite rules for SPA shell deep-link routes
- keep public landing and protected app assets in predictable build output
- ensure preview and production origins match backend CORS allowlist policy

### 17.5 Operational UX Resilience

- degraded-mode banners for dependency failures
- optimistic updates only where rollback path is clear
- deterministic spinners and progress labels for long-running actions

---

## 18. Testing, Verification, and Acceptance

### 18.1 Test Layers

1. Unit tests
	- guards, auth helpers, state reducers/stores, formatters, validators
2. Integration tests
	- API client flows, query invalidation behavior, KYC wizard resume behavior
3. End-to-end tests
	- wallet connect/auth path
	- wallet governance pre-route check (`GET /api/v1/wallet/status`)
	- KYC submission path with media upload
	- upload authorize/finalize lifecycle including TTL expiry
	- role-route enforcement
	- vote token and cast flow
	- rerun lineage route and superseded lock behavior

### 18.2 Accessibility and UX Test Scope

- keyboard-only navigation flows
- focus management in modals and tutorials
- screen-reader labels for icon-only actions
- reduced-motion behavior validation

### 18.3 Security-focused Test Scope

- unauthorized route access handling
- wallet mismatch lock flows
- duplicate action suppression for vote and submit buttons
- masked-data rendering checks for observer contexts
- protected endpoint boundary checks (`/ready` and `/startup` not consumed by frontend)

### 18.4 Operational Test Scope

- polling interval switch based on tab visibility
- stale-session restore and timeout re-auth flow
- media upload error recovery (retry, expired contract, invalid file)
- freshness enum transition handling (`fresh -> stale -> degraded` and recovery)
- rerun deadline due-soon threshold behavior (48-hour threshold)
- escalation split flow validation (Admin ticket creation, ECI execution path)

### 18.5 Acceptance Criteria (Definition of Done)

1. Hybrid frontend architecture is implemented and deployable on Vercel.
2. Route-level role guard matrix is deterministic and tested.
3. Wallet-auth flow with backend challenge/verify path is complete.
4. Session storage policy (memory access token + refresh cookie) is enforced.
5. KYC wizard supports exact-step resume after timeout re-auth.
6. Aadhaar-only fallback enforces mandatory reason + additional evidence upload.
7. Upload lifecycle enforces 10-minute authorization TTL and mandatory finalize-bind before submit.
8. Voter/Candidate profile details and profile-photo management UX is fully specified.
9. Observer view remains strict aggregate-only for identity-sensitive KYC data.
10. Voting UX handles idempotency conflicts, rerun states, and lifecycle boundary errors clearly.
11. Finalization outcome handling uses exact backend parity enums.
12. Rerun UX includes lineage route, superseded lock behavior, and child rerun CTA.
13. Wallet governance state is checked before protected route entry.
14. Inbox priorities and polling policy are implemented as locked decisions.
15. Freshness enum (`fresh | stale | degraded`) is mapped to deterministic UI action states.
16. Guided tutorials exist for Owner, Observer, and Voter/Candidate personas including lock/rerun guidance.
17. Tutorial persistence keying by wallet+role+appVersion is enforced.
18. WIG accessibility and interaction rules are represented in implementation constraints.
19. Frontend file/media error states have deterministic recovery UX.
20. Frontend does not consume protected internal endpoints `/ready` and `/startup`.

---

## 19. File Map (Target Frontend End State)

Expected structure after implementation:

- `frontend/package.json`
- `frontend/.env.example`
- `frontend/vercel.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/app/providers.tsx`
- `frontend/src/config/env.ts`
- `frontend/src/features/auth/*`
- `frontend/src/features/wallet/*`
- `frontend/src/features/kyc/*`
- `frontend/src/features/elections/*`
- `frontend/src/features/elections/lineage/*`
- `frontend/src/features/rerun/*`
- `frontend/src/features/voting/*`
- `frontend/src/features/results/*`
- `frontend/src/features/inbox/*`
- `frontend/src/features/observer/*`
- `frontend/src/features/wallet-governance/*`
- `frontend/src/features/tutorials/*`
- `frontend/src/components/ui/*`
- `frontend/src/components/layout/*`
- `frontend/src/state/*`
- `frontend/src/lib/api-client.ts`
- `frontend/src/lib/upload.ts`
- `frontend/src/lib/guards.ts`
- `frontend/src/styles/globals.css`

---

## 20. Risks, Tradeoffs, and Deferred Items

### 20.1 Chosen Tradeoffs

1. Hybrid model improves route clarity and role-shell maintainability, with moderate routing complexity.
2. Polling-first strategy reduces operational complexity versus websocket-first design, with slightly slower live feel.
3. Strict masking improves privacy posture, with reduced observer detail depth.

### 20.2 Known Risks

1. Wallet provider inconsistencies across devices can create UX variance.
2. Incorrect rewrite/CORS coordination can break deep-link or auth flows.
3. Large media uploads can increase KYC completion time under poor network conditions.
4. Tutorial target drift can occur if layout changes outpace tour updates.
5. Cross-layer enum drift (rerun and finalization outcomes) can break state rendering if contracts change without synchronized updates.

### 20.3 Deferred to Post-MVP

1. Real-time websocket/SSE push channels as primary transport.
2. Full multi-language UX rollout (beyond English-first MVP).
3. Advanced visual analytics panels for election observability.
4. Adaptive fraud-scoring UX overlays for anomaly prioritization.

---

## 21. Implementation Sequence (Execution Order)

1. Scaffold frontend workspace and baseline build pipeline.
2. Implement app providers, router tree, and route guard framework.
3. Integrate wallet connectors and auth challenge flow with connector compatibility fallback UX.
4. Implement wallet governance pre-route check (`GET /api/v1/wallet/status`) and lock-state screens.
5. Implement session hydration, timeout, and re-auth guard behavior.
6. Build role homes and permission-gated navigation shell.
7. Implement KYC wizard with draft persistence and exact-step resume.
8. Implement upload authorize/finalize lifecycle with 10-minute TTL handling.
9. Implement profile details and profile-photo/document media workflows.
10. Implement owner queue and strict aggregate-only observer surfaces.
11. Implement election discovery/detail, finalization outcome parity rendering, and vote intent/cast UX states.
12. Implement rerun lineage route, superseded lock flow, rerun SLA deadline UX, and escalation split actions.
13. Implement inbox priorities, anomaly reporting, polling controls, and freshness enum UI mapping.
14. Implement guided tutorials with role tracks, governance-lock states, and rerun/escalation guidance.
15. Implement accessibility pass and WIG compliance hardening.
16. Implement performance optimizations (splitting, virtualization, polling tuning).
17. Complete unit/integration/e2e validation and acceptance checks.
18. Finalize deployment config and run pre-release verification.

This sequence is mandatory to minimize rework and maintain consistent behavior across
frontend, backend, and on-chain interaction boundaries.



