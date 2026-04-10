FILE_LENGTH_TAG=medium (revalidated 2026-04-10: 1716 lines)

# EXP-6_BACKEND_PLAN - DVote (MVP + Backend) Extensive Development Plan

> Blockchain Lab (ITL801) | University of Mumbai | BE IT SEM VIII
>
> Authoring scope: Exp-6 backend only (off-chain API, storage, orchestration, security, observability).
>
> Canonical authority boundary: Foundry on-chain finality is never overridden by backend or frontend.
>
> Mini-project exception applied: EXP-6_DOC.md authoring is intentionally out of this plan scope.

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
| Experiment | Exp-6 - Mini Project: Full-fledged DApp using Ethereum |
| Plan Scope | DVote (MVP + Backend) only |
| Lab Outcome | LO6 - Develop and test a Full-fledged DApp using Ethereum/Hyperledger |
| Bloom's Taxonomy Level | L5 |
| Primary Tool(s) | Express 5, TypeScript, Prisma, Turso/libSQL, Upstash Redis, Cloudflare R2 |
| Supporting Tool(s) | Vercel (Node runtime + cron), Zod, JWT, Helmet, Foundry relay integration |
| Runtime Baseline | Node v22.x (aligned with Exp-6 global baseline) |
| Database | Turso SQLite via Prisma adapter-libsql |
| Session Layer | Redis/Upstash primary, Turso fallback for existing sessions only |
| Object Storage | Cloudflare R2 via S3-compatible AWS SDK v3 |
| Auth Model | Signed nonce challenge + access token + rotating refresh token family |
| Login Policy | EOA-only for MVP session login |
| Session Timeout | 30 minutes inactivity |
| Vote Token TTL | 60 seconds |
| Upload Contract TTL | 10 minutes |
| KYC Upload Size Limits | Documents <= 10 MB, profile photo <= 5 MB |
| Pagination Policy | Cursor-first response envelope, offset fallback, stable ordering key |
| Client Nonce Policy | UUID v7 per vote attempt |
| Vote Timeout Policy | Timeout uncertainty requires status lookup before recast |
| Freshness Policy | Global `fresh`/`stale`/`degraded` contract consumed by KYC UI gating |
| Deployment Topology | Separate frontend and backend Vercel projects/domains |
| Rerun SLA Parity | 7 days from rerun-required finalization state |
| Observer Data Policy | Aggregate-only masking, no identity-linked metadata |
| Candidate KYC Rule | EPIC + Aadhaar mandatory in MVP |
| Voter Aadhaar-only Rule | Allowed with stricter review + reason code + additional evidence |
| Prerequisite Experiments | Exp-1 to Exp-4 (Ethereum track), Exp-6 Foundry plan parity |
| Estimated Phases | 20 phases |
| FILE_LENGTH_TAG | medium (revalidated 2026-04-10 at 1716 lines) |

### 0.1 Network and Deployment Awareness Table

| Surface | Type | Identifier | Runtime/Port | Usage |
|---|---|---|---|---|
| Backend local API | Local | localhost | 4000 (recommended) | Local API development and tests |
| Frontend local app | Local | localhost | 5173 (recommended) | CORS and cookie flow local validation |
| Backend preview | Hosted | Vercel preview domain | Node.js serverless | Pre-merge integration checks |
| Backend production | Hosted | Custom backend domain | Node.js serverless | Canonical production API |
| Turso | Managed DB | libsql URL | HTTPS | Durable system-of-record persistence |
| Upstash Redis | Managed cache | REST URL + token | HTTPS | Sessions, revocation, fast state |
| Cloudflare R2 | Managed object storage | S3 endpoint | HTTPS | KYC media object storage |
| Sepolia provider | On-chain read/write | chainId 11155111 | HTTPS RPC | Relay parity verification paths |

### 0.2 Policy Locks from Brainstorming Agreement

1. Frontend and backend will be deployed as separate projects/domains.
2. Backend runtime strategy is Express local listener plus Vercel deployment adapter flow.
3. Auth transport is HttpOnly refresh cookie and in-memory access token.
4. Session fallback is limited to existing sessions only when Redis is unavailable.
5. KYC key management is env key-ring now and external KMS post-MVP.
6. Vote token TTL is fixed to 60 seconds.
7. Expired vote token requires fresh token issuance and cast restart.
8. Upload hardening includes MIME, extension, size, checksum finalize-bind, and malware scan queue.
9. KYC submit is allowed while scan status is pending.
10. If scan service is down, finalize-bind must fail closed.
11. Queue ordering tie-break is submittedAt plus monotonic sequence per constituency and election.
12. Escalation tickets are immutable after submission with append-only correction events.
13. Observer queue surfaces are aggregate-only counts/trends.
14. Purge pipeline supports hold-flag pause per election for legal/dispute scenarios.
15. Admin raises rerun escalation ticket; ECI executes rerun action.
16. List endpoints follow cursor-first pagination with offset fallback.
17. Pagination stable ordering key is locked to `createdAt DESC, id DESC`.
18. Invalid or expired cursors return `400 PAGINATION_CURSOR_INVALID` with offset fallback guidance.
19. Vote relay timeout uncertainty requires status lookup before any recast attempt.
20. `clientNonce` is mandatory UUID v7; invalid format returns `422 CLIENT_NONCE_INVALID_FORMAT`.
21. Upload size limits are fixed to documents 10 MB and profile photo 5 MB.
22. Global freshness contract (`fresh`/`stale`/`degraded`) is authoritative for KYC submit gating.

### 0.3 Identity Canonical Contract Locks

1. EPIC canonical regex is `^[A-Z]{3}[0-9]{7}$`.
2. Aadhaar canonical regex is `^[0-9]{12}$` plus Verhoeff checksum validation.
3. Input handling is normalize-first, then validate.
4. Duplicate identity prevention is election-scoped and overlapping-active-constituency scoped.
5. Commitment preimage prefix is locked as: `DVOTE_V1|DOC_TYPE|CANONICAL_ID|ELECTION_SALT`.
6. Foundry does not parse raw EPIC or Aadhaar values and only verifies commitments and signatures.

### 0.4 Scope Safety Note

1. This plan must not force EXP-6 evaluation-document workflow in current implementation sequence.
2. EXP-6_DOC.md remains deferred until mini-project implementation reaches report-ready state.

---

## 1. Pre-Flight Checklist

Run all checks before starting Phase 1. Do not proceed if any mandatory item fails.

### 1.0 Mandatory Research and Dependency Revalidation (Project-Locked Requirement)

- [ ] Re-validate Prisma adapter-libsql guidance for Turso using MCP documentation references.
- [ ] Re-validate Vercel Express deployment constraints and Node runtime behavior.
- [ ] Re-validate Vercel cron `vercel.json` contract and protected endpoint pattern.
- [ ] Re-validate Upstash Redis TTL and REST semantics for serverless session paths.
- [ ] Re-validate Cloudflare R2 S3-compatible presigned URL and endpoint requirements.
- [ ] Re-validate Express production security baseline (headers, rate limits, error handling).
- [ ] Record selected versions and compatibility notes inside this plan before backend coding starts.

### 1.1 Runtime and Toolchain Baseline

- [ ] `nvm --version` confirms 0.40.x or newer.
- [ ] `nvm use 22` succeeds in `Exp-6/` and reports Node v22.x.
- [ ] `node --version` confirms Node v22.x.
- [ ] `npm --version` confirms npm v10.x or newer.
- [ ] `vercel --version` is available for preview/production deployment checks.

### 1.2 Backend Workspace Bootstrap

- [ ] `Exp-6/backend/` exists and is empty or intentionally prepared.
- [ ] Backend package manager lock strategy is decided and documented (npm lockfile in backend scope).
- [ ] TypeScript compilation target and module format are selected and documented.

### 1.3 Dependency Installation and Update Gate

- [ ] Install/update backend runtime dependencies in `Exp-6/backend`.
- [ ] Install/update Prisma CLI and Prisma client.
- [ ] Install/update `@prisma/adapter-libsql` and `@libsql/client`.
- [ ] Install/update `@upstash/redis` and optional rate-limit helper dependencies.
- [ ] Install/update `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- [ ] Install/update validation and security dependencies (`zod`, `helmet`, cookie/CSRF stack, JWT stack).
- [ ] Install/update test stack (`vitest` or equivalent, supertest, test helpers).

### 1.4 Environment and Secret Hygiene Gate

- [ ] `Exp-6/backend/.env` is not tracked in git.
- [ ] `Exp-6/backend/.env.example` includes all required placeholders.
- [ ] Distinct secrets are prepared for local, preview, and production scopes.
- [ ] Encryption key-ring variables include active and previous key versions.
- [ ] Cookie and CSRF env values are set for split-domain topology.

### 1.5 Connectivity Gate

- [ ] Turso connectivity probe succeeds with configured URL and token.
- [ ] Upstash Redis connectivity probe succeeds using REST URL and token.
- [ ] Cloudflare R2 bucket connectivity probe succeeds with S3-compatible credentials.
- [ ] Sepolia provider connectivity probe succeeds for relay parity checks.

### 1.6 Port and Process Hygiene

- [ ] Backend local API port is available before app start.
- [ ] No stale process holds backend port from previous runs.
- [ ] Local frontend dev origin is known and added to CORS allowlist.

### 1.7 Build and Smoke Gates

- [ ] Backend TypeScript build exits 0.
- [ ] Lint and formatting checks pass (if configured).
- [ ] Basic health endpoint smoke test passes locally.
- [ ] Basic auth challenge endpoint smoke test passes locally.

### 1.8 Git and Branch Safety Gate

- [ ] Working branch is `b-pratham`.
- [ ] Current uncommitted changes are intentional and understood.
- [ ] No secret-bearing files are staged.

### 1.9 Scope Safety Gate

- [ ] This plan execution remains backend-only and does not include frontend implementation.
- [ ] This plan execution does not author EXP-6_DOC.md content.
- [ ] Foundry outcome logic remains canonical and backend preserves parity-only behavior.

---

## 2. Repository File Map

Legend: CREATE = new file, UPDATE = modify existing, VERIFY = read-only check, DEFER = intentionally deferred.

| # | File Path (relative to `Exp-6/`) | Action | Phase | Purpose |
|---:|---|---|---:|---|
| 1 | `EXP-6_BACKEND_PLAN.md` | UPDATE | 0-20 | Canonical backend execution blueprint |
| 2 | `docs/FEATURE_BACKEND.md` | VERIFY | 0-20 | Backend feature authority and parity source |
| 3 | `docs/FEATURE_FOUNDRY.md` | VERIFY | 0-20 | On-chain boundary and rerun parity authority |
| 4 | `docs/FEATURE_FRONTEND.md` | VERIFY | 0-20 | Cross-layer API and freshness contracts |
| 5 | `backend/package.json` | CREATE | 2 | Backend dependency and scripts baseline |
| 6 | `backend/package-lock.json` | CREATE | 2 | Backend lockfile for deterministic installs |
| 7 | `backend/tsconfig.json` | CREATE | 2 | TypeScript compile contract |
| 8 | `backend/vercel.json` | CREATE | 15 | Vercel route and cron configuration |
| 9 | `backend/.gitignore` | CREATE | 2 | Backend-local ignore rules |
| 10 | `backend/.env.example` | CREATE | 3 | Full backend env placeholder contract |
| 11 | `backend/README.md` | CREATE | 19 | Backend runbook and operational guide |
| 12 | `backend/prisma/schema.prisma` | CREATE | 4 | Data model and constraints |
| 13 | `backend/prisma/migrations/*` | CREATE | 4 | Migration history |
| 14 | `backend/src/app.ts` | CREATE | 3 | Express app composition |
| 15 | `backend/src/server.ts` | CREATE | 3 | Local runtime listener entry |
| 16 | `backend/src/config/env.ts` | CREATE | 3 | Typed env parsing and validation |
| 17 | `backend/src/config/cors.ts` | CREATE | 3 | CORS allowlist policy |
| 18 | `backend/src/config/security.ts` | CREATE | 16 | Security middleware wiring |
| 19 | `backend/src/config/constants.ts` | CREATE | 3 | Shared constants and enums |
| 20 | `backend/src/lib/logger.ts` | CREATE | 3 | Structured logging with redaction |
| 21 | `backend/src/lib/http.ts` | CREATE | 3 | Response envelope helpers |
| 22 | `backend/src/lib/errors.ts` | CREATE | 3 | Error code taxonomy |
| 23 | `backend/src/lib/request-id.ts` | CREATE | 3 | Correlation id middleware |
| 24 | `backend/src/lib/crypto/aes-gcm.ts` | CREATE | 7 | Envelope encryption helpers |
| 25 | `backend/src/lib/crypto/verhoeff.ts` | CREATE | 7 | Aadhaar checksum validator |
| 26 | `backend/src/lib/validation/identity.ts` | CREATE | 7 | EPIC/Aadhaar canonicalization and validation |
| 27 | `backend/src/lib/validation/common.ts` | CREATE | 3 | Shared request validators |
| 28 | `backend/src/db/prisma.ts` | CREATE | 4 | Prisma client and adapter-libsql wiring |
| 29 | `backend/src/db/redis.ts` | CREATE | 4 | Upstash Redis client wiring |
| 30 | `backend/src/db/r2.ts` | CREATE | 4 | Cloudflare R2 S3 client wiring |
| 31 | `backend/src/auth/challenge.service.ts` | CREATE | 5 | Nonce challenge creation and expiry |
| 32 | `backend/src/auth/token.service.ts` | CREATE | 5 | Access/refresh token issue, rotate, revoke |
| 33 | `backend/src/auth/auth.middleware.ts` | CREATE | 5 | Protected route auth and revocation checks |
| 34 | `backend/src/auth/csrf.middleware.ts` | CREATE | 5 | CSRF protection for cookie flows |
| 35 | `backend/src/auth/routes.ts` | CREATE | 5 | Auth endpoints |
| 36 | `backend/src/sessions/session.service.ts` | CREATE | 5 | Session lifecycle and fallback semantics |
| 37 | `backend/src/roles/role-bootstrap.service.ts` | CREATE | 6 | Role-wallet bootstrap on startup |
| 38 | `backend/src/roles/roles.middleware.ts` | CREATE | 6 | RBAC route guard middleware |
| 39 | `backend/src/roles/routes.ts` | CREATE | 6 | Owner/observer/voter route guards |
| 40 | `backend/src/kyc/kyc.service.ts` | CREATE | 7 | KYC submission domain logic |
| 41 | `backend/src/kyc/kyc.crypto.service.ts` | CREATE | 7 | Sensitive field encrypt/decrypt orchestration |
| 42 | `backend/src/kyc/kyc.validators.ts` | CREATE | 7 | KYC domain rule validations |
| 43 | `backend/src/kyc/kyc.queue.service.ts` | CREATE | 9 | FCFS queue sequencing and review transitions |
| 44 | `backend/src/kyc/routes.ts` | CREATE | 7-9 | KYC endpoint surfaces and freshness-aware gating helpers |
| 45 | `backend/src/uploads/upload-authorize.service.ts` | CREATE | 8 | Upload contract authorize path |
| 46 | `backend/src/uploads/upload-finalize.service.ts` | CREATE | 8 | Finalize-bind with checksum and scan state |
| 47 | `backend/src/uploads/routes.ts` | CREATE | 8 | Upload authorize/finalize endpoints |
| 48 | `backend/src/scans/scan-queue.service.ts` | CREATE | 8 | Malware scan queue contract |
| 49 | `backend/src/elections/election-mirror.service.ts` | CREATE | 10 | Election mirror read model |
| 50 | `backend/src/elections/results-reconcile.service.ts` | CREATE | 10 | On-chain reconciliation worker logic |
| 51 | `backend/src/elections/lineage.service.ts` | CREATE | 12 | Parent-child rerun lineage views |
| 52 | `backend/src/elections/routes.ts` | CREATE | 10 | Election/result/lineage endpoints with pagination and freshness contracts |
| 53 | `backend/src/votes/vote-token.service.ts` | CREATE | 11 | One-time vote token issuance |
| 54 | `backend/src/votes/idempotency.service.ts` | CREATE | 11 | Dedupe key policy and conflict handling |
| 55 | `backend/src/votes/vote-relay.service.ts` | CREATE | 11 | Foundry relay orchestration |
| 56 | `backend/src/votes/routes.ts` | CREATE | 11 | Vote token, cast, and timeout status lookup endpoints |
| 57 | `backend/src/rerun/rerun.service.ts` | CREATE | 12 | Rerun status and SLA calculations |
| 58 | `backend/src/rerun/escalation.service.ts` | CREATE | 12 | Escalation ticket contract logic |
| 59 | `backend/src/rerun/routes-owner.ts` | CREATE | 12 | Owner escalation endpoint |
| 60 | `backend/src/rerun/routes-eci.ts` | CREATE | 12 | ECI execute endpoint |
| 61 | `backend/src/wallet-governance/wallet-status.service.ts` | CREATE | 13 | Wallet lock-state computation |
| 62 | `backend/src/wallet-governance/routes.ts` | CREATE | 13 | Wallet status endpoint |
| 63 | `backend/src/observer/anomaly.service.ts` | CREATE | 14 | Observer anomaly create/list behavior |
| 64 | `backend/src/observer/routes.ts` | CREATE | 14 | Observer endpoint surfaces |
| 65 | `backend/src/inbox/inbox.service.ts` | CREATE | 14 | Notification inbox service |
| 66 | `backend/src/inbox/routes.ts` | CREATE | 14 | Inbox endpoints |
| 67 | `backend/src/health/routes.ts` | CREATE | 15 | `/health`, `/ready`, `/startup`, and global freshness routes |
| 68 | `backend/src/internal/cron/auth.middleware.ts` | CREATE | 15 | Internal cron auth gate |
| 69 | `backend/src/internal/cron/key-rotation.route.ts` | CREATE | 15 | Key rotation check route |
| 70 | `backend/src/internal/cron/kyc-purge.route.ts` | CREATE | 15 | Retention purge route |
| 71 | `backend/src/internal/cron/reconcile.route.ts` | CREATE | 15 | Read-model reconciliation route |
| 72 | `backend/src/audit/hash-chain.ts` | CREATE | 16 | Tamper-evident hash chain helpers |
| 73 | `backend/src/audit/audit.service.ts` | CREATE | 16 | Audit writer service |
| 74 | `backend/src/middleware/rate-limit.ts` | CREATE | 16 | Route and flow-specific limits |
| 75 | `backend/src/middleware/error-handler.ts` | CREATE | 16 | Centralized error mapping |
| 76 | `backend/test/unit/*` | CREATE | 17 | Unit test suites |
| 77 | `backend/test/integration/*` | CREATE | 17 | Integration test suites |
| 78 | `backend/test/security/*` | CREATE | 17 | Security test suites |
| 79 | `backend/test/operational/*` | CREATE | 17 | Readiness, cron, failover, purge tests |
| 80 | `backend/test/e2e/*` | CREATE | 18 | Full API scenario tests |
| 81 | `backend/scripts/smoke-local.mjs` | CREATE | 18 | Local smoke workflow |
| 82 | `backend/scripts/smoke-preview.mjs` | CREATE | 18 | Preview smoke workflow |
| 83 | `backend/scripts/dependency-check.mjs` | CREATE | 1 | Dependency and runtime assertions |
| 84 | `EXP-6_DOC.md` | DEFER | - | Deferred due to mini-project exception |

---

## 3. Sequential Development Phases

Each phase includes Goal, Files Touched, Logical Flow, and Exit Criteria. Execute in order.

---

### Phase 1 - Research Lock and Dependency Baseline

**Goal**: Freeze official references, version assumptions, and dependency strategy before coding.

**Files Touched**: `EXP-6_BACKEND_PLAN.md` (UPDATE), `backend/scripts/dependency-check.mjs` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Re-check Node 22 environment and local tool availability.
2. Verify backend folder state and initialize dependency-check script scaffold.
3. Record compatibility notes for Prisma adapter-libsql, Vercel runtime, Upstash, and R2.
4. Capture unresolved assumptions and close them before scaffolding phase starts.

**Exit Criteria**:
- Runtime baseline is verified and documented.
- Official research anchors are locked in plan notes.
- No unresolved compatibility blocker remains.

---

### Phase 2 - Backend Scaffold and TypeScript Baseline

**Goal**: Create clean backend workspace skeleton with deterministic package and compile contracts.

**Files Touched**: `backend/package.json` (CREATE), `backend/package-lock.json` (CREATE), `backend/tsconfig.json` (CREATE), `backend/.gitignore` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Initialize backend package in `Exp-6/backend`.
2. Install core runtime and developer dependencies.
3. Configure scripts for build, dev, test, lint, and smoke runs.
4. Add TypeScript config for strict mode and predictable module resolution.
5. Add `.gitignore` entries for build output, env files, and temporary artifacts.

**Logical Hint (structure only, not full implementation)**:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "smoke:local": "node scripts/smoke-local.mjs"
  }
}
```

**Exit Criteria**:
- `npm install` in `backend/` succeeds.
- `npm run build` succeeds.
- Base scripts are runnable without placeholder crashes.

---

### Phase 3 - Environment Contract and App Bootstrap

**Goal**: Build foundational app composition with strict env parsing, CORS policy, and response envelope primitives.

**Files Touched**: `backend/.env.example` (CREATE), `backend/src/app.ts` (CREATE), `backend/src/server.ts` (CREATE), `backend/src/config/env.ts` (CREATE), `backend/src/config/cors.ts` (CREATE), `backend/src/lib/logger.ts` (CREATE), `backend/src/lib/http.ts` (CREATE), `backend/src/lib/errors.ts` (CREATE), `backend/src/lib/request-id.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Create typed env parser that fails fast when required keys are missing.
2. Implement strict CORS allowlist from env-driven origin list.
3. Build app bootstrap with JSON limits, request-id middleware, and normalized response envelope.
4. Add local listener entry for non-serverless development path.
5. Ensure all startup failures return deterministic diagnostic messages.

**Exit Criteria**:
- App starts locally with valid env set.
- Invalid env causes startup failure with explicit error.
- CORS deny path returns deterministic forbidden response.

---

### Phase 4 - Data Clients and Persistence Foundation

**Goal**: Wire Turso, Redis, and R2 clients with safe initialization and Prisma schema baseline.

**Files Touched**: `backend/prisma/schema.prisma` (CREATE), `backend/prisma/migrations/*` (CREATE), `backend/src/db/prisma.ts` (CREATE), `backend/src/db/redis.ts` (CREATE), `backend/src/db/r2.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Define initial Prisma schema entities from backend feature contract.
2. Configure Prisma client with adapter-libsql for Turso.
3. Implement Redis client wrapper with health probe and typed helper methods.
4. Implement R2 S3 client wrapper with endpoint and credential checks.
5. Create migration baseline and verify migrate workflow.

**Logical Hint (structure only, not full implementation)**:

```typescript
const adapter = new PrismaLibSQL({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

export const prisma = new PrismaClient({ adapter });
```

**Exit Criteria**:
- Prisma client connects to Turso successfully.
- Redis probe succeeds with configured credentials.
- R2 probe succeeds for target bucket.
- Initial migration applies cleanly.

---

### Phase 5 - Authentication, Rotation, and Session Contract

**Goal**: Implement signed nonce login, token rotation, revocation, CSRF protection, and 30-minute inactivity model.

**Files Touched**: `backend/src/auth/challenge.service.ts` (CREATE), `backend/src/auth/token.service.ts` (CREATE), `backend/src/auth/auth.middleware.ts` (CREATE), `backend/src/auth/csrf.middleware.ts` (CREATE), `backend/src/auth/routes.ts` (CREATE), `backend/src/sessions/session.service.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement nonce challenge creation with short TTL and one-time consumption.
2. Implement EOA-only signature verification for session login path.
3. Issue access and refresh tokens with refresh-family rotation strategy.
4. Implement replay detection and family revocation behavior.
5. Enforce 30-minute inactivity timeout and resumable-state boundaries.
6. Implement CSRF checks for cookie-bound mutating endpoints.

<!-- TOOL: ETHERSJS -->
**Logical Flow**:
1. Recover signer from challenge signature and compare with claimed wallet.
2. Reject unsupported contract-wallet login path in MVP with deterministic error code.

**Exit Criteria**:
- Challenge-create and verify endpoints pass happy-path tests.
- Refresh replay triggers family revocation as designed.
- Inactivity timeout is enforced and logged.
- CSRF middleware blocks invalid mutating requests.

---

### Phase 6 - Role Bootstrap and RBAC Surface

**Goal**: Implement startup role-wallet bootstrap and route-level role enforcement with deny-by-default policy.

**Files Touched**: `backend/src/roles/role-bootstrap.service.ts` (CREATE), `backend/src/roles/roles.middleware.ts` (CREATE), `backend/src/roles/routes.ts` (CREATE), `backend/src/config/constants.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Parse role-wallet mappings from env at startup.
2. Upsert role-wallet entries into persistence with source metadata.
3. Implement role middleware for Owner, Observer, and Voter access surfaces.
4. Enforce no self-escalation paths in API contracts.
5. Add audit events for unauthorized route access attempts.

**Exit Criteria**:
- Startup role bootstrap succeeds with deterministic idempotent behavior.
- Role middleware correctly blocks unauthorized access with `403`.
- Unauthorized attempts are visible in audit stream.

---

### Phase 7 - Identity Validation, Canonicalization, and KYC Privacy Pipeline

**Goal**: Implement strict identity canonicalization, Aadhaar checksum validation, envelope encryption, and candidate/voter document rules.

**Files Touched**: `backend/src/lib/validation/identity.ts` (CREATE), `backend/src/lib/crypto/verhoeff.ts` (CREATE), `backend/src/lib/crypto/aes-gcm.ts` (CREATE), `backend/src/kyc/kyc.validators.ts` (CREATE), `backend/src/kyc/kyc.crypto.service.ts` (CREATE), `backend/src/kyc/kyc.service.ts` (CREATE), `backend/src/kyc/routes.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement EPIC normalize-then-validate flow.
2. Implement Aadhaar normalize-then-validate flow with Verhoeff checksum.
3. Implement candidate rule: both EPIC and Aadhaar mandatory.
4. Implement voter Aadhaar-only fallback with reason code and extra evidence requirement hooks.
5. Encrypt sensitive identifiers using AES-GCM envelope model and key-version metadata.
6. Persist irreversible hashes for duplicate checks and commitment preparation.
7. Enforce duplicate scope: same election and overlapping-active constituency windows.

**Logical Hint (structure only, not full implementation)**:

```typescript
const EPIC_REGEX = /^[A-Z]{3}[0-9]{7}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;

function normalizeEpic(input: string): string {
  return input.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
```

**Exit Criteria**:
- Invalid EPIC and invalid Aadhaar inputs are deterministically rejected.
- Aadhaar checksum failures are explicitly distinguishable from format failures.
- Candidate submission fails when either EPIC or Aadhaar is missing.
- Sensitive identifiers are encrypted at rest and never logged in plaintext.

---

### Phase 8 - Upload Authorize/Finalize and Pending-Scan Contract

**Goal**: Implement strict upload lifecycle with 10-minute authorization TTL, checksum finalize-bind, and pending malware scan flow.

**Files Touched**: `backend/src/uploads/upload-authorize.service.ts` (CREATE), `backend/src/uploads/upload-finalize.service.ts` (CREATE), `backend/src/uploads/routes.ts` (CREATE), `backend/src/scans/scan-queue.service.ts` (CREATE), `backend/src/db/r2.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Create authorize endpoint issuing upload contract with fixed 10-minute expiry.
2. Restrict authorized upload paths and metadata contract per submission context.
3. Enforce file-size limits in authorize and finalize validation: documents <= 10 MB and profile photo <= 5 MB.
4. Implement finalize-bind requiring checksum verification.
5. Enqueue scan job and set artifact state to `scan-pending`.
6. Allow KYC submit while artifact scan state is pending per locked policy.
7. If scan service is unavailable, reject finalize-bind (fail closed).
8. Reject stale authorization tokens and require re-authorize flow.
9. Return deterministic validation responses for oversize payloads and unsupported media.

**Logical Hint (structure only, not full implementation)**:

```typescript
if (now > uploadContract.expiresAt) {
  throw conflict("UPLOAD_CONTRACT_EXPIRED");
}

if (!checksumMatches) {
  throw validation("UPLOAD_CHECKSUM_MISMATCH");
}
```

**Exit Criteria**:
- Upload authorization TTL is enforced.
- Upload size limits are enforced exactly (docs 10 MB, profile photo 5 MB).
- Finalize-bind fails on checksum mismatch.
- Scan service outage causes deterministic finalize-bind rejection.
- Pending-scan state is persisted and queryable.

---

### Phase 9 - FCFS KYC Queue and Review Decision Engine

**Goal**: Implement deterministic queueing, manual review lifecycle, and immutable audit trail for KYC decisions.

**Files Touched**: `backend/src/kyc/kyc.queue.service.ts` (CREATE), `backend/src/kyc/kyc.service.ts` (UPDATE), `backend/src/kyc/routes.ts` (UPDATE), `backend/src/audit/audit.service.ts` (CREATE), `backend/src/audit/hash-chain.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Create queue insertion logic by constituency and election scope.
2. Apply deterministic tie-break using submittedAt plus monotonic sequence.
3. Implement review state machine transitions with actor attribution and reason capture.
4. Enforce append-only sensitive mutation policy after election opens.
5. Implement immutable audit entries chained by previous hash reference.

**Exit Criteria**:
- Queue ordering remains deterministic under concurrent submissions.
- Review actions store actor, timestamp, reason, and evidence links.
- Post-open sensitive mutation policy is enforceable and audited.

---

### Phase 10 - Election Mirror, Results Sync, Freshness, and Pagination Contract

**Goal**: Implement chain-derived election mirror model plus freshness and pagination contracts for polling clients.

**Files Touched**: `backend/src/elections/election-mirror.service.ts` (CREATE), `backend/src/elections/results-reconcile.service.ts` (CREATE), `backend/src/elections/routes.ts` (CREATE), `backend/src/config/constants.ts` (UPDATE)

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Define chain parity fields required from Foundry events/state.
2. Implement scheduled reconciliation to converge backend read-model to chain truth.
3. Implement explicit finalization outcome parity enums.
4. Implement response freshness metadata: `lastSyncedAt`, `nextPollAfterSec`, `freshnessState`.

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement election and result list/detail endpoints with freshness metadata.
2. Enforce list-endpoint pagination contract with cursor-first mode and offset fallback behavior.
3. Lock stable ordering key for cursor derivation as `createdAt DESC, id DESC`.
4. Reject invalid/expired cursors with `400 PAGINATION_CURSOR_INVALID` and include offset fallback guidance.
5. Ensure candidate payload includes `isNota` and cap metadata where required.
6. Surface rerun lineage and superseded-state visibility as read-only contracts.

**Pagination Contract (all list endpoints in scope)**:

```json
{
  "items": [],
  "pagination": {
    "mode": "cursor",
    "nextCursor": "opaque-cursor",
    "offsetFallback": { "limit": 25, "offset": 0 },
    "orderKey": "createdAt:desc,id:desc"
  }
}
```

**Exit Criteria**:
- Election/result routes always emit freshness contract metadata.
- List endpoints expose cursor-first pagination with deterministic offset fallback behavior.
- Invalid cursor behavior is deterministic and documented.
- Chain drift is corrected by reconciliation workflow.
- Outcome enums match Foundry contract semantics exactly.

---

### Phase 11 - Vote Token, Idempotency, and Relay Orchestration

**Goal**: Implement hybrid idempotency path and robust vote relay lifecycle with deterministic failure behavior.

**Files Touched**: `backend/src/votes/vote-token.service.ts` (CREATE), `backend/src/votes/idempotency.service.ts` (CREATE), `backend/src/votes/vote-relay.service.ts` (CREATE), `backend/src/votes/routes.ts` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Issue one-time vote token bound to wallet and election with 60-second expiry.
2. Require dedupe key contract: wallet + electionId + clientNonce.
3. Validate `clientNonce` as UUID v7 and reject invalid format with deterministic `422` response.
4. Implement replay-safe response semantics for identical retried requests.
5. Reject mismatched replay payload under same dedupe key with conflict response.
6. Relay validated cast request to chain integration path and track lifecycle state.
7. Enforce expired-token restart behavior and prevent silent auto-cast retry.
8. Implement vote status lookup endpoint for uncertain relay outcomes.
9. Support lookup keys with deterministic precedence: `voteIntentId` first, fallback tuple `wallet + electionId + clientNonce`.
10. Lock terminal states as `confirmed`, `failed`, `expired`, and `conflict`; treat `submitted`, `pending`, and `timeout-uncertain` as non-terminal.
11. For timeout uncertainty, return retry guidance contract (`recheckAfterSec`, `statusLookupWindowSec`) and block immediate recast guidance.

<!-- TOOL: ETHERSJS -->
**Logical Flow**:
1. Submit relay transaction through configured chain provider and signer context.
2. Persist tx hash and terminal state on confirmation/failure/timeout.
3. Ensure backend never claims success before on-chain terminal evidence.

**Status Lookup Contract (structure only, not full implementation)**:

```json
{
  "lookup": {
    "voteIntentId": "uuid",
    "wallet": "0x...",
    "electionId": "123",
    "clientNonce": "uuidv7"
  },
  "relayState": "timeout-uncertain",
  "terminal": false,
  "recheckAfterSec": 3,
  "statusLookupWindowSec": 120
}
```

**Logical Hint (structure only, not full implementation)**:

```typescript
const dedupeKey = `${wallet}:${electionId}:${clientNonce}`;
if (existing && existing.payloadHash !== incomingHash) {
  throw conflict("VOTE_DEDUPE_PAYLOAD_CONFLICT");
}
```

**Exit Criteria**:
- Vote token expires exactly as configured and enforces restart contract.
- Invalid `clientNonce` format is rejected deterministically.
- Idempotency conflict behavior is deterministic and testable.
- Status lookup endpoint resolves uncertain relay outcomes with deterministic keys and states.
- Relay states progress through terminal outcomes with auditable metadata.

---

### Phase 12 - Rerun Orchestration and Escalation Ticket Flow

**Goal**: Implement rerun SLA tracking, lineage endpoints, immutable escalation tickets, and Admin/ECI split responsibilities.

**Files Touched**: `backend/src/rerun/rerun.service.ts` (CREATE), `backend/src/rerun/escalation.service.ts` (CREATE), `backend/src/rerun/routes-owner.ts` (CREATE), `backend/src/rerun/routes-eci.ts` (CREATE), `backend/src/elections/lineage.service.ts` (CREATE), `backend/src/elections/routes.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Track rerun deadline as 7 days from rerun-required timestamp.
2. Surface SLA status values: on-track, due-soon, breached.
3. Lock due-soon threshold to 48 hours before deadline.
4. Implement owner escalation ticket creation requiring category, note, and evidence reference.
5. Enforce ticket immutability after submit and append-only correction entries.
6. Restrict rerun execute endpoint to ECI role path only.
7. Expose lineage endpoint with parent-child and superseded context.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Confirm rerun and finalization outcome values are chain-derived only.
2. Ensure backend orchestration does not introduce policy contradictions with Foundry rules.

**Exit Criteria**:
- Rerun SLA status endpoint is deterministic and parity-aligned.
- Escalation ticket contract enforces immutability and required payload fields.
- ECI-only rerun execute path is enforced and audited.

---

### Phase 13 - Wallet Governance Status Contract

**Goal**: Implement deterministic wallet lock-state endpoint contracts for route-safety UX.

**Files Touched**: `backend/src/wallet-governance/wallet-status.service.ts` (CREATE), `backend/src/wallet-governance/routes.ts` (CREATE), `backend/src/roles/role-bootstrap.service.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement state derivation for wallet governance statuses.
2. Return deterministic states:
   - `WalletMismatchLocked`
   - `WalletSwitchPendingApproval`
   - `WalletSwitchApprovedAwaitingOnChainRebind`
   - `WalletSwitchRejected`
3. Ensure state cannot be derived from frontend env claims.
4. Attach audit events for governance state transitions.

**Exit Criteria**:
- Wallet status endpoint returns deterministic state contracts.
- Route protection can depend on backend-authenticated status only.
- State transition audit trail is complete.

---

### Phase 14 - Observer, Inbox, and Aggregate-Masking Surface

**Goal**: Implement observer anomaly modules, aggregate-only visibility, inbox priorities, and freshness-aware polling contracts.

**Files Touched**: `backend/src/observer/anomaly.service.ts` (CREATE), `backend/src/observer/routes.ts` (CREATE), `backend/src/inbox/inbox.service.ts` (CREATE), `backend/src/inbox/routes.ts` (CREATE), `backend/src/config/constants.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement anomaly create/list endpoints with role checks and rate limits.
2. Enforce observer masking contract with aggregate-only queue snapshots.
3. Implement inbox categories and priority levels.
4. Apply cursor-first pagination for inbox and observer list surfaces with offset fallback support.
5. Keep stable ordering key as `createdAt DESC, id DESC` and enforce invalid-cursor behavior.
6. Emit freshness contract metadata for polling-heavy routes.
7. Ensure degraded freshness state is explicitly derivable for UI safety.

**Exit Criteria**:
- Observer APIs never expose identity-linked document metadata.
- Inbox APIs return deterministic category and priority fields.
- Observer and inbox list endpoints follow pagination contract consistently.
- Freshness metadata is present on required routes.

---

### Phase 15 - Health, Readiness, Startup, Global Freshness, and Internal Cron Routes

**Goal**: Implement liveness/readiness/startup contracts, global freshness contract, and protected cron routes for recurring operations.

**Files Touched**: `backend/src/health/routes.ts` (CREATE), `backend/src/internal/cron/auth.middleware.ts` (CREATE), `backend/src/internal/cron/key-rotation.route.ts` (CREATE), `backend/src/internal/cron/kyc-purge.route.ts` (CREATE), `backend/src/internal/cron/reconcile.route.ts` (CREATE), `backend/vercel.json` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Implement `/health` as lightweight process liveness endpoint.
2. Implement `/ready` with dependency probes and failure semantics.
3. Implement `/startup` boot-completion and env/bootstrap checks.
4. Implement global freshness endpoint (`/api/v1/system/freshness`) returning `lastSyncedAt`, `nextPollAfterSec`, and `freshnessState`.
5. Use global freshness contract as deterministic source for KYC-submit degraded gating decisions.
6. Protect `/ready` and `/startup` using internal API key and optional IP allowlist.
7. Implement internal cron endpoints for key-rotation checks, purge, and reconciliation.
8. Configure `vercel.json` cron schedules for internal endpoints.

**Logical Hint (structure only, not full implementation)**:

```json
{
  "crons": [
    { "path": "/api/v1/internal/cron/key-rotation", "schedule": "*/30 * * * *" },
    { "path": "/api/v1/internal/cron/kyc-purge", "schedule": "15 2 * * *" },
    { "path": "/api/v1/internal/cron/reconcile-results", "schedule": "*/2 * * * *" }
  ]
}
```

**Exit Criteria**:
- Health endpoints return expected contracts by environment.
- Global freshness endpoint is available and contract-stable for frontend gating.
- Protected endpoints reject unauthorized requests.
- Cron routes execute with auditable job summaries.

---

### Phase 16 - Security Hardening and Abuse Control Layer

**Goal**: Integrate baseline and business-flow abuse controls with strict error and audit mapping.

**Files Touched**: `backend/src/config/security.ts` (UPDATE), `backend/src/middleware/rate-limit.ts` (CREATE), `backend/src/middleware/error-handler.ts` (CREATE), `backend/src/audit/audit.service.ts` (UPDATE), `backend/src/app.ts` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Add Helmet and secure header policies.
2. Add request body/multipart limits and safe parser defaults.
3. Add route-specific limits including locked abuse thresholds.
4. Enforce auth challenge lock policy: 5 failures then 15-minute lock per wallet and IP pair.
5. Enforce observer anomaly endpoint limit: 10 submissions per 15 minutes per wallet.
6. Add vote sequencing abuse defenses on token-create and cast loops.
7. Normalize error mapping with machine-readable codes and retryability hints.
8. Ensure all sensitive and privileged actions emit audit chain entries.

**Exit Criteria**:
- Security middleware stack is active in all protected routes.
- Abuse thresholds match locked policy values.
- Error responses remain normalized and deterministic.

---

### Phase 17 - Test Matrix Implementation

**Goal**: Implement complete unit, integration, security, and operational tests for backend behavior contracts.

**Files Touched**: `backend/test/unit/*` (CREATE), `backend/test/integration/*` (CREATE), `backend/test/security/*` (CREATE), `backend/test/operational/*` (CREATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Build unit tests for validators, middleware, idempotency, and crypto helpers.
2. Build integration tests for Prisma/Turso, Redis fallback, and R2 upload lifecycle.
3. Build security tests for auth replay, CSRF, rate limits, and CORS deny rules.
4. Build operational tests for readiness failures, cron auth, purge hold-flag behavior, and freshness transitions.
5. Add contract tests for pagination shape, invalid cursor errors, and offset fallback behavior.
6. Add vote-status reconciliation tests for timeout-uncertain flows and terminal-state resolution.
7. Build rerun-specific tests for ticket immutability and Admin/ECI split behavior.

**Exit Criteria**:
- All test suites pass in CI-equivalent configuration.
- Critical policy locks are covered by at least one automated test.
- No unresolved flaky test remains.

---

### Phase 18 - Staging Validation and Deployment Readiness

**Goal**: Validate backend behavior on preview/staging before production release.

**Files Touched**: `backend/scripts/smoke-local.mjs` (CREATE), `backend/scripts/smoke-preview.mjs` (CREATE), `backend/vercel.json` (UPDATE), `backend/.env.example` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Run local smoke suite covering auth, KYC submit, vote token flow, and readiness endpoints.
2. Deploy preview backend and run preview smoke suite.
3. Validate split-domain cookie/CSRF behavior with frontend preview origin.
4. Validate scan pending, scan outage, and finalize-bind fail-closed behavior.
5. Validate rerun SLA and escalation endpoint contracts.

**Exit Criteria**:
- Local and preview smoke suites pass.
- No blocking mismatch exists between expected and observed response contracts.
- Deployment env contract is fully documented.

---

### Phase 19 - Backend Runbook and Integration Handoff

**Goal**: Finalize backend README and integration notes for frontend and Foundry parity consumers.

**Files Touched**: `backend/README.md` (UPDATE), `backend/.env.example` (UPDATE), `EXP-6_BACKEND_PLAN.md` (UPDATE)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Document startup, test, and deployment commands.
2. Document env variable contract with examples and security warnings.
3. Document API envelope, freshness, and error-code contracts.
4. Document chain-parity constraints and rerun semantics for consumers.
5. Document known limitations and deferred items clearly.

**Exit Criteria**:
- README and env template align with implemented behavior.
- Integration contracts are explicit and unambiguous.
- No undocumented required env key remains.

**Phase 19 Execution Checkpoint (2026-04-10)**:
1. `backend/README.md` was created and aligned to implemented runtime, command matrix, API envelope, endpoint matrix, and strict preview smoke token workflow.
2. `backend/.env.example` was updated with optional signer-key placeholders and explicit strict-preview token contract notes.
3. Env-key parity was revalidated against direct `process.env` usage in backend source and smoke scripts; no undocumented required key remains.

---

### Phase 20 - Final Hygiene and Plan Lock

**Goal**: Close implementation planning cycle with clean repository state and final plan consistency checks.

**Files Touched**: `EXP-6_BACKEND_PLAN.md` (UPDATE), `backend/README.md` (VERIFY), `backend/package.json` (VERIFY), `backend/vercel.json` (VERIFY)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Re-run full test and smoke commands.
2. Verify no secrets are staged.
3. Verify plan and runbook reflect actual implemented contracts.
4. Recompute line count and finalize FILE_LENGTH_TAG.
5. Freeze deferred items and handoff notes.

**Exit Criteria**:
- Quality gates pass with clean final state.
- Plan reflects final backend architecture and locked policy decisions.
- FILE_LENGTH_TAG is revalidated using actual line count.

**Phase 20 Execution Checkpoint (2026-04-10)**:
1. Quality gates rerun and passed:
  - `npm run build` passed.
  - `npm test` passed (`23/23` tests).
  - strict local smoke passed with real auth bearer (`system freshness` included).
  - strict preview smoke passed with real auth bearer (`system freshness` included).
2. Hygiene checks passed:
  - `git status --short` clean after Phase 19 commit.
  - no secret-bearing files staged.
3. Plan and runbook lock check passed:
  - `backend/README.md`, `backend/package.json`, and `backend/vercel.json` verified against implemented contracts.
4. Line-count revalidation completed:
  - `EXP-6_BACKEND_PLAN.md` now at 1716 lines.
  - `FILE_LENGTH_TAG` remains `medium` and is now timestamped.
5. Deferred items are frozen under Section 9.2 for post-MVP carry-over.

---

## 4. Crucial Development Moments (CDM)

Read these before executing related phases. These are the highest-risk implementation moments.

---

#### CDM-1 - Split-domain Cookie Misconfiguration (Phase 5)

**Risk**: Refresh cookie silently fails due to incorrect SameSite/Secure/domain attributes.

**Why it matters**: Users appear logged out randomly and refresh flow becomes unstable.

**What to do**:
1. Validate cookie attributes in local, preview, and production separately.
2. Keep CSRF contract synchronized with cookie transport model.
3. Add integration test asserting refresh cookie round-trip.

**Common Mistake**: Reusing localhost cookie settings in preview/production.

---

#### CDM-2 - CSRF Contract Drift (Phase 5)

**Risk**: Mutating endpoints reject legitimate requests or accept untrusted requests.

**Why it matters**: Either usability breaks or security degrades.

**What to do**:
1. Lock CSRF token extraction and validation strategy early.
2. Apply CSRF middleware only where cookie-bound mutating routes require it.
3. Test positive and negative CSRF paths.

**Common Mistake**: Applying CSRF checks inconsistently across protected endpoints.

---

#### CDM-3 - Turso Fallback Scope Violation (Phase 5)

**Risk**: Fallback logic unintentionally creates new sessions in Turso during Redis outage.

**Why it matters**: Security assumptions and revocation consistency can break.

**What to do**:
1. Restrict fallback to existing-session continuity only.
2. Reject new session creation if primary cache is unavailable.
3. Log fallback transitions with explicit reason codes.

**Common Mistake**: Implementing broad fallback that ignores session-class distinctions.

---

#### CDM-4 - EPIC Canonicalization Drift (Phase 7)

**Risk**: Mixed-case or separator variations bypass duplicate checks.

**Why it matters**: Duplicate identity prevention can fail silently.

**What to do**:
1. Normalize EPIC before all validations and hashing.
2. Validate with strict canonical regex after normalization.
3. Test edge inputs with spaces, separators, and mixed case.

**Common Mistake**: Running duplicate checks on unnormalized values.

---

#### CDM-5 - Aadhaar Checksum Under-Validation (Phase 7)

**Risk**: Format-only validation accepts invalid Aadhaar numbers.

**Why it matters**: Identity trust quality drops and fraud risk increases.

**What to do**:
1. Enforce normalize + regex + Verhoeff checksum chain.
2. Keep checksum test vectors in unit suite.
3. Distinguish checksum vs format errors in API response codes.

**Common Mistake**: Treating checksum as optional warning in MVP.

---

#### CDM-6 - Candidate Rule Bypass (Phase 7)

**Risk**: Candidate submissions pass with Aadhaar-only fallback.

**Why it matters**: Locked candidate integrity policy is violated.

**What to do**:
1. Enforce mandatory EPIC + Aadhaar for candidate path.
2. Keep voter-only Aadhaar fallback path isolated.
3. Add role-aware route tests to prevent policy crossover.

**Common Mistake**: Reusing voter validator for candidate workflows.

---

#### CDM-7 - Finalize-bind Security Gap (Phase 8)

**Risk**: Uploaded objects are bound without checksum integrity verification.

**Why it matters**: File tampering or accidental mismatch can pass silently.

**What to do**:
1. Require checksum at finalize-bind.
2. Reject mismatch with deterministic conflict response.
3. Audit failed finalize attempts.

**Common Mistake**: Trusting upload completion event without integrity checks.

---

#### CDM-8 - Scan-Outage Fail-Open (Phase 8)

**Risk**: Finalize-bind succeeds while scanner is unavailable.

**Why it matters**: Security baseline agreed with user is violated.

**What to do**:
1. Detect scan-service availability during finalize-bind.
2. Reject finalize when scanner is unavailable.
3. Provide explicit remediation instructions in response payload.

**Common Mistake**: Allowing temporary fail-open mode for convenience.

---

#### CDM-9 - Queue Tie-break Non-determinism (Phase 9)

**Risk**: Concurrent submissions produce unstable review ordering.

**Why it matters**: Fairness and auditability claims break.

**What to do**:
1. Apply submittedAt + monotonic sequence ordering.
2. Persist sequence marker atomically.
3. Test concurrent inserts with deterministic assertions.

**Common Mistake**: Assuming database insertion order is stable across retries.

---

#### CDM-10 - Freshness Contract Inconsistency (Phase 10)

**Risk**: Polling routes return inconsistent freshness metadata.

**Why it matters**: Frontend action gating can break in degraded states.

**What to do**:
1. Enforce freshness fields on all required list/detail routes.
2. Validate transitions among fresh, stale, and degraded states.
3. Add operational tests for dependency lag scenarios.

**Common Mistake**: Returning freshness metadata only on selected routes.

---

#### CDM-11 - Vote Idempotency Payload Conflict Blindness (Phase 11)

**Risk**: Same dedupe key with different payload is treated as valid retry.

**Why it matters**: Vote intent integrity and replay safety are compromised.

**What to do**:
1. Persist payload hash with dedupe key.
2. Reject mismatched replay as conflict.
3. Return deterministic conflict code and recovery guidance.

**Common Mistake**: Using dedupe key presence alone as retry success condition.

---

#### CDM-12 - Premature Relay Success Reporting (Phase 11)

**Risk**: Backend reports success before chain confirmation.

**Why it matters**: Users may believe vote is finalized when it is not.

**What to do**:
1. Separate submitted, confirmed, failed, and expired states.
2. Require tx evidence before terminal success response.
3. Expose state transitions in inbox and vote-history contracts.

**Common Mistake**: Mapping provider submit-ack to final success.

---

#### CDM-13 - Escalation Ticket Mutability Regression (Phase 12)

**Risk**: Submitted escalation tickets can be edited in place.

**Why it matters**: Governance audit trail can be tampered.

**What to do**:
1. Mark ticket immutable after creation.
2. Support append-only corrections as separate records.
3. Enforce immutable constraints at service and DB levels.

**Common Mistake**: Allowing patch updates to ticket body for convenience.

---

#### CDM-14 - Protected Ops Endpoint Exposure (Phase 15)

**Risk**: `/ready` and `/startup` become publicly accessible.

**Why it matters**: Internal diagnostics and dependency posture leak externally.

**What to do**:
1. Gate endpoints with internal API key contract.
2. Optionally enforce IP allowlist in production.
3. Add security tests for unauthorized access.

**Common Mistake**: Treating readiness endpoints as harmless public probes.

---

#### CDM-15 - Abuse Control Drift from Locked Thresholds (Phase 16)

**Risk**: Runtime limits diverge from agreed values during refactors.

**Why it matters**: Rate-control behavior becomes unpredictable and can be exploited.

**What to do**:
1. Keep threshold constants centralized and versioned.
2. Add tests for hard limits and lock windows.
3. Track threshold values in release notes and config diff checks.

**Common Mistake**: Hardcoding limits in multiple middleware files.

---

#### CDM-16 - Pagination Cursor Contract Drift (Phases 10 and 14)

**Risk**: List endpoints return inconsistent pagination fields or non-stable ordering across retries.

**Why it matters**: Frontend pagination state becomes non-deterministic and can duplicate or skip records.

**What to do**:
1. Keep cursor-first envelope shape consistent across election, inbox, and observer list endpoints.
2. Enforce stable ordering key exactly as `createdAt DESC, id DESC` before cursor encoding.
3. Return `400 PAGINATION_CURSOR_INVALID` for malformed/expired cursors and include offset fallback guidance.

**Common Mistake**: Reusing endpoint-specific custom cursor formats without shared decoder/validator.

---

#### CDM-17 - Vote Timeout Reconciliation Bypass (Phase 11)

**Risk**: Client recasts immediately after timeout uncertainty without checking previous relay outcome.

**Why it matters**: Duplicate-intent behavior and user trust degrade under network or RPC instability.

**What to do**:
1. Treat `timeout-uncertain` as non-terminal and require status lookup before recast.
2. Enforce deterministic lookup-key precedence: `voteIntentId` first, then `wallet + electionId + clientNonce`.
3. Keep terminal states fixed (`confirmed`, `failed`, `expired`, `conflict`) and return explicit retry windows.

**Common Mistake**: Mapping transport timeout to immediate failed terminal state.

---

## 5. Manual Execution Tasks (MET)

These tasks require explicit human action and cannot be fully automated safely.

---

### MET-1 - Backend Dependency Install and Version Capture (before Phase 2)

1. Install backend dependencies in `Exp-6/backend`.
2. Capture exact installed versions for critical packages.
3. Save version snapshot in local implementation notes.

---

### MET-2 - Turso Provision and Access Validation (before Phase 4)

1. Verify Turso database `dvotemain` is reachable using configured URL/token.
2. Confirm token scope grants required read/write capabilities.
3. Validate migration command path against current schema baseline.

---

### MET-3 - Upstash Redis Provision and TTL Probe (before Phase 4)

1. Verify Upstash REST URL and token are configured.
2. Perform set/get/expire/ttl smoke operations manually.
3. Confirm TTL semantics align with session expectations.

---

### MET-4 - Cloudflare R2 Credential and Bucket Probe (before Phase 4)

1. Verify bucket exists and credentials are valid.
2. Perform presigned PUT then verify object read path.
3. Ensure public bucket access remains disabled.

---

### MET-5 - Split-domain Cookie and CSRF Trial (before Phase 5 close)

1. Run frontend and backend on separate local origins.
2. Execute login and refresh cycle.
3. Verify cookie attributes and CSRF token flow via browser devtools.
4. Confirm unauthorized CSRF attempts fail.

---

### MET-6 - Identity Validation Drill (before Phase 7 close)

1. Test EPIC valid sample: `ABC1234567`.
2. Test EPIC invalid cases: lowercase, wrong length, illegal chars.
3. Test Aadhaar normalized valid sample and invalid checksum sample.
4. Confirm candidate path rejects if EPIC or Aadhaar missing.

---

### MET-7 - Aadhaar-only Voter Fallback Drill (before Phase 7 close)

1. Submit voter KYC with EPIC unavailable declaration.
2. Provide reason code and additional evidence artifact.
3. Verify fallback flags and traceability fields are persisted.
4. Verify response and review queue tagging are correct.

---

### MET-8 - Upload Lifecycle and Scan Gate Drill (before Phase 8 close)

1. Create upload authorization and wait for expiry to test stale behavior.
2. Finalize valid upload with matching checksum.
3. Force checksum mismatch and verify deterministic rejection.
4. Simulate scanner outage and verify finalize-bind fail-closed behavior.

---

### MET-9 - Queue Concurrency Fairness Drill (before Phase 9 close)

1. Submit multiple KYC records in same constituency/election rapidly.
2. Confirm ordering uses submittedAt + monotonic sequence.
3. Capture ordering evidence for review.

---

### MET-10 - Vote Token Expiry and Replay Drill (before Phase 11 close)

1. Request vote token and intentionally let it expire.
2. Confirm cast request requires fresh token and restart.
3. Replay same dedupe key with changed payload to verify conflict contract.

---

### MET-11 - Rerun Escalation Governance Drill (before Phase 12 close)

1. Raise escalation ticket as Admin with mandatory fields.
2. Attempt ticket mutation and confirm immutability enforcement.
3. Execute rerun action via ECI-only path.

---

### MET-12 - Observer Masking Drill (before Phase 14 close)

1. Query observer queue endpoints.
2. Verify only aggregate counts/trends are visible.
3. Verify no identity-linked document metadata leaks.

---

### MET-13 - Ops Endpoint Protection Drill (before Phase 15 close)

1. Call `/health` publicly and verify liveness response.
2. Call `/ready` and `/startup` without internal key and confirm rejection.
3. Call with valid internal key and confirm expected behavior.

---

### MET-14 - Retention Purge Hold-Flag Drill (before Phase 15 close)

1. Mark one election with hold flag and one without.
2. Run purge cron route manually in controlled environment.
3. Confirm held election artifacts are retained and non-held are purged.
4. Verify immutable purge audit summary is emitted.

---

### MET-15 - Preview Deployment Validation (before Phase 18 close)

1. Deploy backend preview build.
2. Run preview smoke suite.
3. Verify split-domain auth and CORS behavior against frontend preview origin.
4. Capture issues and resolve before production rollout.

---

### MET-16 - Pagination Contract Validation Drill (before Phase 14 close)

1. Call elections and inbox list endpoints with cursor mode and capture response envelope.
2. Use returned `nextCursor` and verify stable ordering remains `createdAt DESC, id DESC`.
3. Send malformed cursor and verify `400 PAGINATION_CURSOR_INVALID` with offset fallback guidance.
4. Execute offset fallback call and confirm deterministic continuation behavior.

---

### MET-17 - Vote Timeout Status Reconciliation Drill (before Phase 11 close)

1. Simulate relay timeout uncertainty and capture `voteIntentId` from cast response.
2. Query vote-status endpoint using `voteIntentId`, then tuple fallback (`wallet + electionId + clientNonce`).
3. Confirm non-terminal states remain lookup-only and terminal states match contract.
4. Verify frontend guidance can safely block immediate recast until terminal state or lookup window policy completion.

---

## 6. Verification Checklist

Complete all items before declaring backend implementation complete.

### 6.1 Build and Static Gates

- [ ] `npm run build` in `backend/` exits 0.
- [ ] Lint and format checks pass (if configured).
- [ ] TypeScript strict mode passes without unresolved type errors.

### 6.2 Auth and Session Gates

- [ ] Challenge/verify login path works for valid EOA wallet signatures.
- [ ] Unsupported contract-wallet login path returns deterministic unsupported response.
- [ ] Refresh-token rotation and family revocation behaviors are verified.
- [ ] 30-minute inactivity timeout is enforced.
- [ ] CSRF checks pass for valid tokens and fail for invalid/missing tokens.

### 6.3 Identity and KYC Gates

- [ ] EPIC canonical validation is enforced (`^[A-Z]{3}[0-9]{7}$`).
- [ ] Aadhaar canonical validation and Verhoeff checksum are enforced.
- [ ] Candidate KYC requires both EPIC and Aadhaar.
- [ ] Voter Aadhaar-only fallback enforces reason code and additional evidence.
- [ ] Sensitive identity fields remain encrypted at rest.

### 6.4 Upload and Scan Gates

- [ ] Upload authorize TTL is fixed to 10 minutes.
- [ ] Upload size limits are enforced exactly: documents <= 10 MB, profile photo <= 5 MB.
- [ ] Expired upload contract is rejected deterministically.
- [ ] Finalize-bind enforces checksum validation.
- [ ] Oversize file submissions return deterministic validation errors.
- [ ] Scanner outage causes finalize-bind rejection (fail-closed).
- [ ] KYC submit is allowed with pending-scan status.

### 6.5 Queue and Review Gates

- [ ] Queue ordering is deterministic with submittedAt + monotonic sequence.
- [ ] Review actions persist actor, reason, evidence, and timestamp.
- [ ] Sensitive records are append-only after election open state.

### 6.6 Election and Result Parity Gates

- [ ] Election and result routes emit freshness metadata.
- [ ] List routes emit cursor-first pagination envelope with offset fallback fields.
- [ ] Stable ordering key for pagination is `createdAt DESC, id DESC`.
- [ ] Invalid/expired cursor returns `400 PAGINATION_CURSOR_INVALID` deterministically.
- [ ] Finalization outcome enums match chain-derived values.
- [ ] Reconciliation workflow converges drift to chain truth.

### 6.7 Vote Relay and Idempotency Gates

- [ ] Vote token TTL is 60 seconds and enforced.
- [ ] Expired token requires fresh token and cast restart.
- [ ] `clientNonce` is validated as UUID v7 and invalid format returns deterministic `422`.
- [ ] Dedupe payload conflicts return deterministic `409` behavior.
- [ ] Vote-status lookup endpoint supports `voteIntentId` and tuple fallback lookup keys.
- [ ] Terminal states are fixed as `confirmed`, `failed`, `expired`, and `conflict`.
- [ ] Timeout-uncertain responses include deterministic lookup and retry guidance contract.
- [ ] Relay lifecycle states are persisted through terminal outcomes.

### 6.8 Rerun and Governance Gates

- [ ] Rerun SLA timer is 7 days and due-soon threshold is 48 hours.
- [ ] Escalation ticket requires category + note + evidence reference.
- [ ] Escalation ticket is immutable after submit.
- [ ] ECI-only rerun execute endpoint is enforced.

### 6.9 Observer and Inbox Gates

- [ ] Observer endpoints expose aggregate-only contracts.
- [ ] Inbox categories and priority fields are emitted correctly.
- [ ] Freshness state transitions (`fresh`, `stale`, `degraded`) are test-validated.
- [ ] Degraded freshness state can be consumed deterministically for KYC-submit gating.

### 6.10 Ops and Cron Gates

- [ ] `/health` responds with liveness contract.
- [ ] `/ready` and `/startup` are protected.
- [ ] `/api/v1/system/freshness` returns `lastSyncedAt`, `nextPollAfterSec`, and `freshnessState`.
- [ ] Cron routes execute with internal auth and auditable summaries.
- [ ] Purge workflow respects hold-flag exception policy.

### 6.11 Security and Abuse Gates

- [ ] Helmet and secure headers are active.
- [ ] Flow-specific limits match locked thresholds.
- [ ] Auth lock policy (5 failures then 15-minute lock) is enforced.
- [ ] Observer anomaly limit (10 per 15 minutes) is enforced.
- [ ] No secrets are tracked in git.

### 6.12 Documentation and Plan Gates

- [ ] Backend README aligns with real scripts and behavior.
- [ ] `.env.example` includes all required placeholders.
- [ ] Deferred items are clearly documented.
- [ ] FILE_LENGTH_TAG is revalidated against actual line count.

---

## 7. Known Issues and Fixes

### Issue-1 - Vercel Express Entry Misconfiguration

**Symptom**: Preview deployment returns 404 or function runtime mismatch.

**Root Cause**: Entry export contract or route mapping in `vercel.json` is incorrect.

**Fix**:

```bash
cd Exp-6/backend
npm run build
vercel dev
```

Verify app export path and route mapping align.

---

### Issue-2 - Prisma Adapter-libsql Initialization Errors

**Symptom**: Prisma client fails to initialize in runtime.

**Root Cause**: Incorrect adapter options or missing Turso auth token.

**Fix**:

```bash
cd Exp-6/backend
npm i prisma @prisma/client @prisma/adapter-libsql @libsql/client
npx prisma generate
```

Validate env keys and adapter wiring.

---

### Issue-3 - Migration Workflow Drift with Turso

**Symptom**: Local schema and remote schema diverge unexpectedly.

**Root Cause**: Mixed migration commands without controlled migration source of truth.

**Fix**:

```bash
cd Exp-6/backend
npx prisma migrate dev --name init
npx prisma generate
```

Adopt single migration workflow and document it clearly.

---

### Issue-4 - Upstash Session TTL Inconsistency

**Symptom**: Sessions expire too early or never expire.

**Root Cause**: TTL units or key-expire operations are misapplied.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "session ttl"
```

Validate set/expire/ttl behavior with explicit tests.

---

### Issue-5 - R2 Presigned URL Signature Errors

**Symptom**: Upload fails with signature mismatch.

**Root Cause**: Wrong endpoint format or credential mismatch.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "r2 presign"
```

Ensure endpoint uses account-scoped R2 hostname and valid keys.

---

### Issue-6 - CSRF Failures in Split-domain Preview

**Symptom**: Mutating requests fail in preview while local works.

**Root Cause**: Cookie and CSRF settings differ across environments.

**Fix**:

```bash
cd Exp-6/backend
npm run smoke:preview
```

Re-check SameSite/Secure/domain settings and frontend origin mapping.

---

### Issue-7 - EPIC/Aadhaar False Rejections After Normalization

**Symptom**: Valid identities rejected unexpectedly.

**Root Cause**: Inconsistent normalization prior to regex/checksum validation.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "identity canonical"
```

Ensure normalize-then-validate path is used in all identity inputs.

---

### Issue-8 - Dedupe Conflict Behavior Not Deterministic

**Symptom**: Same dedupe key produces inconsistent response contracts.

**Root Cause**: Missing payload-hash persistence or race handling.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "vote dedupe"
```

Enforce atomic dedupe operations and deterministic conflict mapping.

---

### Issue-9 - Cursor Pagination Drift Across List Endpoints

**Symptom**: Elections, inbox, or observer list pages skip/duplicate records when advancing pages.

**Root Cause**: Cursor encoding or decoding is inconsistent with stable ordering key.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "pagination cursor"
```

Re-validate shared cursor codec and lock ordering to `createdAt DESC, id DESC`.

---

### Issue-10 - Invalid Cursor Returns Generic Error

**Symptom**: Malformed cursor causes unhelpful 500/400 responses without fallback guidance.

**Root Cause**: Invalid-cursor branch bypasses normalized error mapper.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "PAGINATION_CURSOR_INVALID"
```

Enforce deterministic `400 PAGINATION_CURSOR_INVALID` and include offset fallback fields.

---

### Issue-11 - Vote Timeout Uncertainty Leaves Client in Recast Loop

**Symptom**: Timeout path allows immediate recast without checking prior relay outcome.

**Root Cause**: Missing status lookup contract or missing key precedence in vote-status endpoint.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "vote status lookup"
```

Require `voteIntentId`-first lookup flow, tuple fallback, and non-terminal timeout guidance.

---

### Issue-12 - `clientNonce` Rejected Despite Valid Intent

**Symptom**: Legitimate vote attempts fail nonce validation intermittently.

**Root Cause**: UUID parser mismatch or UUID version checks not pinned to v7.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "client nonce uuidv7"
```

Pin validator behavior to UUID v7 and reject all non-v7 formats with deterministic `422`.

---

### Issue-13 - Upload Size Limit Mismatch with Frontend Contract

**Symptom**: Backend accepts files above frontend limits or rejects valid boundary sizes.

**Root Cause**: Size constants differ between authorize and finalize checks.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "upload size limits"
```

Lock constants to docs 10 MB and profile photo 5 MB in both authorize and finalize flows.

---

### Issue-14 - KYC Gating Ambiguity During Degraded Freshness

**Symptom**: Frontend cannot determine whether KYC submit should be blocked during degraded periods.

**Root Cause**: Global freshness endpoint missing fields or unstable contract.

**Fix**:

```bash
cd Exp-6/backend
npm run test -- --grep "system freshness"
```

Stabilize `/api/v1/system/freshness` contract and verify deterministic degraded-state signaling.

---

## 8. Security Reminders

These rules are non-negotiable for backend implementation and review acceptance.

1. Never commit `.env` or secret-bearing files.
2. Never log raw Aadhaar or EPIC values.
3. Enforce strict CORS allowlist with no production wildcard origins.
4. Keep `/ready` and `/startup` protected and never expose without internal auth.
5. Keep scan outage behavior fail-closed for finalize-bind.
6. Keep escalation tickets immutable after submit.
7. Use append-only compensating records after election-open for sensitive fields.
8. Keep token rotation and revocation checks mandatory in protected route middleware.
9. Keep dedupe-key and payload-hash checks mandatory in vote relay path.
10. Preserve observer aggregate-only policy and avoid identity metadata leakage.
11. Keep encryption key-ring handling explicit and auditable.
12. Run staged diff reviews before every commit.

---

## 9. Git Commit Checkpoints

Commit at phase boundaries only after exit criteria pass.

| Checkpoint | After Completing | Suggested Commit Message |
|---|---|---|
| CP-1 | Phase 1 | `chore(exp-6): lock backend dependency and research baseline` |
| CP-2 | Phase 2 | `feat(exp-6): scaffold backend workspace and ts baseline` |
| CP-3 | Phase 3 | `feat(exp-6): add backend env contract and app bootstrap` |
| CP-4 | Phase 4 | `feat(exp-6): wire prisma turso redis and r2 clients` |
| CP-5 | Phase 5 | `feat(exp-6): implement auth challenge rotation csrf session model` |
| CP-6 | Phase 6 | `feat(exp-6): add role bootstrap and rbac middleware` |
| CP-7 | Phase 7 | `feat(exp-6): implement identity canonicalization and kyc privacy pipeline` |
| CP-8 | Phase 8 | `feat(exp-6): implement upload authorize finalize and scan contract` |
| CP-9 | Phase 9 | `feat(exp-6): add deterministic kyc queue and review audit chain` |
| CP-10 | Phase 10 | `feat(exp-6): add election mirror reconciliation and freshness contracts` |
| CP-11 | Phase 11 | `feat(exp-6): implement vote token idempotency and relay orchestration` |
| CP-12 | Phase 12 | `feat(exp-6): implement rerun sla and immutable escalation flow` |
| CP-13 | Phase 13 | `feat(exp-6): add wallet governance status endpoint contract` |
| CP-14 | Phase 14 | `feat(exp-6): add observer anomalies and inbox masking contracts` |
| CP-15 | Phase 15 | `feat(exp-6): add health readiness startup and protected cron routes` |
| CP-16 | Phase 16 | `fix(exp-6): enforce security hardening and abuse controls` |
| CP-17 | Phase 17 | `test(exp-6): add backend unit integration security operational suites` |
| CP-18 | Phase 18 | `exp(exp-6): validate preview deployment and smoke workflows` |
| CP-19 | Phase 19 | `docs(exp-6): finalize backend runbook and env contract docs` |
| CP-20 | Phase 20 | `chore(exp-6): lock backend plan and final hygiene checks` |

### 9.1 Commit Hygiene Rules

1. Do not commit while tests are failing.
2. Do not combine unrelated refactors in checkpoint commits.
3. Keep commit scope as `exp-6`.
4. Verify staged diff for secrets before every push.

### 9.2 Deferred Items Register (Post-MVP)

1. External KMS integration for encryption keys.
2. WebSocket/SSE real-time transport replacing polling-first baseline.
3. Advanced fraud scoring and anomaly ranking.
4. Extended compliance automation for candidate legal documents.
5. Multi-region write strategy beyond current Turso/cache topology.

### 9.3 Plan Completion Declaration

This backend plan is complete when sections 0-9 are finalized, phase exit criteria are passed,
verification checklist items are complete, and FILE_LENGTH_TAG is revalidated by actual line count.