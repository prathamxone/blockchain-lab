# DVote Backend Runbook (Exp-6)

Status: Phase 19 runbook finalized for MVP backend handoff

This document is the operational reference for local development, preview validation, and deployment-safe execution of the DVote backend in Exp-6.

## 1. Scope and Runtime

- Runtime: Node.js 22.x
- Framework: Express 5 + TypeScript (ESM)
- Data: Turso (Prisma + libsql adapter), Upstash Redis, Cloudflare R2
- Deployment: Vercel Node runtime with protected cron endpoints
- Canonical truth rule: Foundry on-chain outcomes are authoritative for election/result finality

## 2. Backend Layout

- `src/` API modules, middleware, services, and contracts
- `prisma/` schema and generation config
- `scripts/` smoke checks and environment utilities
- `test/` unit, integration, security, and operational suites
- `vercel.json` cron schedule declarations

## 3. Prerequisites

1. Node.js 22.x
2. npm 10+
3. Turso URL/token
4. Upstash Redis REST URL/token
5. Cloudflare R2 account and S3-compatible credentials
6. Sepolia RPC endpoint

## 4. Local Bootstrap

Run from `Exp-6/backend`:

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run build
npm run dev
```

Recommended baseline check:

```bash
npm run check:deps
```

## 5. Environment Contract

The backend fails fast on invalid or missing required environment variables via `src/config/env.ts`.

### 5.1 Required Groups

1. Runtime and API
   - `NODE_ENV`, `PORT`, `API_BASE_PATH`
   - `FRONTEND_ORIGINS`, `CORS_ALLOW_CREDENTIALS`
2. Auth and session security
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`
   - `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`, `SESSION_IDLE_TIMEOUT_SEC`
3. Internal protection
   - `INTERNAL_API_KEY`, `CRON_SECRET`, optional `READY_IP_ALLOWLIST`
4. Data and storage
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_REGION`
5. KYC and crypto
   - `KYC_ENC_ACTIVE_KEY_VERSION`, `KYC_ENC_KEY_V1_BASE64`, optional `KYC_ENC_KEY_V2_BASE64`
   - `KYC_HASH_SALT`, `SCAN_ADAPTER_ENABLED`
6. Chain and policy
   - `CHAIN_ID`, `RPC_URL`
   - `UPLOAD_CONTRACT_TTL_SEC`, `UPLOAD_DOC_MAX_BYTES`, `UPLOAD_PROFILE_MAX_BYTES`
   - `VOTE_TOKEN_TTL_SEC`, `VOTE_TIMEOUT_LOOKUP_WINDOW_SEC`
7. Smoke helpers
   - `SMOKE_LOCAL_BASE_URL`, `SMOKE_LOCAL_AUTH_BEARER`
   - `SMOKE_PREVIEW_BASE_URL`, `SMOKE_PREVIEW_BEARER_TOKEN`, `SMOKE_PREVIEW_AUTH_BEARER`

### 5.2 Secret Generation

Generate secure values quickly:

```bash
npm run env:secrets
```

Apply generated values directly into `.env`:

```bash
npm run env:secrets:apply
```

OpenSSL fallback examples are also documented in `.env.example`.

### 5.3 Security Rules

1. Never commit `.env` or secret-bearing files.
2. Rotate JWT, CSRF, internal API, and cron secrets before production rollout.
3. Keep `CRON_SECRET` independent from user-facing auth secrets.
4. Keep `INTERNAL_API_KEY` separate from cron and application auth tokens.

## 6. Command Matrix

Run from `Exp-6/backend`.

```bash
# Development
npm run dev

# Build and type safety
npm run build
npm run typecheck

# Full tests
npm test

# Test subsets
npm run test:unit
npm run test:integration
npm run test:security
npm run test:operational

# Smoke checks
npm run smoke:local
npm run smoke:preview
```

## 7. API Envelope Contract

All endpoints return normalized envelopes.

Success shape:

```json
{
  "ok": true,
  "requestId": "...",
  "data": {}
}
```

Error shape:

```json
{
  "ok": false,
  "requestId": "...",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "retryability": "non-retryable"
  }
}
```

Common codes:
- `VALIDATION_ERROR`
- `PAGINATION_CURSOR_INVALID`
- `CLIENT_NONCE_INVALID_FORMAT`
- `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`
- `CONFLICT`, `UNPROCESSABLE`, `RATE_LIMITED`
- `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`

## 8. Auth and Session Contracts

1. Login flow: challenge and verify with EOA signature.
2. Access token: short-lived bearer token.
3. Refresh token: rotating family in HttpOnly cookie.
4. CSRF token: required for refresh/logout (`x-csrf-token` must match csrf cookie).
5. Session timeout: inactivity-based 30 minutes.
6. Redis fallback policy: existing-session continuity only.

## 9. Ops and Security Controls

1. `/health` is public liveness.
2. `/ready` and `/startup` require `x-internal-api-key` and optional allowlisted source IP.
3. Internal cron endpoints require `Authorization: Bearer CRON_SECRET`.
4. Security middleware includes Helmet, request limits, normalized errors, and flow-specific abuse controls.
5. Locked abuse thresholds:
   - Auth verify lock: 5 failed attempts, 15-minute lock window per wallet+IP.
   - Anomaly route: 10 submissions per 15 minutes per wallet.
   - Vote routes: 3 requests/min per wallet.

## 10. Endpoint Matrix (MVP)

Base API namespace: `/api/v1`

| Family | Routes | Auth Contract |
|---|---|---|
| Public health | `GET /health` | Public |
| Protected health | `GET /ready`, `GET /startup` | `x-internal-api-key` (+ optional IP allowlist) |
| Auth | `POST /auth/challenge`, `POST /auth/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Challenge/verify public, refresh/logout use CSRF, `/auth/me` bearer auth |
| Owner test | `GET /owner/ping` | Bearer auth + owner role |
| Uploads | `POST /uploads/authorize`, `POST /uploads/finalize` | Bearer auth |
| KYC | `POST /kyc/submissions`, `POST /kyc/submissions/:submissionId/submit`, `GET /kyc/me` | Bearer auth |
| Owner KYC | `GET /owner/kyc/queue`, `POST /owner/kyc/:submissionId/decision` | Bearer auth + owner role |
| Elections/results | `GET /elections`, `GET /elections/:electionId`, `GET /results`, `GET /results/:electionId`, `GET /elections/:electionId/lineage`, `GET /elections/:electionId/rerun/status` | Bearer auth |
| Votes | `POST /votes/token`, `POST /votes/cast`, `GET /votes/status` | Bearer auth + vote route limiter |
| Rerun owner | `POST /owner/elections/:electionId/rerun/escalation-ticket` | Bearer auth + ADMIN role |
| Rerun ECI | `POST /eci/elections/:electionId/rerun/execute` | Bearer auth + ECI role |
| Wallet governance | `GET /wallet/status` | Bearer auth |
| Observer | `POST /observer/anomalies`, `GET /observer/anomalies` | Bearer auth + observer/owner roles |
| Inbox | `GET /inbox`, `POST /inbox/:notificationId/read` | Bearer auth |
| Freshness | `GET /system/freshness` | Bearer auth |
| Internal cron | `/internal/cron/key-rotation`, `/internal/cron/kyc-purge`, `/internal/cron/reconcile-results` | `Authorization: Bearer CRON_SECRET` |

## 11. Strict Preview Smoke with Real Access Token

Important contract:

1. `SMOKE_PREVIEW_AUTH_BEARER` must be a real JWT access token issued by `POST /api/v1/auth/verify`.
2. Random values (for example OpenSSL base64 blobs) will fail protected freshness checks.

### 11.1 Generate a Real Preview Access Token

Use wallet challenge and signature verify flow (example for admin wallet):

```bash
cd Exp-6/backend

node --input-type=module <<'NODE'
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

loadEnv({ path: "../.env" });
loadEnv({ path: ".env" });

const baseUrl = (process.env.SMOKE_PREVIEW_BASE_URL || "").replace(/\/+$/, "");
const apiBase = process.env.API_BASE_PATH || "/api/v1";
const wallet = process.env.ADMIN_WALLET;
const pkRaw = process.env.ADMIN_PRIVATE_KEY;
const chainId = Number(process.env.CHAIN_ID || "11155111");

if (!wallet || !pkRaw) throw new Error("ADMIN_WALLET/ADMIN_PRIVATE_KEY missing");

const privateKey = pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`;
const account = privateKeyToAccount(privateKey);

const challengeRes = await fetch(`${baseUrl}${apiBase}/auth/challenge`, {
   method: "POST",
   headers: { "content-type": "application/json", accept: "application/json" },
   body: JSON.stringify({ wallet, chainId })
});
const challenge = await challengeRes.json();
if (!challengeRes.ok) throw new Error(`challenge failed ${challengeRes.status}`);

const signature = await account.signMessage({ message: challenge.data.message });

const verifyRes = await fetch(`${baseUrl}${apiBase}/auth/verify`, {
   method: "POST",
   headers: { "content-type": "application/json", accept: "application/json" },
   body: JSON.stringify({
      wallet,
      chainId,
      challengeId: challenge.data.challengeId,
      signature
   })
});
const verify = await verifyRes.json();
if (!verifyRes.ok) throw new Error(`verify failed ${verifyRes.status}`);

fs.writeFileSync("/tmp/dvote_preview_access_token.txt", verify.data.accessToken, { mode: 0o600 });
console.log("preview access token generated");
NODE
```

### 11.2 Run Strict Preview Smoke

```bash
cd Exp-6/backend
TOKEN="$(cat /tmp/dvote_preview_access_token.txt)"

SMOKE_PREVIEW_BEARER_TOKEN="$TOKEN" \
SMOKE_PREVIEW_AUTH_BEARER="$TOKEN" \
DOTENV_CONFIG_PATH=.env \
node -r dotenv/config scripts/smoke-preview.mjs
```

## 12. Deployment Notes

1. Keep Node engine aligned to `22.x`.
2. `npm run build` includes Prisma generate before TypeScript compile.
3. `vercel.json` declares cron schedules; route auth must still validate `CRON_SECRET`.
4. Keep frontend and backend domains explicitly listed in `FRONTEND_ORIGINS`.
5. Always run preview smoke before production promotion.

## 13. Deferred Items (Post-MVP)

1. External KMS integration for encryption key management.
2. Realtime channels (SSE/WebSocket) beyond polling-first contracts.
3. Advanced anomaly ranking and fraud scoring.
4. Multi-region write strategy beyond current Turso/cache topology.

