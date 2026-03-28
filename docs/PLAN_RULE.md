# PLAN_RULE.md — Experiment Plan Authoring Standard

> **Blockchain Lab · ITL801 · University of Mumbai · BE IT SEM VIII · AY 2025-26**
> Single source of truth for authoring all `Exp-*/EXP-*_PLAN.md` files.

---

## Table of Contents

- [PLAN\_RULE.md — Experiment Plan Authoring Standard](#plan_rulemd--experiment-plan-authoring-standard)
  - [Table of Contents](#table-of-contents)
  - [1. Purpose \& Role of PLAN Files](#1-purpose--role-of-plan-files)
    - [1.1 What a PLAN File Is](#11-what-a-plan-file-is)
    - [1.2 What a PLAN File Is Not](#12-what-a-plan-file-is-not)
    - [1.3 Audience](#13-audience)
  - [2. FILE\_LENGTH\_TAG System](#2-file_length_tag-system)
    - [2.1 Tag Definitions](#21-tag-definitions)
    - [2.2 Assignment Rules](#22-assignment-rules)
    - [2.3 Example — Line 1 of any PLAN file](#23-example--line-1-of-any-plan-file)
  - [3. Mandatory File Structure](#3-mandatory-file-structure)
    - [§0 Experiment Snapshot](#0-experiment-snapshot)
    - [§1 Pre-Flight Checklist](#1-pre-flight-checklist)
    - [§2 Repository File Map](#2-repository-file-map)
    - [§3 Sequential Development Phases](#3-sequential-development-phases)
    - [§4 Crucial Development Moments (CDM)](#4-crucial-development-moments-cdm)
    - [§5 Manual Execution Tasks](#5-manual-execution-tasks)
    - [§6 Verification Checklist](#6-verification-checklist)
    - [§7 Known Issues \& Fixes](#7-known-issues--fixes)
    - [§8 Security Reminders](#8-security-reminders)
    - [§9 Git Commit Checkpoints](#9-git-commit-checkpoints)
  - [4. Code Snippet Rules](#4-code-snippet-rules)
    - [4.1 Snippet Length Rule](#41-snippet-length-rule)
    - [4.2 What to Include in a Snippet](#42-what-to-include-in-a-snippet)
    - [4.3 Snippet Language Tags](#43-snippet-language-tags)
    - [4.4 Citation Rule](#44-citation-rule)
    - [4.5 Forbidden Snippet Content](#45-forbidden-snippet-content)
  - [5. Network Awareness Table](#5-network-awareness-table)
  - [6. Tool Context Tagging](#6-tool-context-tagging)
    - [6.1 Tag Format](#61-tag-format)
    - [6.2 Available Tags](#62-available-tags)
    - [6.3 Dual-Tool Phases](#63-dual-tool-phases)
  - [7. Do's and Don'ts](#7-dos-and-donts)
    - [7.1 Do's ✅](#71-dos-)
    - [7.2 Don'ts ❌](#72-donts-)
  - [8. Markdown Style Guide](#8-markdown-style-guide)
    - [8.1 Heading Hierarchy](#81-heading-hierarchy)
    - [8.2 Tables](#82-tables)
    - [8.3 Callout Blocks](#83-callout-blocks)
    - [8.4 Checklist Items](#84-checklist-items)
    - [8.5 Horizontal Rules](#85-horizontal-rules)
    - [8.6 Links](#86-links)
    - [8.7 Bold and Italic](#87-bold-and-italic)
  - [9. Cross-Experiment Dependency Map](#9-cross-experiment-dependency-map)
    - [9.1 Rules for PLAN Authors](#91-rules-for-plan-authors)
  - [10. Minimal Complete PLAN Example](#10-minimal-complete-plan-example)

---

## 1. Purpose & Role of PLAN Files

Each experiment in this repository has exactly **one** PLAN file located at:

```
Exp-X/EXP-X_PLAN.md
```

This file is the **single source of truth** for performing that experiment. It is the authoritative document that AI agents and human contributors must read — and fully understand — before writing a single line of code, creating any file, or running any command for that experiment.

### 1.1 What a PLAN File Is

- A **step-by-step blueprint** of everything that must happen for the experiment to be implemented, from environment verification through final commit.
- A **contract** between the author of the plan and any future developer (human or AI) who executes it — the developer should be able to complete the experiment solely from the PLAN file with no ambiguity.
- A **reference document** that explains not just *what* to do but *why* — including version constraints, architecture decisions, and failure modes.

### 1.2 What a PLAN File Is Not

- A **tutorial** — it does not explain foundational blockchain concepts (that is the role of `EXP-X_DOC.md` THEORY section).
- A **complete code listing** — it does not contain full Solidity contracts or full deployment scripts (only logical flow hints and structural snippets ≤ 15 lines; see [Section 4](#4-code-snippet-rules)).
- A **README substitute** — the experiment-level `README.md` covers quick start; the PLAN covers deep implementation.

### 1.3 Audience

| Reader | How They Use the PLAN File |
|--------|---------------------------|
| AI Agent (GitHub Copilot, etc.) | Reads PLAN to understand intent, file map, and phase sequence before generating code |
| Human contributor / classmate | Follows PLAN phases to implement the experiment from scratch |
| Reviewer / evaluator | Uses PLAN to verify that implementation matches the stated architecture |

---

## 2. FILE\_LENGTH\_TAG System

Every `EXP-*_PLAN.md` file **must** begin on **line 1** with exactly one of the following tags:

```
FILE_LENGTH_TAG=soft
FILE_LENGTH_TAG=medium
FILE_LENGTH_TAG=hard
```

### 2.1 Tag Definitions

| Tag | Line Count Threshold | When to Use |
|-----|---------------------|-------------|
| `soft` | < 1,000 lines | Simple, single-tool experiments with linear phases (e.g., Truffle-only local deploy) |
| `medium` | 1,000 – 2,000 lines | Multi-tool experiments with testnet interaction, environment complexity, or 5+ phases |
| `hard` | > 2,000 lines | Highly complex experiments: multi-stack (Foundry + Hardhat), permissioned chains (Hyperledger Fabric), or Mini Projects requiring system design |

### 2.2 Assignment Rules

- The tag **must be assigned by the author** of the plan file, after writing it, based on actual line count.
- Tags are **not pre-assigned** based on experiment tier alone — content determines the tag.
- If the file grows beyond its original tag boundary during editing, the tag **must be updated** before committing.
- The tag must appear on **line 1 only** — no blank line before it, and no other content on that line.

### 2.3 Example — Line 1 of any PLAN file

```markdown
FILE_LENGTH_TAG=medium

# EXP-3_PLAN — Deployment on Ethereum Sepolia Testnet
...
```

---

## 3. Mandatory File Structure

Every `EXP-*_PLAN.md` file must contain **all nine sections** listed below in this exact order. Additional sections may be appended after §9 if needed. **Omitting any mandatory section is a violation of this standard.**

```
§0  Experiment Snapshot           ← identity card for the experiment
§1  Pre-Flight Checklist          ← verify environment before touching any file
§2  Repository File Map           ← every file to be created / updated / deleted
§3  Sequential Development Phases ← numbered phases with logical flow hints
§4  Crucial Development Moments   ← ⚠️ highest-risk steps requiring attention
§5  Manual Execution Tasks        ← what the human must do by hand
§6  Verification Checklist        ← pass/fail gates before declaring experiment done
§7  Known Issues & Fixes          ← version-specific gotchas and their resolutions
§8  Security Reminders            ← keys, secrets, network safety
§9  Git Commit Checkpoints        ← suggested commits per phase
```

---

### §0 Experiment Snapshot

**Purpose**: One-glance identity card for the experiment — no scrolling required to understand scope and context.

**Template**:

```markdown
## 0. Experiment Snapshot

| Field | Value |
|-------|-------|
| Experiment | Exp-X — <Full experiment name from BLOCKCHAIN_LAB_MANUAL.md> |
| Lab Outcome | LOX — <Exact LO text from BLOCKCHAIN_LAB_MANUAL.md> |
| Bloom's Taxonomy Level | LX, LY |
| Primary Tool(s) | e.g., Truffle v5, Ganache v7, Hardhat 2.x |
| Supporting Tool(s) | e.g., Remix IDE, MetaMask, Web3.js |
| Solidity Version | 0.8.X |
| Node Version | v22.x.x (nvm alias: modern) — set via `.nvmrc = 22` |
| Local Network(s) | Hardhat (31337) / Ganache GUI (7545) / Ganache CLI (8545) / Anvil (8545) |
| Testnet | Sepolia (11155111) / Holesky (17000) / N/A |
| Prerequisite Experiments | Exp-X (reason), or None |
| Estimated Phases | X phases |
| FILE_LENGTH_TAG | soft / medium / hard |
```

**Rules**:
- Copy LO text **verbatim** from `docs/BLOCKCHAIN_LAB_MANUAL.md` — do not paraphrase.
- List **all** tools used across every phase, not just the primary one.
- If the experiment has no testnet step, write `N/A` for Testnet.
- Mark prerequisite experiments explicitly — this surfaces the cross-experiment dependency chain defined in [Section 9](#9-cross-experiment-dependency-map).

---

### §1 Pre-Flight Checklist

**Purpose**: Verifiable binary gates the developer must pass before writing any code or creating any file. Treat this as a launch checklist — every item must be ✅ before Phase 1 begins.

**Template**:

```markdown
## 1. Pre-Flight Checklist

Run these checks **before starting Phase 1**. Do not proceed if any item fails.

### 1.1 Node & nvm

- [ ] `nvm --version` confirms nvm ≥ 0.40.x is installed
- [ ] `nvm use 22` succeeds — outputs `Now using node v22.x.x (npm v10.x.x)`
- [ ] `node --version` inside `Exp-X/` directory outputs `v22.x.x` (`.nvmrc` respected)

### 1.2 Global CLI Tools (under Node 22 context)

- [ ] `truffle version` → Truffle v5.x.x, Node v22.x.x  _(if Truffle is used)_
- [ ] `ganache --version` → v7.x.x  _(if Ganache is used)_
- [ ] `remixd --version` → 0.6.x  _(if Remix IDE bridge is needed)_
- [ ] `forge --version` → forge 1.x.x  _(if Foundry is used)_
- [ ] `docker --version` → Docker 24.x+, daemon running  _(if Hyperledger Fabric)_

### 1.3 Ports

- [ ] Port `7545` is free — `lsof -i :7545` returns empty  _(Ganache GUI)_
- [ ] Port `8545` is free — `lsof -i :8545` returns empty  _(Ganache CLI / Anvil)_
- [ ] Port `31337` is free — `lsof -i :31337` returns empty  _(Hardhat node)_

### 1.4 Environment Files

- [ ] `Exp-X/.env` does NOT appear in `git status` (not staged, not tracked)
- [ ] `Exp-X/.env.example` is present and contains all required placeholder keys

### 1.5 Dependencies

- [ ] `Exp-X/node_modules/` exists — run `npm install` if absent
- [ ] `npx hardhat compile` exits 0 with 0 errors  _(if Hardhat is used)_
- [ ] `forge build` exits 0 with 0 errors  _(if Foundry is used)_
```

**Rules**:
- **Remove** checklist items that are not applicable to the experiment (e.g., remove Docker items from Exp-1).
- **Add** experiment-specific services (e.g., Docker network for HLF, IPFS daemon for a DApp with IPFS).
- Every item must produce a **binary pass/fail** — no "approximately works" states acceptable.
- Port checks are mandatory whenever a local blockchain node will be started.

---

### §2 Repository File Map

**Purpose**: Exhaustive tabular listing of every file the developer will touch during this experiment. The developer should encounter no surprises about which files exist, which to create, and which to leave untouched.

**Template**:

```markdown
## 2. Repository File Map

> **Legend**: `CREATE` — new file | `UPDATE` — modify existing | `DELETE` — remove | `VERIFY` — read-only reference

| # | File Path (relative to `Exp-X/`) | Action | Phase | Purpose |
|---|----------------------------------|--------|-------|---------|
| 1 | `contracts/FileName.sol` | CREATE | 2 | Main smart contract for the experiment |
| 2 | `migrations/1_deploy_filename.js` | CREATE | 3 | Truffle migration script |
| 3 | `test/FileName.test.js` | CREATE | 4 | Hardhat / Mocha test suite |
| 4 | `hardhat.config.js` | UPDATE | 1 | Add network entry or compiler version |
| 5 | `truffle-config.js` | VERIFY | 1 | Confirm network settings match checklist |
| 6 | `package.json` | UPDATE | 5 | Add or update npm run scripts |
| 7 | `scripts/deploy.js` | CREATE | 3 | Hardhat Ignition or ethers.js deploy script |
| 8 | `.env.example` | UPDATE | 1 | Add any new env keys required by this experiment |
| 9 | `EXP-X_PLAN.md` | VERIFY | — | Confirm FILE_LENGTH_TAG accuracy after writing |
| 10 | `../docs/BLOCKCHAIN_LAB_MANUAL.md` | VERIFY | — | Source of LO text for §0 and evaluation file |
```

**Rules**:
- List files in approximate **order of creation/modification** across phases — this creates a natural execution sequence for the developer.
- **Never list**: `node_modules/`, `artifacts/`, `cache/`, `out/`, or any path in `.gitignore`.
- If a file is **created in one phase and modified in another**, list it twice with different action tags and phase numbers.
- The `Phase` column must reference the phase number defined in §3.
- For Exp-5 (HLF), include sub-paths like `chaincode/javascript/lib/myAsset.js`.
- For Exp-6, include both Foundry (`src/`, `script/`) and Hardhat (`scripts/`) paths.
- Always end with `EXP-X_PLAN.md` as a `VERIFY` row to confirm FILE_LENGTH_TAG is accurate post-authoring.

---

### §3 Sequential Development Phases

**Purpose**: The ordered, numbered execution roadmap for the experiment. Each phase is a discrete unit of work with a clear goal and a logical-flow description. Developers execute phases in order.

**Template**:

```markdown
## 3. Sequential Development Phases

---

### Phase 1 — Environment & Config Verification

**Goal**: Confirm all tools, versions, and config files are correctly set up for this experiment.

**Files Touched**: `hardhat.config.js` (VERIFY/UPDATE), `truffle-config.js` (VERIFY), `.nvmrc` (VERIFY)

<!-- HARDHAT -->
**Logical Flow**:
1. `nvm use 22` — switch to Node 22.
2. Inspect `hardhat.config.js` — confirm `solidity.version = "0.8.X"` and correct networks block.
3. Inspect `truffle-config.js` — confirm `development` network points to port `7545` (Ganache GUI).
4. If any config is wrong, fix it before proceeding.

**Exit Criteria**: `npx hardhat compile` exits 0.

---

### Phase 2 — Contract Development

**Goal**: Write the Solidity smart contract for the experiment.

**Files Touched**: `contracts/FileName.sol` (CREATE)

<!-- SOLIDITY -->
**Logical Flow**:
1. Create `contracts/FileName.sol` with SPDX-License-Identifier and `pragma solidity ^0.8.X`.
2. Define the contract state variables aligned to the experiment objective.
3. Implement constructor with initialization logic.
4. Implement public/external functions — one function per experiment action.
5. Add events for every state-changing operation.
6. Compile after every major addition: `npx hardhat compile`.

**Logical Hint** (no complete code — intent only):
- State variable: tracks the core data this experiment manages.
- Function `set(value)`: validate input → update state → emit event.
- Function `get()`: view function, returns current state.

**Exit Criteria**: Contract compiles with 0 errors, 0 warnings (or documented warnings only).

---

### Phase 3 — Migration / Deployment Script

... (repeat pattern for each phase)

---

### Phase N — Final Cleanup

**Goal**: Ensure repo is clean before committing.

**Files Touched**: `package.json` (VERIFY), `.env.example` (VERIFY)

**Logical Flow**:
1. Verify no `.env` file is tracked: `git status`.
2. Verify `artifacts/` and `cache/` are in `.gitignore`.
3. Run `npm run format` if a prettier config is present.
4. Run full test suite one final time.

**Exit Criteria**: `git status` shows only intentional tracked files.
```

**Rules**:
- Each phase must have: **Goal**, **Files Touched**, **Logical Flow** (numbered steps), and **Exit Criteria**.
- Logical flow steps use **imperative mood**: `Create`, `Define`, `Implement`, `Run`, `Verify`.
- **Do not write full function implementations** — describe intent and signature only (see [Section 4](#4-code-snippet-rules)).
- Use `<!-- TOOL_NAME -->` HTML comments before each logical flow block to identify the tool in use (see [Section 6](#6-tool-context-tagging)).
- Exit Criteria must be **binary** — a command that either succeeds or fails; no subjective statements.
- Number phases starting from `1`. Phase `0` is reserved for Setup if needed.
- Aim for **5–10 phases** for medium experiments; fewer for soft, more permissible for hard.

---

### §4 Crucial Development Moments (CDM)

**Purpose**: Call out the highest-risk, most error-prone, or most context-dependent steps in the experiment. These are the moments where AI agents and contributors most commonly fail, get confused by version differences, or make silent mistakes that break later phases.

**Template**:

```markdown
## 4. Crucial Development Moments (CDM)

> ⚠️ Read every CDM before starting the corresponding phase. These are the most common failure points.

---

#### CDM-1 — <Short name of the moment> _(Phase X)_

**Risk**: <What can go wrong — be specific>

**Why it matters**: <What breaks downstream if this goes wrong>

**What to do**:
- Step 1 (precise, actionable)
- Step 2
- Verification: <how to confirm it was handled correctly>

**Common Mistake**: <The exact wrong thing most developers do here>

---

#### CDM-2 — <Short name> _(Phase Y)_

... (repeat for every identified high-risk moment)
```

**CDM Categories to Always Check When Authoring a PLAN**:

| Category | Examples |
|----------|---------|
| **Version traps** | Hardhat 3 vs 2.x API differences; Truffle compile vs migrate differences on Node 22; OZ v4 vs v5 import paths changing |
| **Network confusion** | Wrong `chainId` in `hardhat.config.js`; Truffle deploys to `development` but Hardhat test uses `hardhat`; MetaMask connected to wrong network |
| **ABI / artifact staleness** | Running scripts against outdated `artifacts/` after contract change without re-compiling; Truffle `build/` vs Hardhat `artifacts/` path difference |
| **Account/key mismatches** | Deploying with account[0] in Ganache but testing with account[1]; MetaMask private key import from wrong network |
| **Testnet gotchas** | Deprecated networks (Ropsten, Rinkeby, Goerli are sunset — use Sepolia); insufficient testnet ETH; Alchemy/Infura endpoint being wrong |
| **HLF-specific** | Docker daemon not running; fabric-samples `test-network` down; peer binary not in PATH; chaincode package ID mismatch after reinstall |
| **Re-entrancy / security** | Forgetting `nonReentrant` on payable functions; missing `onlyOwner` on admin functions — flag these in contracts as CDMs |
| **env variable loading** | `dotenv.config()` called after `ethers` import (fails silently); `.env` present but PRIVATE_KEY has leading/trailing spaces |
| **MetaMask UX** | Nonce reset required after local node restart; "Could not fetch chain ID" when no node is running; token import requires contract address |

**Rules**:
- Every plan file must have **at least 3 CDMs**.
- Every CDM must reference the phase number it belongs to.
- CDMs are **not debugging guides** — they proactively explain what to *watch for*, not what to *fix after* breaking.

---

### §5 Manual Execution Tasks

**Purpose**: Explicit, step-by-step instructions for actions the human developer must perform manually — things that cannot be automated or scripted in context (GUI interactions, wallet configuration, testnet faucet usage).

**Template**:

```markdown
## 5. Manual Execution Tasks

These steps must be performed **by hand** by the developer. They cannot be automated.

---

### MET-1 — Starting Ganache GUI _(before Phase 3)_

1. Open the Ganache application (desktop app).
2. Click **New Workspace** → select **Ethereum**.
3. Set **Port Number** to `7545`.
4. Set **Network ID** to `1337`.
5. Click **Start** — confirm 10 accounts are listed with 100 ETH each.
6. Keep the Ganache window open throughout the experiment.

---

### MET-2 — MetaMask Network Configuration _(before Phase 5)_

1. Open MetaMask → Settings → Networks → Add a network manually.
2. Fill in:
   - Network Name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:7545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
3. Click **Save** and switch to the new network.
4. Import a test account: Account Details → Copy Private Key from Ganache → Import Account in MetaMask.
5. Verify balance shows **100 ETH**.

---

### MET-3 — Testnet Faucet _(before Phase N — testnet experiments only)_

1. Navigate to [https://sepoliafaucet.com](https://sepoliafaucet.com) or [https://faucets.chain.link/sepolia](https://faucets.chain.link/sepolia).
2. Connect MetaMask — ensure it is on **Sepolia** network.
3. Request 0.5 ETH (minimum for deployment + test transactions).
4. Wait for faucet transaction to confirm (typically 30–90 seconds).
5. Verify balance in MetaMask ≥ 0.3 ETH before deploying.
```

**Rules**:
- Every MET must have a sequential numbered step list — no paragraphs.
- MET items must reference the **phase they must be completed before**.
- Do not describe software installation in METs — that belongs in Pre-Flight Checklist (§1).
- METs are the correct place to document: Ganache GUI startup, MetaMask network/account import, Remix IDE configuration, testnet faucet usage, Docker network startup for HLF.

---

### §6 Verification Checklist

**Purpose**: Binary pass/fail checklist that marks the experiment as **complete** only when all items are checked. This section doubles as the pre-submission quality gate.

**Template**:

```markdown
## 6. Verification Checklist

Complete every item before committing the final state of this experiment.

### 6.1 Compilation & Build

- [ ] `npx hardhat compile` → 0 errors, 0 unexpected warnings
- [ ] `truffle compile` → compiled X contracts  _(if Truffle is used)_
- [ ] `forge build` → Compiler run successful  _(if Foundry is used)_

### 6.2 Deployment

- [ ] Contract deployed to local network — transaction hash printed to console
- [ ] Deployed contract address saved or noted (for test scripts and MetaMask import)
- [ ] `truffle migrate --reset` completes with no errors  _(if Truffle is used)_

### 6.3 Tests

- [ ] `npx hardhat test` → X passing, 0 failing
- [ ] `forge test -vvv` → all test functions PASS  _(if Foundry is used)_
- [ ] At least one test per state-changing contract function

### 6.4 MetaMask / UI Verification

- [ ] MetaMask connected to correct local network (Chain ID confirmed)
- [ ] Interaction transaction (send/call) confirmed in MetaMask with correct gas estimate
- [ ] Token balance / contract state visible in MetaMask  _(ERC-20 experiments)_

### 6.5 Screenshot Capture

- [ ] Terminal output screenshot captured and saved to `screenshots/`
- [ ] MetaMask interaction screenshot captured  _(if applicable)_
- [ ] Remix IDE / Etherscan screenshot captured  _(if applicable)_
- [ ] All screenshots named as `fig-X.Y-descriptive-name.png`

### 6.6 Security & Hygiene

- [ ] No `.env` file in `git status` (not staged)
- [ ] No private keys in any committed file
- [ ] `node_modules/`, `artifacts/`, `cache/` are gitignored

### 6.7 Documentation

- [ ] Experiment `README.md` is accurate (steps match actual commands used)
- [ ] `EXP-X_PLAN.md` FILE_LENGTH_TAG matches actual line count
```

**Rules**:
- The checklist must be **complete before committing** — do not open a PR with unchecked items.
- Add experiment-specific checks (e.g., Fabric peer invoke/query for Exp-5).
- Remove inapplicable rows rather than leaving them unchecked permanently.

---

### §7 Known Issues & Fixes

**Purpose**: Document version-specific bugs, environment quirks, and known incompatibilities **before the developer encounters them**. This section is pre-populated from research and prevents wasted debugging time.

**Template**:

```markdown
## 7. Known Issues & Fixes

---

### Issue-1 — <Short issue description>

**Symptom**: `<Exact error message or observable behavior>`

**Root Cause**: <Why this happens — version conflict, missing flag, etc.>

**Fix**:
```bash
# Exact command(s) that resolve the issue
```

**Reference**: [Link to issue/PR/docs if available]

---

### Issue-2 — <Short issue description>

... (repeat pattern)
```

**Standard Issues to Always Research per Experiment** (check current dates — tool versions evolve):

| Tool | Common Issue Area |
|------|-------------------|
| Hardhat 2.x | Node.js version warning (< Node 18 unsupported; Node 22 works with warning suppressed) |
| Truffle v5 | `Error HH24` when piping stdin to `init`; `ganache-cli` renamed to `ganache` in v7 |
| OpenZeppelin | Import paths changed from `@openzeppelin/contracts/token/ERC20/ERC20.sol` (v4) to same path (v5) but constructor signature differs |
| MetaMask | Nonce reset required after local node restart; "Pending" transactions stuck after node restart |
| Foundry | `forge install` adds git submodule — breaks if parent repo uses `--no-git`; use `--no-git` flag |
| Hyperledger Fabric | `CORE_PEER_TLS_ENABLED` environment variable must be set for all peer commands; Docker Desktop must use Linux containers |

---

### §8 Security Reminders

**Purpose**: Concise, non-negotiable security rules specific to this experiment. These complement the global security guidelines in `CONTRIBUTING.md §7`.

**Template**:

```markdown
## 8. Security Reminders

> ⚠️ These rules are non-negotiable. A PR will be rejected if any of these are violated.

- **Never** commit `.env` to Git. Use `.env.example` with placeholder values only.
- **Never** use a wallet with real ETH for any experiment — use dedicated test accounts only.
- **Never** deploy to Ethereum Mainnet — all experiments target local nodes or Sepolia testnet.
- **Always** use test private keys generated by Hardhat, Ganache, or Anvil for local experiments.
- **Always** verify that `git diff --cached` shows no `.env`, `*.pem`, or `*.key` files before committing.
- For Testnet experiments (Exp-3, Exp-4, Exp-6): The `.env` PRIVATE_KEY must be a **dedicated testnet-only** wallet — never your primary MetaMask wallet.
```

**Rules**:
- The template above is the **minimum** content for every plan file.
- Add experiment-specific warnings after the template (e.g., Exp-5 HLF: never use production org certificates in lab; Exp-4: never share token contract address publicly if exposed key).

---

### §9 Git Commit Checkpoints

**Purpose**: Recommended commit messages (following `CONTRIBUTING.md §3` convention) at natural checkpoints during experiment development. These keep history clean and enable easy rollback.

**Template**:

```markdown
## 9. Git Commit Checkpoints

Commit at each checkpoint. Use the exact format: `<type>(<scope>): <summary>`

| Checkpoint | After Completing | Suggested Commit Message |
|-----------|-----------------|--------------------------|
| CP-1 | Phase 1 — Config verified | `config(exp-X): verify hardhat and truffle config for exp-X` |
| CP-2 | Phase 2 — Contract written | `feat(exp-X): add <ContractName>.sol with <brief description>` |
| CP-3 | Phase 3 — Migration/deploy script | `exp(exp-X): add migration script for <ContractName> local deploy` |
| CP-4 | Phase 4 — Tests written | `test(exp-X): add Hardhat/Mocha tests for <ContractName>` |
| CP-5 | Phase 5 — Verified locally | `exp(exp-X): verify <ContractName> deploys and tests pass on local network` |
| CP-6 | All phases — Final cleanup | `chore(exp-X): clean up artifacts, update README, finalize exp-X` |
```

**Rules**:
- Checkpoint commit messages are **suggestions** — adapt the summary to the actual work done.
- Do **not** commit after every tiny file edit — commit at the phase boundary (exit criteria met).
- The `<scope>` must be `exp-X` (e.g., `exp-1`, `exp-3`) per `CONTRIBUTING.md` scopes table.
- Never commit a checkpoint with failing tests or compile errors.

---

## 4. Code Snippet Rules

PLAN files use **logical-flow snippets** — short illustrative code blocks that communicate *intent and structure*, not complete implementations. These exist to give AI agents and contributors enough context to write correct code without being a copy-paste shortcut.

### 4.1 Snippet Length Rule

| Snippet Type | Maximum Lines | Purpose |
|-------------|--------------|---------|
| Solidity contract skeleton | 15 lines | Show state vars + function signatures only |
| JS/TS deploy script outline | 15 lines | Show key calls (getContractFactory, deploy, waitForDeployment) |
| Config block | 10 lines | Show one network entry or one compiler block |
| Shell command sequence | 10 lines | Show ordered CLI commands for a phase |
| Pseudocode / logical flow | 10 lines | Show algorithm intent without syntax |

### 4.2 What to Include in a Snippet

```solidity
// ✅ CORRECT — shows structure, no full implementation
contract SimpleStorage {
    uint256 private storedData;
    event DataStored(uint256 indexed value, address indexed sender);

    function set(uint256 value) external { /* validate → store → emit */ }
    function get() external view returns (uint256) { /* return stored */ }
}
```

```solidity
// ❌ WRONG — full implementation, belongs in the actual .sol file not the PLAN
contract SimpleStorage {
    uint256 private storedData;
    event DataStored(uint256 indexed value, address indexed sender);

    function set(uint256 value) external {
        require(value > 0, "Value must be positive");
        storedData = value;
        emit DataStored(value, msg.sender);
    }
    function get() external view returns (uint256) {
        return storedData;
    }
}
```

### 4.3 Snippet Language Tags

Always specify the language in fenced code blocks for syntax highlighting and AI context:

| Language | Fence Tag |
|----------|-----------|
| Solidity | ` ```solidity ` |
| JavaScript | ` ```javascript ` |
| TypeScript | ` ```typescript ` |
| Bash / Shell | ` ```bash ` |
| JSON | ` ```json ` |
| YAML | ` ```yaml ` |
| Go (HLF chaincode) | ` ```go ` |

### 4.4 Citation Rule

If a snippet references a real file in the repository, cite it:

````markdown
<!-- File: contracts/SimpleStorage.sol — lines 1–8 (skeleton only) -->
```solidity
...
```
````

### 4.5 Forbidden Snippet Content

- ❌ Full Solidity contract implementations (all functions with logic)
- ❌ Complete Hardhat `ignition/` module files
- ❌ Full test suites (mock data, all test cases, before/after hooks)
- ❌ Complete `hardhat.config.js` or `truffle-config.js` files (partial blocks only)
- ❌ Any snippet containing real private keys, mnemonics, or API keys
- ❌ Snippets from `node_modules/` paths

---

## 5. Network Awareness Table

Every PLAN file **must** include a Network Awareness Table in the §0 Experiment Snapshot or as a standalone subsection in Phase 1. This table prevents the single most common experiment failure: deploying to the wrong network.

**Standard Networks Reference**:

| Network | Type | Chain ID | Default Port | Tool | When Used |
|---------|------|----------|-------------|------|-----------|
| `hardhat` | Local (ephemeral) | 31337 | — (in-process) | Hardhat | Unit tests, quick iteration |
| `ganache` (GUI) | Local (persistent) | 1337 | 7545 | Ganache Desktop | Experiments requiring persistent state, MetaMask |
| `ganacheCli` | Local (persistent) | 1337 | 8545 | Ganache CLI | CI/automated scripts |
| `anvil` | Local (persistent) | 31337 | 8545 | Foundry | Exp-6 (Foundry-based) |
| `sepolia` | Testnet (public) | 11155111 | 443 (HTTPS) | Hardhat, Truffle | Exp-3, Exp-4 testnet deploy |
| `holesky` | Testnet (public) | 17000 | 443 (HTTPS) | Hardhat | Alternative testnet |
| Hyperledger Fabric | Permissioned | N/A | Configurable | Fabric CLI | Exp-5 only |

**Rules**:
- Every plan file must explicitly state which network(s) it uses in **§0 Experiment Snapshot**.
- Any phase that starts a blockchain node must specify the exact port and tool.
- Experiments using MetaMask must state the **Chain ID** — this is what MetaMask uses, not the port.
- **Never reference deprecated testnets**: Ropsten (shutdown Sep 2022), Rinkeby (shutdown Oct 2022), Goerli (deprecated Oct 2023, officially sunset). Use **Sepolia** as the primary testnet.

---

## 6. Tool Context Tagging

PLAN files must use HTML comments to tag which tool is active in each logical flow block. This enables AI agents to apply tool-specific knowledge without ambiguity.

### 6.1 Tag Format

```markdown
<!-- TOOL: HARDHAT -->
**Logical Flow** (Hardhat-specific steps):
...

<!-- TOOL: TRUFFLE -->
**Logical Flow** (Truffle-specific steps):
...
```

### 6.2 Available Tags

| Tag | Tool / Context |
|-----|---------------|
| `<!-- TOOL: HARDHAT -->` | Hardhat tasks, scripts, or config |
| `<!-- TOOL: TRUFFLE -->` | Truffle compile, migrate, or console |
| `<!-- TOOL: FOUNDRY -->` | Forge, Cast, Anvil, or Chisel |
| `<!-- TOOL: REMIX -->` | Remix IDE browser interactions |
| `<!-- TOOL: METAMASK -->` | MetaMask wallet or browser extension |
| `<!-- TOOL: GANACHE -->` | Ganache GUI or Ganache CLI |
| `<!-- TOOL: FABRIC -->` | Hyperledger Fabric peer commands |
| `<!-- TOOL: SOLIDITY -->` | Solidity contract development |
| `<!-- TOOL: WEB3JS -->` | Web3.js scripting |
| `<!-- TOOL: ETHERSJS -->` | ethers.js scripting |
| `<!-- TOOL: SHELL -->` | Generic shell / OS commands |

### 6.3 Dual-Tool Phases

When a phase uses two tools side-by-side (e.g., Truffle compile + Hardhat test), tag each sub-block independently:

```markdown
### Phase 3 — Deploy Contract

<!-- TOOL: TRUFFLE -->
**Truffle path** (run `truffle migrate --network development`):
- migration file must be in `migrations/` with numeric prefix
- network must match `truffle-config.js` development block

<!-- TOOL: HARDHAT -->
**Hardhat path** (run `npx hardhat run scripts/deploy.js --network ganache`):
- script uses `ethers.getContractFactory` → `deploy()` → `waitForDeployment()`
```

---

## 7. Do's and Don'ts

### 7.1 Do's ✅

| Rule | Rationale |
|------|-----------|
| **Pin exact versions** in every phase | Prevents "it worked on my machine" failures |
| **Reference `.nvmrc`** at the top of every phase that runs Node commands | Prevents running under wrong Node version |
| **Link official docs** per step | e.g., `[Hardhat Ignition docs](https://hardhat.org/ignition)` inline with deploy phases |
| **Use imperative tense** in task descriptions | `Add`, `Create`, `Run`, `Verify` — not `Adding`, `Created`, `Running` |
| **Declare exit criteria** for every phase | Prevents phases from being "done enough" without binary confirmation |
| **Cross-reference CDMs** in phase descriptions | `> ⚠️ See CDM-2 before executing this step` |
| **Use relative file paths** from the experiment root | `contracts/MyContract.sol`, not `/home/user/.../Exp-1/contracts/MyContract.sol` |
| **Note when ABI changes** trigger downstream updates | If contract changes, always list all files that import the ABI |
| **Use web search** when writing any phase involving tool versions | Version matrices change; always verify current compatibility |

### 7.2 Don'ts ❌

| Rule | Rationale |
|------|-----------|
| **Don't write full Solidity implementations** | PLAN files are blueprints, not source files |
| **Don't include `node_modules/` paths** | Irrelevant to development; misleads AI agents |
| **Don't speculate on gas costs** without testnet data | Gas estimates without evidence are meaningless |
| **Don't reference deprecated networks** (Ropsten, Rinkeby, Goerli) | They are shut down; always use Sepolia |
| **Don't write prose paragraphs** in phase logical flow | Use numbered steps only — prose is ambiguous for AI agents |
| **Don't repeat the full checklist** from §1 inside phases | Reference it: "See Pre-Flight Checklist §1.3" |
| **Don't omit CDMs** when known failure modes exist | Undocumented failure modes waste hours during execution |
| **Don't use passive voice** in task steps | "Contract is deployed" → `Deploy the contract` |
| **Don't mix Truffle and Hardhat commands** in the same step | Keep tool-specific commands in tagged blocks (Section 6) |
| **Don't include wallet mnemonics or private keys** even as examples | Use `<PRIVATE_KEY>` placeholder syntax |

---

## 8. Markdown Style Guide

PLAN files must use consistent Markdown formatting to ensure readability in GitHub, VS Code Markdown preview, and AI agent context windows.

### 8.1 Heading Hierarchy

```markdown
# Title (H1) — exactly one, top of file, after FILE_LENGTH_TAG
## Section (H2) — for the 9 mandatory sections (§0–§9) and Sections 4–10 of this rule file
### Subsection (H3) — for phases, CDMs, METs, checklists under a section
#### Sub-items (H4) — for step groupings within a subsection if needed
```

Never skip levels (e.g., never go from H2 directly to H4).

### 8.2 Tables

- Use tables for: file maps (§2), network references (§5), checklists, tool tags (§6), do's/don'ts (§7).
- Always include a header separator row (`|---|---|`).
- Align column widths consistently for readability.
- Pipe characters `|` must have a space on each side.

### 8.3 Callout Blocks

Use blockquotes with emoji for callouts:

```markdown
> ⚠️ **Warning** — This CDM can break the entire downstream chain if ignored.
> 💡 **Tip** — An alternative approach that may work better in WSL environments.
> 📌 **Note** — Informational context that is not a warning but is worth remembering.
> ✅ **Confirmed** — This step is verified working on Node 22.22.0 + Truffle 5.11.5.
```

### 8.4 Checklist Items

- Use `- [ ]` for items that must be checked by the developer during execution.
- Use `- [x]` only in your own working copy — never commit a PLAN file with pre-checked items.
- Do not use numbered lists for checklists — they cannot be toggled without editing the source.

### 8.5 Horizontal Rules

Use `---` (three dashes) between major sections and between phases. Do not use `***` or `===`.

### 8.6 Links

- Use relative paths for files within the repository: `[CONTRIBUTING.md](../CONTRIBUTING.md)`
- Use full URLs for external documentation: `[Hardhat docs](https://hardhat.org/)`
- Always verify links are not broken before committing.

### 8.7 Bold and Italic

- **Bold** (`**text**`): use for action words, file names, tool names, and important constraints.
- *Italic* (`*text*`): use for emphasis within explanatory sentences only.
- Never use bold for entire sentences — if the whole sentence matters, use a callout block.

---

## 9. Cross-Experiment Dependency Map

Experiments in this lab are not fully independent. A developer must understand these dependencies to correctly set up their environment and avoid being blocked.

| Experiment | Depends On | Reason |
|-----------|-----------|--------|
| **Exp-1** | None | Entry point — establishes local Truffle + Ganache toolchain |
| **Exp-2** | Exp-1 toolchain | Assumes Truffle + Ganache already configured; builds on Exp-1 contract structure |
| **Exp-3** | Exp-1 + Exp-2 | Requires working Hardhat setup (Exp-1) and understanding of contract development (Exp-2); adds testnet layer |
| **Exp-4** | Exp-3 + Exp-2 | ERC-20 token development requires Exp-2 Solidity knowledge; testnet deploy from Exp-3; MetaMask interaction introduced |
| **Exp-5** | None (parallel) | Hyperledger Fabric is a separate permissioned stack — independent of Ethereum experiments. Requires Docker + fabric-samples. |
| **Exp-6** | Exp-1–4 (Ethereum track) | Mini Project synthesizes all Ethereum knowledge. Foundry introduced for the first time. Requires understanding of Exp-3 testnet deploy + Exp-4 token design. |

### 9.1 Rules for PLAN Authors

- If your experiment **depends** on a previous one, list it explicitly in `§0 Experiment Snapshot` under `Prerequisite Experiments`.
- Test the prerequisite experiment locally before writing the PLAN for the dependent experiment.
- If the dependent experiment introduces a **breaking change** (e.g., OZ v5 import path vs v4), document it in §7 Known Issues.
- Exp-5 and the Ethereum track (Exp-1–4, Exp-6) are **independent stacks** — do not assume Fabric tools are available in Ethereum experiments or vice versa.

---

## 10. Minimal Complete PLAN Example

Below is the bare minimum structure of a valid `EXP-X_PLAN.md` file, showing all mandatory sections in order. Replace all `<placeholders>` with actual content.

```markdown
FILE_LENGTH_TAG=soft

# EXP-1_PLAN — Develop and Establish Local Blockchain using Truffle

## Table of Contents
- [0. Experiment Snapshot](#0-experiment-snapshot)
- [1. Pre-Flight Checklist](#1-pre-flight-checklist)
- [2. Repository File Map](#2-repository-file-map)
- [3. Sequential Development Phases](#3-sequential-development-phases)
- [4. Crucial Development Moments](#4-crucial-development-moments)
- [5. Manual Execution Tasks](#5-manual-execution-tasks)
- [6. Verification Checklist](#6-verification-checklist)
- [7. Known Issues & Fixes](#7-known-issues--fixes)
- [8. Security Reminders](#8-security-reminders)
- [9. Git Commit Checkpoints](#9-git-commit-checkpoints)

---

## 0. Experiment Snapshot

| Field | Value |
|-------|-------|
| Experiment | Exp-1 — To Develop and Establish local Blockchain using Truffle |
| Lab Outcome | LO1 — Develop and test smart contract on local Blockchain |
| Bloom's Taxonomy Level | L3, L4 |
| Primary Tool(s) | Truffle v5.11.5, Ganache v7.9.2 |
| Supporting Tool(s) | Hardhat 2.28.x, Remix IDE (optional) |
| Solidity Version | 0.8.21 |
| Node Version | v22.22.0 (nvm alias: modern) — `.nvmrc = 22` |
| Local Network(s) | Ganache GUI (7545 / Chain ID 1337), Hardhat (31337) |
| Testnet | N/A |
| Prerequisite Experiments | None |
| Estimated Phases | 5 phases |
| FILE_LENGTH_TAG | soft |

---

## 1. Pre-Flight Checklist
... (follow §1 template)

## 2. Repository File Map
... (follow §2 template)

## 3. Sequential Development Phases
... (follow §3 template)

## 4. Crucial Development Moments (CDM)
... (follow §4 template — minimum 3 CDMs)

## 5. Manual Execution Tasks
... (follow §5 template)

## 6. Verification Checklist
... (follow §6 template)

## 7. Known Issues & Fixes
... (follow §7 template)

## 8. Security Reminders
... (follow §8 template)

## 9. Git Commit Checkpoints
... (follow §9 template)
```

---

*Maintained by [Pratham Diwadkar](https://github.com/prathamxone) — INFT, Atharva College of Engineering*
*This document governs all `Exp-*/EXP-*_PLAN.md` files in the Blockchain Lab repository.*


