# Contributing to Blockchain Lab

> **University of Mumbai · Information Technology · Semester VIII · AY 2025-26**
> Web3 Stack: Hardhat | Truffle | Ganache | Foundry | Remix IDE

Thank you for your interest in contributing to the **Blockchain Lab** repository. This guide
outlines the conventions, workflows, and standards expected from all contributors — whether you
are a classmate, lab partner, or someone forking this for your own coursework.

---

## Table of Contents

- [Contributing to Blockchain Lab](#contributing-to-blockchain-lab)
  - [Table of Contents](#table-of-contents)
  - [1. Code of Conduct](#1-code-of-conduct)
  - [2. Branch Strategy \& Protection](#2-branch-strategy--protection)
    - [Protected Branch — `main`](#protected-branch--main)
    - [Feature Branch Naming Convention](#feature-branch-naming-convention)
    - [Creating Your Branch](#creating-your-branch)
    - [Branch Scope](#branch-scope)
  - [3. Commit Message Nomenclature](#3-commit-message-nomenclature)
    - [Types](#types)
    - [Scopes](#scopes)
    - [Summary Rules](#summary-rules)
    - [Examples](#examples)
    - [Multi-line Commit Body (optional)](#multi-line-commit-body-optional)
  - [4. Pull Request Guidelines](#4-pull-request-guidelines)
    - [Before Opening a PR](#before-opening-a-pr)
    - [PR Title Format](#pr-title-format)
    - [PR Description Template](#pr-description-template)
    - [Review Process](#review-process)
    - [What PRs Are Accepted](#what-prs-are-accepted)
    - [PR Merging Strategy](#pr-merging-strategy)
      - [After merging `b-yourname` → `main` (no pending work on branch)](#after-merging-b-yourname--main-no-pending-work-on-branch)
      - [When `main` has moved ahead and you have pending work on `b-yourname`](#when-main-has-moved-ahead-and-you-have-pending-work-on-b-yourname)
      - [After a Copilot fix sub-PR merges into `b-yourname`](#after-a-copilot-fix-sub-pr-merges-into-b-yourname)
  - [5. Experiment File Conventions](#5-experiment-file-conventions)
    - [Required Files per Experiment Folder](#required-files-per-experiment-folder)
    - [PLAN File Rules (Summary)](#plan-file-rules-summary)
    - [DOC File Rules (Summary)](#doc-file-rules-summary)
  - [6. Smart Contract \& Solidity Standards](#6-smart-contract--solidity-standards)
  - [7. Security Guidelines](#7-security-guidelines)
  - [8. Getting Help](#8-getting-help)

---

## 1. Code of Conduct

This is an academic repository maintained for educational purposes under the University of Mumbai
B.E. (IT) SEM VIII curriculum. All contributors are expected to:

- Be respectful and constructive in all discussions.
- Keep contributions relevant to Blockchain Lab experiments and documentation.
- Never commit real private keys, mnemonics, or secrets of any kind.
- Cite sources if adapting external code for an experiment.

---

## 2. Branch Strategy & Protection

### Protected Branch — `main`

The `main` branch is **protected**:

- Direct pushes to `main` are **disabled**.
- All changes must go through a **Pull Request** with at least one review approval.
- PR checks must pass before merging.

> ⚠️ Never force-push to `main`. All history on `main` is considered stable and final.

### Feature Branch Naming Convention

All contributors **must** create their own feature branch following this pattern:

```
b-<yourname>
```

**Examples:**

| Contributor                   | Branch Name   |
| ----------------------------- | ------------- |
| Pratham Diwadkar (maintainer) | `b-pratham`   |
| Jane Doe                      | `b-jane`      |
| John Smith                    | `b-johnsmith` |

Use lowercase letters only. Avoid spaces, underscores, or special characters other than hyphens.

### Creating Your Branch

```bash
# Start from the latest main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b b-yourname
```

### Branch Scope

Each `b-<name>` branch may contain multiple experiments or documentation updates authored by that
contributor. For larger, isolated features (e.g., adding a new experiment set), you may create
sub-branches off your personal branch:

```bash
git checkout -b b-yourname-exp05-token
```

Merge sub-branches back into `b-yourname` before opening a PR to `main`.

---

## 3. Commit Message Nomenclature

All commit messages **must** follow this structure:

```
<type>(<scope>): <short summary>
```

### Types

| Type       | When to Use                                                          |
| ---------- | -------------------------------------------------------------------- |
| `feat`     | Adding a new experiment, feature, or significant content             |
| `fix`      | Fixing a bug, incorrect code, or broken configuration                |
| `docs`     | Documentation-only changes (README, manual, syllabus, guides)        |
| `chore`    | Maintenance tasks — `.gitignore`, dependency updates, repo config    |
| `refactor` | Code restructuring with no functional change                         |
| `test`     | Adding or updating test files for smart contracts                    |
| `style`    | Formatting, whitespace, comment edits — no logic changes             |
| `exp`      | Experiment-specific commit (new `.sol` file, migration, test run)    |
| `config`   | Config file changes — `hardhat.config.js`, `truffle-config.js`, etc. |

### Scopes

Use the scope to identify the area of the codebase being changed:

| Scope             | Refers to                                      |
| ----------------- | ---------------------------------------------- |
| `exp-1` … `exp-6` | Individual lab experiment folders              |
| `docs`            | Files inside `docs/`                           |
| `root`              | Root-level files (README, LICENSE, .gitignore) |
| `hardhat`           | Hardhat-specific config or scripts             |
| `truffle`           | Truffle-specific config or migrations          |
| `foundry`           | Foundry-specific config or scripts             |
| `remix`             | Remix IDE-related files                        |
| `contracts`         | Solidity smart contract files                  |
| `scripts`           | Deployment or utility scripts                  |
| `tests`             | Test files                                     |

### Summary Rules

- Use the **imperative mood**: `add`, `fix`, `update`, `remove` — not `added`, `fixes`, `updated`.
- Keep it under **72 characters**.
- Do **not** end with a period.
- Use **lowercase** after the colon — do not capitalize the summary.

### Examples

```
feat(exp-1): add SimpleStorage contract with Hardhat setup
fix(contracts): correct uint overflow in Token.sol transfer function
docs(docs): update BLOCKCHAIN_LAB_MANUAL.md with experiment 3 steps
chore(root): update .gitignore to exclude forge broadcast outputs
exp(exp-4): deploy ERC-20 token to Ganache local network
test(exp-2): add Mocha test suite for Voting contract
config(hardhat): set solidity version to 0.8.21 in hardhat.config.js
refactor(contracts): extract reusable modifier to BaseContract.sol
style(docs): fix markdown table alignment in DEPENDENCY.md
```

### Multi-line Commit Body (optional)

For complex commits, add a blank line after the summary and then a body explaining **why** the
change was made:

```
fix(contracts): prevent re-entrancy in Auction.sol withdraw

The original withdraw() function was vulnerable to re-entrancy attacks.
Applied the Checks-Effects-Interactions pattern and added a nonReentrant
modifier from OpenZeppelin ReentrancyGuard.
```

---

## 4. Pull Request Guidelines

### Before Opening a PR

- [ ] Your branch is up-to-date with `main` — run `git pull origin main` and resolve any conflicts.
- [ ] All Solidity contracts compile without errors (`npx hardhat compile` or `forge build`).
- [ ] Tests pass locally (`npx hardhat test` or `forge test`).
- [ ] No `.env` files, private keys, mnemonics, or secrets are included.
- [ ] Commit history is clean — squash or fixup any WIP/debug commits before opening the PR.

### PR Title Format

Follow the same `<type>(<scope>): <summary>` format used for commit messages:

```
feat(exp-3): add Voting smart contract with Hardhat tests
docs(docs): update BLOCKCHAIN_LAB_MANUAL.md for experiments 1–5
fix(contracts): resolve off-by-one error in Token.sol allowance logic
```

### PR Description Template

When opening a PR, use the following structure in the description:

```markdown
## Summary
<!-- What does this PR add, change, or fix? -->

## Experiment / Scope
<!-- Which experiment(s) or docs are affected? -->

## Changes Made
- 
- 

## Testing
<!-- How was this tested? (Hardhat test, Foundry forge test, Remix deployment, etc.) -->

## Checklist
- [ ] Contracts compile without errors
- [ ] Tests pass locally
- [ ] No secrets or private keys committed
- [ ] Documentation updated if applicable
```

### Review Process

1. Assign **@prathamxone** (maintainer) as reviewer.
2. Address all review comments before re-requesting a review.
3. Once approved, the PR will be merged using **Squash and Merge** to keep `main` history clean.
4. Delete your feature branch after a successful merge only if it is a one-off branch. Personal
   branches like `b-yourname` can be kept for ongoing work.

### What PRs Are Accepted

This is primarily a personal academic repository. PRs are accepted for:

- ✅ Corrections to experiment code (bug fixes, security improvements)
- ✅ Documentation improvements (typos, clarity, additional notes)
- ✅ New experiment implementations from the official syllabus
- ✅ Tooling improvements (`.gitignore`, config, scripts)
- ❌ Unrelated features or experiments outside the Mumbai University syllabus
- ❌ Bulk-formatting PRs with no substantive change
- ❌ PRs that include compiled artifacts, `node_modules`, or build outputs

### PR Merging Strategy

This repository uses a **two-strategy merge setup** to maintain linear history on `main` while keeping Copilot sub-PR workflows clean:

| PR Flow                                  | Merge Strategy       |
| ---------------------------------------- | -------------------- |
| `b-yourname` → `main`                    | **Squash and Merge** |
| `copilot/*` → `main`                     | **Squash and Merge** |
| `copilot/*` → `b-yourname` (fix sub-PRs) | **Merge Commit**     |

---

#### After merging `b-yourname` → `main` (no pending work on branch)

Every time a PR from `b-yourname` is merged into `main`, immediately sync your branch before starting new work:

```bash
# 1. Fetch latest remote state
git fetch origin

# 2. Switch to b-yourname
git checkout b-yourname

# 3. Reset to current main (since no pending work yet)
git reset --hard origin/main

# 4. Push the synced branch
git push origin b-yourname --force
```

#### When `main` has moved ahead and you have pending work on `b-yourname`

If you have new in-progress commits on `b-yourname` and `main` has moved ahead (e.g., after a Copilot chore PR or another contributor's PR merged into `main`):

```bash
# 1. Fetch latest remote state
git fetch origin

# 2. Switch to b-yourname
git checkout b-yourname

# 3. Replay your new commits on top of latest main
git rebase origin/main

# 4. Force-push the rebased branch
git push origin b-yourname --force
```

> ⚠️ Never use `git merge origin/main` into `b-yourname` — this creates a merge commit on your dev branch and causes the ahead/behind divergence issue.

#### After a Copilot fix sub-PR merges into `b-yourname`

When Copilot raises a fix sub-PR targeting `b-yourname` (e.g., `copilot/fix-xyz` → `b-yourname`) and it is merged, pull the changes into your local branch:

```bash
git fetch origin
git checkout b-yourname
git pull origin b-yourname    # safe here — merge commit already happened on remote
```

---

## 5. Experiment File Conventions

Organise each lab experiment in its own numbered folder at the root of the repository:

```
blockchain-lab/
├── Exp-1/                          # Experiment 1 — Local Blockchain with Truffle & Ganache
│   ├── contracts/
│   ├── ignition/
│   ├── migrations/
│   ├── screenshots/                # Output evidence for EXP-1_DOC.md (screenshots only)
│   ├── test/
│   ├── hardhat.config.js
│   ├── truffle-config.js
│   ├── EXP-1_PLAN.md               # Implementation blueprint — governed by docs/PLAN_RULE.md
│   ├── EXP-1_DOC.md                # College evaluation file — governed by docs/EXP-X_DOC_RULE.md
│   └── README.md                   # Aim, tools used, steps to run, expected output
├── Exp-2/                          # Experiment 2 — Smart Contracts & Chain Code
│   └── ...                         # (same structure as Exp-1)
├── Exp-3/                          # Experiment 3 — Deployment on Sepolia Testnet
│   └── ...
├── Exp-4/                          # Experiment 4 — ERC-20 Token with MetaMask
│   └── ...
├── Exp-5/                          # Experiment 5 — Hyperledger Fabric Chaincode
│   ├── chaincode/
│   ├── screenshots/
│   ├── EXP-5_PLAN.md
│   └── EXP-5_DOC.md
├── Exp-6/                          # Experiment 6 — Mini Project (Full-fledged DApp)
│   ├── src/
│   ├── script/
│   ├── scripts/
│   ├── test/
│   ├── screenshots/
│   ├── foundry.toml
│   ├── hardhat.config.js
│   ├── EXP-6_PLAN.md
│   ├── EXP-6_DOC.md
│   └── README.md
└── docs/
    ├── PLAN_RULE.md                # ← Governs all EXP-*_PLAN.md files
    ├── EXP-X_DOC_RULE.md          # ← Governs all EXP-*_DOC.md files
    └── ...
```

### Required Files per Experiment Folder

Each experiment folder **must** include these files:

| File | Purpose | Governed By |
|------|---------|-------------|
| `README.md` | Quick-start guide: Aim, Tools Used, Steps to Run, Expected Output | — |
| `EXP-X_PLAN.md` | Single source of truth for implementing the experiment — phases, file map, CDMs, checklists | `docs/PLAN_RULE.md` |
| `EXP-X_DOC.md` | College evaluation file: AIM, THEORY, CODE, OUTPUT, LAB OUTCOMES, CONCLUSION | `docs/EXP-X_DOC_RULE.md` |
| `screenshots/` | Directory containing all output screenshots for the DOC file. Add a `.gitkeep` file until real screenshots exist, since Git does not track empty directories. | `docs/EXP-X_DOC_RULE.md` |

### PLAN File Rules (Summary)

- Every `EXP-X_PLAN.md` must begin on **line 1** with `FILE_LENGTH_TAG=soft|medium|hard`.
- Must contain all 9 mandatory sections: §0 Snapshot → §9 Git Commit Checkpoints.
- No full code implementations — logical flow hints, structural skeletons ≤ 15 lines only.
- Full specification: **[docs/PLAN_RULE.md](docs/PLAN_RULE.md)**

### DOC File Rules (Summary)

- `EXP-X_DOC.md` must only be written **after the experiment is fully functional**.
- Mandatory sections in order: AIM → THEORY → IMPLEMENTATION (CODE + OUTPUT) → LAB OUTCOMES → CONCLUSION.
- Minimum 3, maximum 8 code snippets. All screenshots real (no placeholders).
- Screenshots saved as `fig-X.Y-description.png` in `Exp-X/screenshots/`.
- Full specification: **[docs/EXP-X_DOC_RULE.md](docs/EXP-X_DOC_RULE.md)**

---

## 6. Smart Contract & Solidity Standards

- Target **Solidity `^0.8.x`** for all contracts.
- Always specify the exact compiler version in `hardhat.config.js` or `truffle-config.js`.
- Use **SPDX license identifiers** at the top of every `.sol` file:
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.21;
  ```
- Follow **Checks-Effects-Interactions** pattern to prevent re-entrancy.
- Use **OpenZeppelin** contracts where applicable (ERC-20, ERC-721, ReentrancyGuard, Ownable).
- Write at minimum one Hardhat/Foundry test per contract function that changes state.
- Do **not** leave `console.log` imports (`hardhat/console.sol`) in production-path code.

---

## 7. Security Guidelines

> ⚠️ **Secrets committed to Git history are permanently exposed, even after deletion.**

- Never commit `.env` files — use `.env.example` with placeholder values instead.
- Never commit private keys, wallet mnemonics, or API keys (Alchemy, Infura, Etherscan).
- Never deploy lab contracts to Ethereum mainnet.
- Always use test accounts generated by Hardhat, Ganache, or Anvil for local experiments.
- The `.gitignore` already excludes `.env`, `*.pem`, `*.key`, and `secrets.json` — do not override
  these rules.

---

## 8. Getting Help

If you have questions about setting up the development environment, refer to:

- **[docs/DEPENDENCY.md](docs/DEPENDENCY.md)** — Full tool installation guide (Windows + WSL/Linux)
- **[docs/EXTENSION.md](docs/EXTENSION.md)** — VS Code extensions for Web3 development
- **[docs/BLOCKCHAIN_LAB_MANUAL.md](docs/BLOCKCHAIN_LAB_MANUAL.md)** — Lab manual with experiment procedures

For repository-specific questions or to report an issue, open a
[GitHub Issue](https://github.com/prathamxone/blockchain-lab/issues).

---

*Maintained by [Pratham Diwadkar](https://github.com/prathamxone) — INFT, Atharva College of Engineering*
