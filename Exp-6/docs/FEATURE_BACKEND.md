# DVote (MVP + Backend) - Technical Feature Description

Authoring scope: Exp-6 Backend only  
Status: Draft baseline for implementation  
Last updated: 2026-04-08

---

## 1. Purpose and Scope

This document defines the complete technical feature description for the DVote mini-project
backend layer in Exp-6. It is the implementation contract for backend architecture,
authentication, authorization, KYC and privacy controls, vote relay orchestration,
observability, deployment, and security hardening.

This specification is aligned to:

- ITL801 LO6 expectations for a full-fledged DApp mini project
- Exp-6 DVote idea constraints and backend scope decisions
- Foundry boundaries defined in `Exp-6/docs/FEATURE_FOUNDRY.md`
- Frontend integration contract in `Exp-6/docs/FEATURE_FRONTEND.md`
- Repository standards in `README.md`, `CONTRIBUTING.md`, and `docs/WIG.md`

### 1.1 In Scope (Backend MVP)

- Express API application in `Exp-6/backend`
- Wallet-authenticated role-aware backend flows
- Turso (SQLite) persistence through Prisma ORM
- Redis or Upstash session and cache layer with Turso fallback
- Cloudflare R2 S3-compatible object storage integration
- KYC submission, review queue, approval, and on-chain attestation orchestration
- Election operations orchestration and vote relay to Foundry contracts
- Inbox notifications and observability workflows for Owner, Observer, and Voter personas
- Health, readiness, startup checks and operational safety controls

### 1.2 Out of Scope (for this document)

- Frontend design system, routes, and UI logic
- Solidity contract internals, Foundry tests, and on-chain storage definitions
- Advanced cryptographic voting privacy systems (zk proofs, blind signatures, homomorphic tally)
- Legal certification or statutory compliance claims for real election operations

### 1.3 Core Decisions (Locked)

- Auth model: signed nonce challenge plus JWT access and refresh tokens
- Session model: Redis or Upstash primary with Turso fallback and 30-minute inactivity timeout
- Vote idempotency: hybrid strategy with server-issued one-time vote token plus
  `wallet + electionId + clientNonce` dedupe key
- Foundry parity: backend mirrors rerun and finalization outcome contracts without overriding chain finality
- KYC storage: encrypted sensitive plaintext plus irreversible hashes
- Encryption model: app-level AES-GCM envelope encryption
- Key rotation cadence: every 30 days with batch re-encryption within 24 hours
- KYC queue ordering: FCFS FIFO per constituency and election
- Aadhaar-only fallback: allowed with stricter manual review and mandatory reason code
- KYC attestation parity fields: `isAadhaarOnly` and `reasonCodeHash` tracked and surfaced in backend contract
- Candidate verification: includes nomination metadata mirror (Form-2B subset)
- Role source of truth: env bootstraps DB role-wallet mapping on startup
- Wallet governance: dedicated backend wallet-status contract endpoint for deterministic lock-state UX
- Auth login signature scope: MVP session login accepts EOA signatures only; ERC-1271 is reserved for Foundry KYC attestation scope
- Upload contract lifecycle: pre-signed authorization TTL is 10 minutes and finalize-bind handshake is mandatory before submission
- Notification MVP: in-app inbox only
- Observer masking contract: aggregate-only queue snapshots with no identity-linked document metadata
- Polling freshness contract enum: `fresh | stale | degraded`
- Rerun SLA parity: backend enforces 7-day rerun orchestration timer with escalation workflow
- Rerun due-soon threshold: 48 hours before rerun deadline
- Rerun escalation authority: Admin can raise escalation ticket; ECI executes final on-chain rerun action
- Rerun escalation payload contract: reason category + free-text note + evidence hash/reference are mandatory
- Health endpoints: `/health`, `/ready`, `/startup`
- Health endpoint exposure: `/ready` and `/startup` are protected by internal API key and optional IP allowlist
- CORS: strict env allowlist for local, preview, and production origins
- Security baseline: Helmet, validation, rate limits, JWT rotation, revocation, CSRF for cookie flows,
  WAF or Turnstile on sensitive routes, tamper-evident audit chain
- Business-flow abuse controls: anomaly endpoint rate limit is 10 per 15 minutes per wallet,
	auth challenge lock is 5 failures then 15-minute lock per wallet and IP pair
- Audit mutability policy: limited operational edits before election opens; append-only sensitive records after open
- KYC retention: purge sensitive artifacts 180 days after election finalization

### 1.4 Cross-Layer Parity and Authority Rules

1. Foundry contract outcomes and lifecycle states are canonical for election and result truth.
2. Backend orchestrates off-chain workflow, queueing, and relay safety, but does not redefine chain finality.
3. Frontend-facing enums and status contracts in backend must preserve Foundry-safe semantics.
4. If backend and chain read model diverge, backend reconciliation must converge to on-chain truth.
5. Backend may expose richer operational status, but any winner/rerun outcome must remain chain-derived.

---

## 2. Functional Goals

1. Ensure one eligible identity maps to only one vote per election in backend pre-check and relay pipeline.
2. Ensure one wallet cannot submit duplicate final vote intents for the same election.
3. Enforce strict role-aware API access across Admin, ECI, SRO, RO, Observer, and Voter personas.
4. Provide deterministic KYC queue behavior with FCFS ordering within constituency and election scope.
5. Protect sensitive identity data at rest and in transit with layered controls.
6. Provide reliable vote relay semantics with deterministic dedupe and replay prevention.
7. Maintain session continuity and resumable workflow state after controlled timeout.
8. Provide auditable operational history with tamper-evident logging.
9. Expose operational health, readiness, and startup endpoints for stable deployment behavior.
10. Support secure and configurable local-to-production deployment with explicit env contracts.
11. Provide deterministic rerun orchestration semantics that match Foundry policy and SLA rules.
12. Provide explicit freshness and masking contracts for frontend-safe polling and observer visibility.

---

## 3. Non-Goals

1. Replacing Foundry contract-level vote integrity controls.
2. Serving as a legal voting system for government or real-world election use.
3. Full legal adjudication workflow for candidature disputes.
4. Anonymous cryptographic voting guarantees in MVP.
5. Real-time push channels beyond inbox persistence in MVP.
6. Cross-chain orchestration or L2 migration in MVP.

---

## 4. Backend System Topology (MVP)

The backend is designed as an API and orchestration layer between wallet users,
off-chain persistence systems, and the Foundry smart contract domain.

### 4.1 High-Level Topology

```text
Wallet Clients (Owner, Observer, Voter)
			 |
			 v
Vercel Node.js Serverless (Express App)
  |- Auth and RBAC Middleware
  |- KYC and Queue Services
  |- Election and Vote Relay Services
  |- Inbox and Anomaly Services
  |- Health and Ops Endpoints
			 |
			 +--> Redis/Upstash (sessions, fast cache, token revocation)
			 +--> Turso via Prisma (durable system of record)
			 +--> Cloudflare R2 (KYC docs and media objects)
			 +--> Foundry Contracts on Sepolia (vote and lifecycle final writes)
```

### 4.2 Runtime and Deployment Model

- Runtime target is Vercel Node.js serverless functions.
- API versioning uses `/api/v1/*` namespace.
- Runtime initialization must be lightweight to minimize cold-start overhead.
- Sensitive clients and secrets are initialized lazily and reused when possible.

### 4.3 External Dependencies

- Turso for SQLite-compatible globally available persistence
- Prisma with libSQL driver adapter
- Redis or Upstash for low-latency state and revocation structures
- Cloudflare R2 as S3-compatible object storage
- On-chain provider stack for Foundry-integrated orchestration and verification

---

## 5. Authentication and Authorization Model

### 5.1 Wallet Authentication Flow (Signed Nonce)

1. Client requests challenge via `POST /api/v1/auth/challenge` with wallet address and chain metadata.
2. Backend creates one-time nonce and stores a hashed challenge with short TTL.
3. Client signs canonical challenge message using wallet.
4. Client submits signature via `POST /api/v1/auth/verify`.
5. Backend verifies:
	- challenge exists and is unexpired
	- signature is valid for claimed wallet
	- recovered signer path is EOA-only for MVP session login
	- ERC-1271 contract-wallet login signatures are rejected in MVP with deterministic unsupported-login-path response
	- chain constraints and domain context are valid
6. Backend resolves role context from DB (bootstrapped from env at startup).
7. Backend issues access and refresh tokens and records session metadata.
8. Used challenge is invalidated immediately.

Scope lock:

- MVP login endpoints (`/api/v1/auth/challenge`, `/api/v1/auth/verify`) are EOA-only.
- ERC-1271 remains outside backend login flow and is handled only in Foundry KYC attestation verification path.

### 5.2 JWT, Rotation, and Revocation

- Access token: short TTL, stateless authorization claims.
- Refresh token: rotating token family with revocation tracking.
- On refresh:
  - new refresh token issued
  - previous refresh token marked as consumed
  - replayed consumed refresh token triggers family revocation
- Revocation primary store: Redis or Upstash.
- Revocation fallback persistence: Turso table for recovery scenarios.

### 5.3 Role Bootstrap and Governance

At startup, backend reads role-wallet mappings from env and upserts DB records.

Expected role groups:

- Admin
- ECI
- SRO
- RO
- Observer
- Voter (derived for non-owner verified participants)

Rules:

- No API route allows self-role escalation.
- Privileged routes require explicit role checks.
- Unauthorized route access attempts are logged in audit trail.

### 5.4 Authorization Matrix (Summary)

- Owner routes (`Admin`, `ECI`, `SRO`, `RO`): KYC review, election control orchestration,
  candidate management, inbox operations, anomaly triage.
- Observer routes: read-heavy access, anomaly reporting, observer inbox.
- Voter routes: KYC submission, election visibility, vote intent, vote relay, personal inbox.

---

## 6. KYC Privacy and Data Protection

### 6.1 Sensitive Data Classes

1. High sensitivity:
	- Aadhaar identifiers
	- EPIC identifiers
	- government document image files
2. Medium sensitivity:
	- wallet-linked KYC status
	- queue metadata
3. Low sensitivity:
	- public election metadata and non-sensitive candidate descriptors

### 6.2 Encryption at Rest (AES-GCM Envelope)

Sensitive identity fields are stored using envelope encryption:

1. Generate per-record Data Encryption Key (DEK).
2. Encrypt plaintext with AES-GCM using DEK.
3. Encrypt DEK with key-encryption secret version from env.
4. Persist ciphertext bundle:
	- encrypted payload
	- encrypted DEK
	- IV
	- auth tag
	- key version

The backend never logs plaintext IDs.

### 6.3 Key Rotation and Re-Encryption

- Key rotation occurs every 30 days.
- A controlled batch job re-encrypts legacy records to the active key version within 24 hours.
- Rotation and batch completion checkpoints are written into tamper-evident audit logs.

### 6.4 Hashing and Duplicate Detection

- Canonicalize identity input before hashing.
- Persist irreversible identity hash for duplicate detection.
- Generate election-scoped commitment-compatible hash paths for on-chain verification interfaces.
- Persist and expose `reasonCodeHash` parity metadata for Aadhaar-only attestation traceability.
- Raw Aadhaar and EPIC values are never written to logs or analytical stores.

### 6.5 Retention and Purge Policy

- Sensitive KYC artifacts are retained until 180 days after election finalization.
- On purge:
  - delete encrypted identifier payloads
  - delete associated R2 objects
  - retain minimal immutable audit metadata and irreversible hashes where operationally required

### 6.6 Aadhaar-Only Fallback Rule

If EPIC is unavailable, Aadhaar-only path is permitted with stricter controls:

1. mandatory manual review by authorized Owner role
2. mandatory rejection or approval reason code
3. elevated audit event tagging
4. optional additional evidence requirements configured per election policy

---

## 7. KYC Workflow and FCFS Queue Model

### 7.1 KYC State Model

`Draft -> Submitted -> Queued -> UnderReview -> Approved | Rejected | NeedsResubmission`

For approved entries requiring chain-link confirmation:

`Approved -> OnChainAttested -> Eligible`

### 7.2 Queue Ordering Rule

- Queue is FCFS FIFO per `constituencyId + electionId` scope.
- Ordering key uses `submittedAt` then deterministic tiebreaker.
- Owner-side UI can filter queues but cannot reorder records silently.

### 7.3 Manual Review Controls

- Review actions must capture actor, timestamp, decision reason, and evidence references.
- Queue jumps, if explicitly allowed for emergency handling, require policy flag and are audit-tagged.
- Rejections and resubmission loops preserve historical trail.

### 7.4 Candidate Verification Scope

Candidate flow includes voter-like KYC and nomination metadata mirror from Form-2B subset.
At minimum, backend records candidate nomination descriptors needed for deterministic audit trace.

### 7.5 On-Chain Attestation Coupling

KYC queue approval is an off-chain decision path.
Final eligibility for voting integrates with on-chain attestation checks as defined by Foundry constraints.

---

## 8. Election Orchestration and Vote Relay Model

### 8.1 Backend to Foundry Boundary

- Backend handles validation, dedupe, routing, retries, and auditability.
- Foundry contracts remain final authority for election lifecycle and vote state mutation.

### 8.2 Vote Relay Preconditions

Before relaying vote transaction, backend verifies:

1. election is open according to mirrored lifecycle status
2. caller wallet is authenticated and authorized to vote
3. KYC state is eligible
4. no prior successful vote relay exists for same wallet and election
5. idempotency checks pass

### 8.3 Hybrid Idempotency (Locked)

Vote write path requires both:

1. server-issued one-time vote token
2. deterministic dedupe key: `wallet + electionId + clientNonce`

Behavior:

- identical replay requests return previously observed terminal response when safe
- mismatched replay with same dedupe key returns conflict
- expired or consumed one-time token returns deterministic rejection

### 8.4 Relay Lifecycle States

`Created -> Validated -> SubmittedToChain -> Confirmed | Failed | Expired`

Retry policy is bounded and deterministic with backoff and explicit terminal states.

### 8.5 Result Read Model Sync

- Canonical result truth comes from on-chain events and contract state.
- Backend may cache read models for performance.
- Scheduled reconciliation repairs read-model drift.

### 8.6 Rerun Lifecycle Orchestration (Foundry Parity)

Backend must explicitly model rerun-sensitive states from on-chain outcomes:

1. `RerunRequired` detection from finalization outcome.
2. parent-child election linkage in backend read model.
3. `Superseded` parent visibility once rerun child is created.
4. rerun count and fallback policy display (`one-rerun-only`) as chain-derived metadata.

Backend must not create a policy that conflicts with Foundry tie and NOTA rules.

### 8.7 Rerun SLA and Escalation Ticket Flow

1. Backend tracks rerun SLA timer as 7 days from rerun-required finalization timestamp.
2. Owner-facing dashboard highlights SLA state: `on-track`, `due-soon`, `breached`.
3. `due-soon` threshold is 48 hours before rerun deadline.
4. Admin is allowed to raise escalation ticket only.
5. ECI path executes final on-chain rerun action after escalation.
6. Escalation artifacts are immutable and audit-linked to election identifiers.

### 8.8 Explicit Finalization Outcome Contract

Backend response and persistence layers must support these exact outcome enums:

- `CandidateWon`
- `NotaTriggeredRerun`
- `TieLotCandidateWon`
- `TieLotNotaTriggeredRerun`

These values are authoritative for frontend messaging but still derived from on-chain state.

---

## 9. Session Timeout and Continuity Model

### 9.1 Inactivity Timeout

- Session inactivity timeout is 30 minutes.
- Any protected request updates rolling activity timestamp.
- Expired sessions require re-authentication.

### 9.2 Session Persistence Architecture

- Primary session and revocation structures: Redis or Upstash.
- Fallback durability for critical continuity records: Turso tables.

### 9.3 Resumable State Payload (Locked)

Allowed resumable elements:

- draft KYC form fields
- pending upload references
- pending vote intent metadata
- inbox filter state

Forbidden resumable behavior:

- automatic vote transaction submission after re-login

### 9.4 Logout and Revocation Behavior

- explicit logout revokes refresh context
- token misuse attempts emit security events
- revocation checks occur in authorization middleware for protected routes

### 9.5 Wallet Governance Status Contract

Backend exposes deterministic wallet-governance states for frontend route and UX safety:

- `WalletMismatchLocked`
- `WalletSwitchPendingApproval`
- `WalletSwitchApprovedAwaitingOnChainRebind`
- `WalletSwitchRejected`

These states are backend-authenticated and never inferred from frontend env claims.

---

## 10. API Surface and Contract Baseline

### 10.1 Namespace and Versioning

- Base namespace: `/api/v1`
- Route groups are role-scoped and middleware-protected.

### 10.2 Endpoint Families (MVP)

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

Elections, results, and vote relay:

- `GET /api/v1/elections`
- `GET /api/v1/elections/{electionId}`
- `GET /api/v1/results`
- `GET /api/v1/results/{electionId}`
- `POST /api/v1/votes/token`
- `POST /api/v1/votes/cast`

Observer and anomalies:

- `POST /api/v1/observer/anomalies`
- `GET /api/v1/observer/anomalies`

Wallet governance:

- `GET /api/v1/wallet/status`

Upload contract lifecycle:

- `POST /api/v1/uploads/authorize`
- `POST /api/v1/uploads/finalize`

Rerun orchestration:

- `GET /api/v1/elections/{electionId}/rerun/status`
- `POST /api/v1/owner/elections/{electionId}/rerun/escalation-ticket`
- `POST /api/v1/eci/elections/{electionId}/rerun/execute`
- `GET /api/v1/elections/{electionId}/lineage`

Escalation ticket request contract (owner escalation endpoint):

- `reasonCategory` (required)
- `reasonNote` (required)
- `evidenceHashRef` (required)

Inbox:

- `GET /api/v1/inbox`
- `POST /api/v1/inbox/{notificationId}/read`

Health and ops:

- `GET /health`
- `GET /ready`
- `GET /startup`

### 10.3 Response and Error Contract

All APIs return normalized envelopes for success and failure with:

- request correlation id
- machine-readable error code
- user-safe error message
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

### 10.3.1 Election List/Detail Payload Contract (Locked)

- `GET /api/v1/elections` response items must include `contestingCandidateCap`.
- `GET /api/v1/elections/{electionId}` response must include `contestingCandidateCap`.
- Candidate objects emitted in election list preview or election detail payload must include boolean `isNota`.
- `isNota = true` is reserved for NOTA pseudo-candidate representation.

### 10.4 Upload Lifecycle Contract (Strict)

Backend enforces deterministic upload lifecycle controls:

1. `POST /uploads/authorize` returns short-lived upload contract (TTL 10 minutes).
2. Upload object is accepted only under authorized key contract.
3. `POST /uploads/finalize` binds uploaded object to draft/submission context.
4. KYC submission cannot proceed until required media artifacts are finalize-bound.
5. Stale or expired upload contracts are rejected with deterministic conflict errors.

### 10.5 Status and Failure Semantics

- `400` for validation failures
- `401` for missing or invalid authentication
- `403` for authorization failures
- `404` for missing resources
- `409` for idempotency or state conflicts
- `422` for domain rule violations
- `429` for rate-limited access
- `500` and `503` for infrastructure or dependency failures

---

## 11. CORS and Traffic Admission Policy

### 11.1 Strict Origin Allowlist (Locked)

- CORS uses strict env-managed allowlist only.
- No wildcard origin is allowed in production.
- Local, preview, and production frontend URLs must be declared explicitly.

Suggested env contract:

- `FRONTEND_ORIGINS` (comma-separated)
- `CORS_ALLOW_CREDENTIALS` (`true` or `false`)

### 11.2 Preflight and Method Policy

- Allow only required methods per route group.
- Restrict headers to explicitly approved set.
- Set controlled preflight max-age to reduce repeated preflight overhead.
- Reject unknown origins with deterministic `403` response and audit trace.

### 11.3 Local and Production Behavior

- Local environment allows localhost origins explicitly listed in env.
- Preview environment allows only known preview domains listed in env.
- Production environment allows only canonical frontend domains listed in env.

---

## 12. Security Controls and Threat Model

### 12.1 Mandatory Security Controls (Locked)

1. Helmet middleware for secure headers.
2. Strict request body size limits and multipart limits.
3. Route-level rate limiting with tighter limits on auth and vote paths.
4. Login challenge throttling at IP and wallet granularity.
5. JWT rotation and refresh-token revocation model.
6. CSRF protection for cookie-based session flows.
7. Input validation and normalization for all external payloads.
8. Output encoding and safe serialization of user-provided fields.
9. WAF or Turnstile protection for sensitive abuse-prone routes.
10. Tamper-evident audit chain for privileged and sensitive actions.

### 12.2 Threat to Control Mapping

- Replay attacks:
	- nonce challenge expiry and one-time use
	- hybrid idempotency in vote relay path
- Brute-force auth abuse:
	- challenge issuance throttling
	- repeated failure lock window
- Token theft and replay:
	- short access token TTL
	- rotating refresh family and revocation checks
- Injection attacks:
	- schema validation at route boundary
	- Prisma parameterization and no raw dynamic SQL
- Privilege escalation:
	- role middleware and deny-by-default policy
	- owner route separation and audit event capture
- File upload abuse:
	- MIME and extension checks
	- size constraints and object naming hardening
- CSRF and cross-origin misuse:
	- strict CORS allowlist
	- CSRF middleware for cookie-bound flows

### 12.3 Secrets and Key Handling

- No secrets are committed to repository.
- Env secrets are required for auth, encryption, database, cache, and storage clients.
- Key versions are tracked and logged for auditability.
- Secrets rotation process is documented with rollback-safe runbook.

### 12.4 Audit Mutability Policy (Locked)

- Before election opens:
	- limited operational fields can be corrected by authorized roles
	- each correction writes reason and actor metadata
- After election opens:
	- sensitive records are append-only
	- corrections are represented as compensating records, never destructive edits

### 12.5 Business-Flow Abuse Controls (Explicit)

Sensitive flow controls beyond generic limits:

1. Anomaly report endpoint cap: 10 submissions per 15 minutes per wallet.
2. Auth challenge abuse lock: 5 failed verify attempts then 15-minute lock per wallet and IP pair.
3. Vote-sequencing abuse defense: block rapid repeated token-create and cast loops on same wallet and election.
4. Escalation ticket abuse defense: owner escalation endpoint uses stricter role and frequency policy.

---

## 13. Data Model and Storage Specification

### 13.1 Core Data Entities

`RoleWallet`
- wallet address, role, source, active flag, bootstrapped timestamp

`UserProfile`
- wallet, role profile, status, constituency bindings

`KycSubmission`
- submission id, user id, election id, constituency id
- encrypted identifier payload bundles
- irreversible hashes
- `isAadhaarOnly` flag and `reasonCodeHash` parity fields
- document object keys and review state
- upload finalize-binding references and finalized timestamps

`KycQueueItem`
- queue scope (`constituencyId + electionId`)
- submission reference, sequence marker, reviewer assignment

`CandidateProfile`
- election id, candidate id, nomination metadata mirror (Form-2B subset)
- `isNota` marker for pseudo-candidate parity where candidate snapshots are emitted

`ElectionMirror`
- election state mirror from chain for backend pre-checks and UI query efficiency
- parent and child linkage fields (`parentElectionId`, `childElectionId`)
- rerun SLA fields (`rerunRequiredAt`, `rerunDeadline`, `rerunStatus`)
- finalization outcome enum parity fields
- contesting candidate cap metadata (`contestingCandidateCap = 15`) for frontend parity display

`VoteToken`
- one-time vote token hash, wallet, election id, expiry, consumed timestamp

`VoteIntent`
- dedupe key, payload hash, validation status, terminal status

`VoteRelay`
- chain transaction metadata, relay status, confirmation and failure metadata

`Notification`
- inbox category, payload, read status, actor scope

`SessionState`
- session identifiers, last activity, resumable state payload, expiry

`AuditLog`
- actor, action, entity refs, immutable payload snapshot, previous hash, entry hash

`KeyRotationJob`
- key version, rotation window, migration status, affected record count

`RerunEscalationTicket`
- election id, created by role, created at, reasonCategory, reasonNote, evidenceHashRef, status, resolved at, resolved by

`WalletGovernanceState`
- wallet, role, governance state, mismatch context, pending reassignment metadata

### 13.2 Constraint and Index Baseline

1. Unique wallet constraint in user and role wallet context.
2. Unique dedupe key for vote intent (`wallet + electionId + clientNonce`).
3. Unique active vote token constraints per wallet and election scope where applicable.
4. Queue indexes on `constituencyId`, `electionId`, `submittedAt`.
5. Fast lookup indexes on review states and election status fields.
6. Referential integrity across submission, queue, and audit entities.
7. Parent-child rerun linkage uniqueness and cycle-prevention constraints.
8. One active rerun escalation ticket per election unless closed.

### 13.3 R2 Object Storage Strategy

Object key convention:

`kyc/{electionId}/{constituencyId}/{userId}/{submissionId}/{artifactType}-{version}.{ext}`

Rules:

- Object metadata stores checksum and upload context.
- Upload and read URLs are short-lived and scope-limited.
- Upload authorization TTL is 10 minutes by policy.
- Finalize-bind handshake is mandatory before KYC submit path can proceed.
- Public bucket access is disabled.
- Deletion workflow must remove objects during retention purge execution.

### 13.4 Data Purge and Archival Safety

- Purge scheduler identifies records crossing 180-day retention boundary.
- Purge executes DB and R2 deletion atomically by job design with retries.
- Purge summary metrics and failures are written to immutable audit stream.

---

## 14. Observability, Alerts, and Inbox

### 14.1 Logging Baseline

- Structured logs with correlation ids.
- Sensitive field redaction at serializer layer.
- Severity levels: debug, info, warn, error, critical.

### 14.2 Metrics Baseline

- Request latency percentiles per route family.
- Error rates and dependency failure rates.
- Queue depth and KYC review throughput.
- Vote relay success and failure distributions.
- Token refresh replay detection counts.

### 14.3 Anomaly Taxonomy (Locked)

Required observer-report categories:

1. Duplicate identity suspicion
2. Vote spike in short window
3. Infrastructure outage or degradation
4. Unauthorized admin action attempt
5. KYC review manipulation suspicion

### 14.4 Inbox Notification Categories

MVP in-app inbox includes:

- KYC submitted, approved, rejected, resubmission required
- election lifecycle updates relevant to role
- anomaly report state transitions
- vote relay completion or failure state
- session security events where applicable

### 14.5 Observer Aggregate-Only Masking Schema

Observer queue and KYC monitoring responses must expose:

- aggregate counts by status
- anonymized time buckets and trend windows
- non-identifying SLA indicators

Observer responses must not expose:

- raw Aadhaar or EPIC content
- profile or document object identifiers
- unmasked per-user identity metadata

### 14.6 Freshness Telemetry Contract

For polling-driven frontend surfaces, backend includes freshness hints:

1. `fresh` indicates data synchronized within active freshness window.
2. `stale` indicates outdated cache requiring user-visible refresh hint.
3. `degraded` indicates dependency lag or reconciliation delay.

---

## 15. Health, Readiness, and Startup Semantics

### 15.1 `/health` (Liveness)

- Reports process-level liveness and build version metadata.
- Must remain lightweight with no deep dependency checks.

### 15.2 `/ready` (Dependency Readiness)

Readiness checks include:

1. Turso connectivity probe
2. Redis or Upstash connectivity probe
3. R2 client probe (lightweight capability check)
4. blockchain provider availability probe (bounded timeout)

Readiness response is `503` if critical dependency checks fail.

### 15.3 `/startup` (Boot Completion)

Startup endpoint validates:

1. application boot path completed
2. required env keys loaded
3. role-wallet bootstrap completed
4. migration compatibility check passed

### 15.4 Endpoint Exposure Protection

- `/health` can remain minimally exposed for platform liveness.
- `/ready` and `/startup` are protected endpoints.
- Access contract for protected endpoints:
	- internal API key header (required)
	- optional IP allowlist enforcement (environment controlled)

### 15.5 Scheduled Operations Runbook (Vercel Cron)

Scheduled jobs are invoked through protected backend cron endpoints and configured in `vercel.json`.

Recommended jobs:

1. key rotation migration monitor and re-encryption completion checks
2. KYC retention purge execution
3. on-chain read-model reconciliation

Recommended endpoint pattern:

- `/api/v1/internal/cron/key-rotation`
- `/api/v1/internal/cron/kyc-purge`
- `/api/v1/internal/cron/reconcile-results`

All cron handlers must enforce internal auth checks and produce auditable job summaries.

---

## 16. Performance and Scalability Strategy

### 16.1 Rate Limits (Locked Baseline)

- Global baseline: 60 requests per minute per IP
- Vote endpoint baseline: 3 requests per minute per wallet

### 16.2 Route-Specific Controls

- Auth challenge routes use stricter burst limits.
- Auth verify endpoint enforces lock after 5 failures and a 15-minute lock window per wallet and IP pair.
- Vote token and vote cast routes enforce deterministic idempotency and limit windows.
- Observer anomaly endpoint enforces 10 submissions per 15 minutes per wallet.
- Owner review actions are protected by role and moderate rate ceilings.

### 16.3 Data and Query Efficiency

- Minimize N+1 patterns in queue and inbox retrieval.
- Use indexed filters for election and constituency scoped queries.
- Keep response payloads paginated for list-heavy endpoints.

### 16.4 Serverless Efficiency Considerations

- Avoid heavyweight startup logic in request path.
- Reuse initialized clients where runtime permits.
- Protect dependency calls with bounded timeout and fallback behavior.

---

## 17. Testing, Verification, and Acceptance

### 17.1 Test Layers

1. Unit tests:
	 - middleware, validators, role guards, idempotency calculators, crypto helpers
2. Integration tests:
	 - Prisma + Turso flows
	 - session and revocation flows
	 - R2 upload contract checks
3. Contract-integration tests:
	 - vote relay orchestration against Foundry interfaces on controlled test setup

### 17.2 Security Test Scope

- replay and double-submit tests
- auth challenge abuse tests
- token replay and revocation tests
- CORS and CSRF policy tests
- payload fuzzing for validation boundaries

### 17.3 Operational Test Scope

- readiness behavior on dependency outage
- queue fairness checks under concurrent submissions
- key rotation and 24-hour re-encryption completion checks
- purge pipeline correctness after retention threshold
- rerun SLA timer and escalation ticket flow correctness
- protected `/ready` and `/startup` authorization checks
- polling freshness enum transitions (`fresh`, `stale`, `degraded`)
- upload authorization TTL expiry and finalize-bind enforcement

### 17.4 Acceptance Criteria (Definition of Done)

1. Backend auth and role enforcement are operational and tested.
2. KYC encryption, hashing, and retention logic are implemented and verified.
3. KYC parity metadata includes `isAadhaarOnly` and `reasonCodeHash` where required.
4. FCFS queue behavior per constituency and election is deterministic.
5. Aadhaar-only fallback path enforces stricter manual review with reason code.
6. Upload authorization TTL is 10 minutes and finalize-bind is mandatory before submit.
7. Vote relay follows hybrid idempotency with deterministic conflict handling.
8. Rerun lifecycle orchestration supports parent-child linkage and Foundry-safe outcome semantics.
9. Rerun SLA is enforced at 7-day parity with escalation ticket flow.
10. Admin can raise escalation ticket and ECI executes final on-chain rerun action.
11. Wallet governance endpoint returns deterministic lock-state contracts.
12. Observer queue API remains aggregate-only with no identity-linked document metadata.
13. Polling freshness metadata contract (`fresh | stale | degraded`) is returned for relevant routes.
14. Session timeout and resumable state behavior match locked decisions.
15. `/ready` and `/startup` are protected using internal API key contract and optional IP allowlist.
16. CORS strict allowlist policy is env-driven and validated.
17. Security controls and business-flow abuse thresholds are integrated and validated in tests.
18. Audit trail hash chain is present for sensitive and privileged actions.
19. Scheduled cron runbook endpoints exist and produce auditable job summaries.

---

## 18. File Map (Target Backend End State)

Expected backend structure after implementation:

- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/config/env.ts`
- `backend/src/config/cors.ts`
- `backend/src/config/security.ts`
- `backend/src/db/prisma.ts`
- `backend/src/db/redis.ts`
- `backend/src/db/r2.ts`
- `backend/src/auth/challenge.service.ts`
- `backend/src/auth/token.service.ts`
- `backend/src/auth/auth.middleware.ts`
- `backend/src/roles/role-bootstrap.service.ts`
- `backend/src/kyc/kyc.service.ts`
- `backend/src/kyc/kyc.queue.service.ts`
- `backend/src/elections/election.service.ts`
- `backend/src/elections/rerun.service.ts`
- `backend/src/votes/vote-token.service.ts`
- `backend/src/votes/vote-relay.service.ts`
- `backend/src/uploads/upload-contract.service.ts`
- `backend/src/wallet-governance/wallet-status.service.ts`
- `backend/src/inbox/inbox.service.ts`
- `backend/src/observer/anomaly.service.ts`
- `backend/src/health/health.controller.ts`
- `backend/src/internal/cron/key-rotation.controller.ts`
- `backend/src/internal/cron/kyc-purge.controller.ts`
- `backend/src/internal/cron/reconcile-results.controller.ts`
- `backend/src/audit/audit.service.ts`
- `backend/prisma/schema.prisma`
- `backend/vercel.json`
- `backend/.env.example`
- `backend/README.md`

---

## 19. Risks, Tradeoffs, and Deferred Items

### 19.1 Chosen Tradeoffs

1. Storing encrypted plaintext plus hashes improves operational review flexibility,
	 with increased key management complexity.
2. Hybrid idempotency improves safety at cost of one extra token issue call.
3. Strict CORS allowlist improves security with stricter deployment discipline needs.

### 19.2 Known Risks

1. Key management mistakes can weaken KYC privacy guarantees.
2. Queue backlog spikes may increase review latency during high-volume events.
3. RPC instability can delay vote relay confirmation UX.
4. Misconfigured env allowlist can block legitimate frontend traffic.

### 19.3 Deferred to Post-MVP

1. Advanced real-time push channels beyond inbox polling.
2. Extended compliance workflow automation for candidate legal documents.
3. Advanced fraud scoring with ML-assisted anomaly ranking.
4. Multi-region write strategy beyond current Turso and cache topology.

---

## 20. Implementation Sequence (Execution Order)

1. Scaffold backend project structure and environment contract.
2. Implement auth challenge, signature verification, JWT issuance, refresh rotation, revocation.
3. Implement role bootstrap and route-level RBAC middleware.
4. Implement KYC encrypted storage pipeline, hash generation, and parity fields (`isAadhaarOnly`, `reasonCodeHash`).
5. Implement upload authorization and finalize-bind lifecycle controls.
6. Implement constituency and election-scoped FCFS queue logic.
7. Implement Owner review actions and candidate Form-2B subset metadata flow.
8. Implement vote token issuance and hybrid idempotency dedupe mechanics.
9. Implement vote relay orchestration with Foundry contract integration.
10. Implement rerun lifecycle orchestration and parent-child linkage read model.
11. Implement rerun SLA timer, escalation ticketing, and ECI execution path.
12. Implement wallet governance status endpoint and lock-state contracts.
13. Implement session timeout and resumable-state persistence.
14. Implement inbox notification, observer anomaly modules, and aggregate-only observer masking schema.
15. Implement freshness metadata contract for polling-driven frontend routes.
16. Implement audit hash-chain logging and privileged action traces.
17. Implement `/health`, protected `/ready`, and protected `/startup` endpoints.
18. Implement scheduled cron endpoints for key-rotation checks, KYC purge, and reconciliation.
19. Implement CORS strict allowlist and full security middleware plus abuse-threshold controls.
20. Execute unit, integration, security, and operational verification suites.
21. Finalize deployment settings and run controlled staging validation.

This sequence is mandatory to reduce rework, keep critical controls early,
and preserve deterministic backend behavior across implementation phases.


