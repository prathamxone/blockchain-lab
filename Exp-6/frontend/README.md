# DVote Frontend — Setup, Scripts, and Troubleshooting

## Overview

DVote is a decentralized voting application mimicking the Indian ECI workflow.
The frontend is a React 18 + TypeScript + Vite 7 SPA with RainbowKit wallet
connectors, wagmi/viem for chain interaction, and shadcn/ui for components.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Variables](#environment-variables)
4. [Scripts](#scripts)
5. [Route Architecture](#route-architecture)
6. [Role-Based Access](#role-based-access)
7. [Testing](#testing)
8. [Vercel Deployment](#vercel-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** ≥ 20.x (check with `node -v`)
- **pnpm** ≥ 9.x (install: `npm install -g pnpm`)
- **Wallet**: MetaMask, Coinbase Wallet, or WalletConnect-compatible wallet
- **Backend**: DVote backend running on `http://localhost:3000` (or set `VITE_API_BASE_URL`)

---

## Installation

```bash
# Navigate to frontend directory
cd Exp-6/frontend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
```

---

## Environment Variables

Create `.env.local` in `Exp-6/frontend/` with the following keys:

```env
# --- API ---
VITE_API_BASE_URL=http://localhost:3000

# --- Wallet Connect (RainbowKit) ---
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# --- Wallet Connect Chains ---
VITE_CHAIN_ID=11155111          # Sepolia testnet
VITE_CHAIN_NAME=Sepolia

# --- Vercel Deployment ---
VITE_DEPLOY_URL=https://your-app.vercel.app
```

### Obtaining `VITE_WALLETCONNECT_PROJECT_ID`

1. Go to https://cloud.walletconnect.com/
2. Create a new project (Dashboard → New Project → Web3Modal)
3. Copy the Project ID into `VITE_WALLETCONNECT_PROJECT_ID`

### Network Configuration (Sepolia)

The app targets **Ethereum Sepolia** (chain ID: `11155111`).
If you need to add it to MetaMask:

| Field        | Value                              |
|--------------|------------------------------------|
| Network Name | Sepolia                            |
| RPC URL      | https://rpc.sepolia.org            |
| Chain ID     | 11155111                           |
| Currency     | ETH                                |
| Block Explorer| https://sepolia.etherscan.io      |

---

## Scripts

| Command                    | Description                                           |
|----------------------------|-------------------------------------------------------|
| `pnpm dev`                 | Start Vite dev server on http://localhost:5173      |
| `pnpm build`               | Production build (outputs to `dist/`)                |
| `pnpm preview`             | Preview production build locally                      |
| `pnpm lint`                | Run ESLint with type checking                        |
| `pnpm test`                | Run vitest unit and integration tests                |
| `pnpm test:watch`          | Run tests in watch mode                              |
| `pnpm test:coverage`       | Run tests with coverage report                       |
| `pnpm e2e`                 | Run Playwright E2E tests (requires dev server)       |
| `pnpm e2e:ui`              | Open Playwright UI mode                              |

---

## Route Architecture

| Route         | Role          | Description                                      |
|---------------|---------------|--------------------------------------------------|
| `/`           | public        | Landing / wallet connect                         |
| `/login`      | public        | Challenge-response login flow                    |
| `/admin`      | owner         | Owner dashboard, queue, governance               |
| `/observer`   | observer      | Observer aggregate views, anomaly detection     |
| `/voter`      | voter/candidate | Voter home, elections, vote cast               |
| `/voter/profile/kyc` | voter/candidate | KYC wizard, document upload               |

### Deep-Link Behavior

The app uses hash-free SPA routing. Direct navigation to any route should resolve
without 404s (Vercel `vercel.json` rewrites all paths to `index.html`).

---

## Role-Based Access

| Role       | Home Route | Can Access                     | Guard Action on Violation |
|------------|------------|--------------------------------|---------------------------|
| `owner`    | `/admin`   | `/admin`, `/observer`          | Redirect to `/admin`      |
| `observer` | `/observer`| `/observer`, `/admin` (view only) | Redirect to `/observer` |
| `voter`    | `/voter`   | `/voter`                       | Redirect to `/voter`      |
| `candidate`| `/voter`   | `/voter`                       | Redirect to `/voter`      |

Role is determined by the signed session token from the backend challenge-response flow.

---

## Testing

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
pnpm test

# Watch mode during development
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Test files are located in:
- `src/test/unit/` — Route guards, freshness state machine
- `src/test/integration/` — Auth flow, KYC wizard, vote state machine

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install chromium firefox webkit

# Run E2E tests (ensure dev server is running)
pnpm dev &   # start dev server in background
pnpm e2e

# Open Playwright UI
pnpm e2e:ui
```

E2E test files are located in `e2e/`:
- `role-routing.spec.ts` — Deep-link role routes, redirect flows
- `vote-flow.spec.ts` — Vote token lifecycle, 60s TTL expiry
- `kyc-upload-ttl.spec.ts` — Upload authorize → finalize → 10min TTL

---

## Vercel Deployment

### Static Deployment

The frontend deploys as a **static SPA** on Vercel:

1. Push to GitHub (or connect Vercel to repo)
2. Vercel auto-detects Vite from `package.json`
3. Build command: `pnpm build`
4. Output directory: `dist`

### vercel.json

The repo includes `vercel.json` with:

- SPA rewrites (all paths → `index.html`)
- Immutable caching for hashed assets (`/assets/*` → 1 year cache)
- Security headers (X-Content-Type-Options, X-Frame-Options)

### Environment Variables on Vercel

Set the same variables from `.env.local` in:
**Vercel Dashboard → Project → Settings → Environment Variables**

| Variable                      | Example Value                         |
|-------------------------------|---------------------------------------|
| `VITE_API_BASE_URL`           | `https://dvote-api.vercel.app`        |
| `VITE_WALLETCONNECT_PROJECT_ID` | `abc123...`                        |
| `VITE_CHAIN_ID`              | `11155111`                            |
| `VITE_CHAIN_NAME`            | `Sepolia`                             |

### Preview Deployment

Each PR gets a preview URL. The backend must allow CORS from that origin.
Update `VITE_API_BASE_URL` accordingly for cross-origin testing.

---

## Troubleshooting

### Wallet Connect Never Resolves

**Symptom**: Wallet modal opens but connection spinner never stops.

**Cause**: `VITE_WALLETCONNECT_PROJECT_ID` missing or invalid.

**Fix**:
1. Get a valid project ID from https://cloud.walletconnect.com/
2. Add to `.env.local`: `VITE_WALLETCONNECT_PROJECT_ID=your_id`
3. Restart dev server: `pnpm dev`

---

### MetaMask Chain Mismatch

**Symptom**: "Wrong Network" error on login.

**Cause**: Wallet connected to wrong chain.

**Fix**:
1. Switch MetaMask to Sepolia (chain ID: 11155111)
2. Or: Click "Switch Network" if DVote prompts it

---

### Route Guard Redirect Loop

**Symptom**: Navigating to `/admin` bounces back to `/` or `/voter`.

**Cause**: Session role doesn't match route requirements.

**Fix**:
1. Clear localStorage: `localStorage.clear()`
2. Reconnect wallet to re-authenticate

---

### Build Fails — Missing CSS Variables

**Symptom**: Runtime errors about `--color-*` tokens not found.

**Cause**: `tokens.css` not imported in `main.tsx` or `index.css`.

**Fix**: Ensure `src/styles/tokens.css` is imported before any component:

```tsx
// src/main.tsx
import "./styles/tokens.css";
```

---

### Session Timeout on Preview Deployment

**Symptom**: Logs out immediately after deploying to Vercel preview.

**Cause**: Split-domain cookie not set properly (frontend: vercel.app, backend: other domain).

**Fix**:
1. Ensure backend sets cookie with `Domain=.vercel.app` or matching frontend domain
2. Or: Use `SameSite=Lax` and check `CORS_ALLOWED_ORIGINS` env var on backend

---

### Tests Fail with "Cannot find module 'wagmi'"

**Symptom**: Vitest throws module resolution error.

**Cause**: `test/setup.ts` mocks not applied or vitest config missing `setupFiles`.

**Fix**:
1. Check `vitest.config.ts` includes: `setupFiles: ['./src/test/setup.ts']`
2. Check `src/test/setup.ts` has all required mocks

---

### Slow Dev Server Startup

**Symptom**: `pnpm dev` hangs or takes >30s.

**Cause**: Node_modules not installed or corrupted.

**Fix**:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### Aadhaar Masking Not Working (L-C2)

**Symptom**: Full Aadhaar number visible on Review step.

**Cause**: `KycStepReview.tsx` not using mask function.

**Fix**: Ensure `maskAadhaar()` from `src/lib/format/identity.ts` is applied to display value.
See `src/features/kyc/steps/KycStepReview.tsx` — mask applied only on render.

---

## Architecture Notes

### State Management

- **Wagmi/viem**: Wallet and chain state (connected chain, accounts)
- **React Query**: Server state (elections, KYC status, freshness)
- **Zustand**: UI state (sidebar open, KYC wizard step, vote intent)
- **SessionStorage**: Auth token, returnTo URL
- **localStorage**: Session persistence across reloads

### Freshness Strategy

| Tab State     | Polling Interval | Rationale                    |
|---------------|------------------|------------------------------|
| Active tab    | 15s              | Real-time election updates   |
| Background tab| 60s              | Battery saving               |
| Debounce      | 5s               | Prevent rapid re-fetch       |

### Vote State Machine

```
idle → token-requested → cast-ready → submitting → confirmed
                                              → failed
                                              → expired
                                              → conflict
                                              → timeout-uncertain
```

---

## File Structure (Key Files)

```
frontend/
├── vercel.json           # Vercel config, SPA rewrites, caching
├── vite.config.ts        # Build, chunk splitting
├── src/
│   ├── main.tsx          # App entry, providers
│   ├── App.tsx           # Router setup
│   ├── styles/
│   │   └── tokens.css    # WIG compliance CSS variables
│   ├── lib/
│   │   ├── router/       # Routes, guards, returnTo logic
│   │   ├── api/          # API client, error mapping
│   │   └── format/       # Identity masking, date formatting
│   ├── features/
│   │   ├── auth/         # Challenge-verify flow
│   │   ├── kyc/          # Wizard, steps, draft conflict
│   │   ├── votes/        # Vote state machine, intent, cast
│   │   └── elections/    # Listing, detail, filters
│   ├── test/
│   │   ├── setup.ts      # Global test mocks
│   │   ├── unit/         # Guards, freshness tests
│   │   └── integration/  # Auth, KYC, vote flow tests
│   └── e2e/              # Playwright E2E specs
└── README.md             # This file
```

---

## Need Help?

- **Frontend Plan**: `Exp-6/EXP-6_FRONTEND_PLAN.md`
- **Feature Spec**: `Exp-6/docs/FEATURE_FRONTEND.md`
- **Execution Walkthrough**: `Exp-6/EXP-6_FRONTEND_EXECUTION_WALKTHROUGH.md`
- **WIG Compliance**: `docs/WIG.md`