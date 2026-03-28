FILE_LENGTH_TAG=soft

# EXP-4_PLAN — Design and Develop Blockchain Program using MetaMask

> **Blockchain Lab · ITL801 · University of Mumbai · BE IT SEM VIII · AY 2025-26**
> Single source of truth for implementing Experiment 4. Read completely before writing any code.

---

## Table of Contents

- [EXP-4_PLAN — Design and Develop Blockchain Program using MetaMask](#exp-4_plan--design-and-develop-blockchain-program-using-metamask)
  - [Table of Contents](#table-of-contents)
  - [0. Experiment Snapshot](#0-experiment-snapshot)
    - [Network Awareness](#network-awareness)
  - [1. Pre-Flight Checklist](#1-pre-flight-checklist)
    - [1.1 Node \& nvm](#11-node--nvm)
    - [1.2 Global CLI Tools (under Node 22 context)](#12-global-cli-tools-under-node-22-context)
    - [1.3 Ports](#13-ports)
    - [1.4 Environment Files](#14-environment-files)
    - [1.5 MetaMask \& Testnet Wallet](#15-metamask--testnet-wallet)
    - [1.6 Dependencies](#16-dependencies)
  - [2. Repository File Map](#2-repository-file-map)
  - [3. Sequential Development Phases](#3-sequential-development-phases)
    - [Phase 1 — Environment \& Config Verification](#phase-1--environment--config-verification)
    - [Phase 2 — ERC-20 Token Contract Development](#phase-2--erc-20-token-contract-development)
    - [Phase 3 — Hardhat Ignition Deployment Module](#phase-3--hardhat-ignition-deployment-module)
    - [Phase 4 — Test Suite (Hardhat + Mocha/Chai)](#phase-4--test-suite-hardhat--mochachai)
    - [Phase 5 — Sepolia Testnet Pre-Launch](#phase-5--sepolia-testnet-pre-launch)
    - [Phase 6 — Sepolia Deploy via Hardhat Ignition](#phase-6--sepolia-deploy-via-hardhat-ignition)
    - [Phase 7 — Etherscan Contract Verification](#phase-7--etherscan-contract-verification)
    - [Phase 8 — Remix IDE + MetaMask Deploy (Mandatory)](#phase-8--remix-ide--metamask-deploy-mandatory)
    - [Phase 9 — Interaction Script + Screenshots + Final Cleanup](#phase-9--interaction-script--screenshots--final-cleanup)
  - [4. Crucial Development Moments (CDM)](#4-crucial-development-moments-cdm)
    - [CDM-1 — OZ v5 Ownable Constructor Signature _(Phase 2)_](#cdm-1--oz-v5-ownable-constructor-signature-phase-2)
    - [CDM-2 — dotenv Load Order Silent Failure _(Phase 1)_](#cdm-2--dotenv-load-order-silent-failure-phase-1)
    - [CDM-3 — Hardhat Ignition "Module Already Deployed" _(Phase 6)_](#cdm-3--hardhat-ignition-module-already-deployed-phase-6)
    - [CDM-4 — MetaMask Nonce Stuck After Network Switch _(Phase 8)_](#cdm-4--metamask-nonce-stuck-after-network-switch-phase-8)
    - [CDM-5 — Etherscan Verification Constructor Args Mismatch _(Phase 7)_](#cdm-5--etherscan-verification-constructor-args-mismatch-phase-7)
  - [5. Manual Execution Tasks](#5-manual-execution-tasks)
    - [MET-1 — MetaMask Sepolia Network Config + Test Wallet Import _(before Phase 5)_](#met-1--metamask-sepolia-network-config--test-wallet-import-before-phase-5)
    - [MET-2 — Sepolia Faucet ETH Request _(before Phase 6)_](#met-2--sepolia-faucet-eth-request-before-phase-6)
    - [MET-3 — Remix IDE + remixd + MetaMask Deploy _(Phase 8)_](#met-3--remix-ide--remixd--metamask-deploy-phase-8)
    - [MET-4 — MetaMask Add Token (PXT Import) _(Phase 8 / Phase 6)_](#met-4--metamask-add-token-pxt-import-phase-8--phase-6)
  - [6. Verification Checklist](#6-verification-checklist)
    - [6.1 Compilation \& Build](#61-compilation--build)
    - [6.2 Deployment](#62-deployment)
    - [6.3 Tests](#63-tests)
    - [6.4 Etherscan Verification](#64-etherscan-verification)
    - [6.5 MetaMask \& Token UI](#65-metamask--token-ui)
    - [6.6 Screenshot Capture](#66-screenshot-capture)
    - [6.7 Security \& Hygiene](#67-security--hygiene)
    - [6.8 Documentation](#68-documentation)
  - [7. Known Issues \& Fixes](#7-known-issues--fixes)
    - [Issue-1 — OZ v5 Import Path \& Constructor Change](#issue-1--oz-v5-import-path--constructor-change)
    - [Issue-2 — Hardhat 2.x Node 22 ExperimentalWarning](#issue-2--hardhat-2x-node-22-experimentalwarning)
    - [Issue-3 — MetaMask Pending Transaction Stuck](#issue-3--metamask-pending-transaction-stuck)
    - [Issue-4 — Hardhat Ignition Journal Conflict on Re-deploy](#issue-4--hardhat-ignition-journal-conflict-on-re-deploy)
    - [Issue-5 — remixd CORS / Connection Refused](#issue-5--remixd-cors--connection-refused)
  - [8. Security Reminders](#8-security-reminders)
  - [9. Git Commit Checkpoints](#9-git-commit-checkpoints)

---

## 0. Experiment Snapshot

| Field                    | Value                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| Experiment               | Exp-4 — To Design and develop Blockchain Program using Metamask        |
| Lab Outcome              | LO4 — Design and develop Cryptocurrency                                |
| Bloom's Taxonomy Level   | L4                                                                     |
| Primary Tool(s)          | Hardhat 2.28.x, OpenZeppelin Contracts 5.4.0                           |
| Supporting Tool(s)       | Remix IDE, MetaMask, remixd, ethers.js, Etherscan (Sepolia)            |
| Solidity Version         | 0.8.21                                                                 |
| Node Version             | v22.x.x (nvm alias: modern) — `.nvmrc = 22`                            |
| Token                    | Paxton (PXT) — ERC-20, 1,000,000 supply, 18 decimals                   |
| Local Network(s)         | Hardhat (31337) — for tests only; local deployment not a focus         |
| Testnet                  | Sepolia (11155111) — primary deployment target                         |
| Prerequisite Experiments | Exp-2 (Solidity knowledge), Exp-3 (Sepolia testnet + Hardhat Ignition) |
| Estimated Phases         | 9 phases                                                               |
| FILE_LENGTH_TAG          | Assigned after authoring — see line 1                                  |

> 📌 **Note** — Local blockchain deployment is explicitly de-prioritised in this experiment. All Truffle/Ganache checks have been removed since Exp-1 and Exp-3 have already covered those workflows. The Hardhat local node is used **only** for running the test suite.

### Network Awareness

| Network   | Type              | Chain ID | Port           | Tool                     | When Used                  |
| --------- | ----------------- | -------- | -------------- | ------------------------ | -------------------------- |
| `hardhat` | Local (ephemeral) | 31337    | — (in-process) | Hardhat                  | Phase 4 — unit tests only  |
| `sepolia` | Testnet (public)  | 11155111 | 443 (HTTPS)    | Hardhat Ignition / Remix | Primary — Phase 6, Phase 8 |

> ⚠️ **Warning** — Never reference or use deprecated testnets: Ropsten (shutdown Sep 2022), Rinkeby (shutdown Oct 2022), Goerli (deprecated Oct 2023). **Sepolia is the only testnet used in this experiment.**

---

## 1. Pre-Flight Checklist

Run these checks **before starting Phase 1**. Do not proceed if any item fails.

### 1.1 Node & nvm

- [ ] `nvm --version` confirms nvm ≥ 0.40.x is installed
- [ ] `nvm use 22` succeeds — outputs `Now using node v22.x.x (npm v10.x.x)`
- [ ] `node --version` inside `Exp-4/` outputs `v22.x.x` (`.nvmrc = 22` respected)

### 1.2 Global CLI Tools (under Node 22 context)

- [ ] `remixd --version` → 0.6.x _(required for Phase 8 Remix IDE bridge)_
- [ ] `npx hardhat --version` → 2.28.x _(resolved from local `node_modules`)_

> 📌 **Note** — Truffle and Ganache are **not required** for this experiment. Remove or ignore any Truffle pre-flight steps from earlier experiments.

### 1.3 Ports

- [ ] Port `31337` is free — `lsof -i :31337` returns empty _(Hardhat local node for tests)_

> 📌 **Note** — Ports 7545 and 8545 are not required; no local Ganache node is started in this experiment.

### 1.4 Environment Files

- [ ] `Exp-4/.env` exists locally and is **NOT** tracked by git — `git status` confirms absence
- [ ] `Exp-4/.env.example` is present — _(already committed; do not modify without intent)_
- [ ] `Exp-4/.env` contains all three required keys with non-placeholder values:
  - `PRIVATE_KEY` — 64-hex private key of **dedicated Sepolia test wallet** (never a mainnet key)
  - `ALCHEMY_API_KEY` — valid Alchemy API key for Sepolia RPC
  - `ETHERSCAN_API_KEY` — valid Etherscan API key for verification

### 1.5 MetaMask & Testnet Wallet

- [ ] MetaMask browser extension installed and unlocked
- [ ] A **dedicated test wallet** (not your primary wallet) is imported or created in MetaMask
- [ ] MetaMask is switched to the **Sepolia** test network
- [ ] Sepolia wallet balance ≥ 0.05 ETH (check at [https://sepolia.etherscan.io](https://sepolia.etherscan.io))

> ⚠️ **Warning** — Never use a MetaMask wallet that holds real ETH or mainnet assets for any lab experiment.

### 1.6 Dependencies

- [ ] `Exp-4/node_modules/` exists — run `npm install` from `Exp-4/` if absent
- [ ] `@openzeppelin/contracts` version is **5.4.x** — `cat node_modules/@openzeppelin/contracts/package.json | grep '"version"'`
- [ ] `npx hardhat compile` exits 0 with 0 errors _(will fail until `contracts/PaxtonToken.sol` is created — verify after Phase 2)_

---

## 2. Repository File Map

> **Legend**: `CREATE` — new file | `UPDATE` — modify existing | `DELETE` — remove | `VERIFY` — read-only reference

| #   | File Path (relative to `Exp-4/`) | Action | Phase | Purpose                                                                     |
| --- | -------------------------------- | ------ | ----- | --------------------------------------------------------------------------- |
| 1   | `contracts/PaxtonToken.sol`      | CREATE | 2     | ERC-20 Paxton (PXT) token contract — OZ v5 ERC20 + Ownable                  |
| 2   | `ignition/modules/Deploy.js`     | CREATE | 3     | Hardhat Ignition deployment module for PaxtonToken                          |
| 3   | `test/PaxtonToken.test.js`       | CREATE | 4     | Mocha/Chai test suite — basics + mint + onlyOwner                           |
| 4   | `scripts/interact.js`            | CREATE | 9     | ethers.js post-deploy interaction script (query + transfer)                 |
| 5   | `hardhat.config.js`              | VERIFY | 1     | Confirm Solidity 0.8.21 + Sepolia network block + etherscan key             |
| 6   | `.env.example`                   | VERIFY | 1     | Confirm PRIVATE_KEY, ALCHEMY_API_KEY, ETHERSCAN_API_KEY present             |
| 7   | `.env`                           | VERIFY | 1     | Must exist locally, NOT tracked by git                                      |
| 8   | `package.json`                   | VERIFY | 1     | Confirm npm scripts: compile, test, deploy:sepolia, verify:sepolia          |
| 9   | `screenshots/`                   | VERIFY | 9     | Directory for all captured output screenshots (`.gitkeep` until populated)  |
| 10  | `EXP-4_PLAN.md`                  | VERIFY | —     | Confirm FILE_LENGTH_TAG on line 1 matches actual line count after authoring |

> 📌 **Note** — `migrations/` exists but is intentionally empty. No Truffle migration files will be created for this experiment. `ignition/modules/.gitkeep` must be removed when `Deploy.js` is created.

---

## 3. Sequential Development Phases

---

### Phase 1 — Environment & Config Verification

**Goal**: Confirm all tools, versions, and configuration files are correctly set up for Sepolia deployment before touching any source file.

**Files Touched**: `hardhat.config.js` (VERIFY), `.env` (VERIFY), `.env.example` (VERIFY), `package.json` (VERIFY)

<!-- TOOL: SHELL -->

**Logical Flow**:

1. `cd Exp-4 && nvm use 22` — switch to Node 22; confirm output matches `.nvmrc`.
2. Verify `node_modules/` exists; if not, run `npm install`.
3. Inspect `hardhat.config.js` — confirm all of:
   - `solidity.version` = `"0.8.21"`
   - `networks.sepolia.url` uses `ALCHEMY_API_KEY` (primary) with `INFURA_API_KEY` fallback
   - `networks.sepolia.chainId` = `11155111`
   - `etherscan.apiKey` = `ETHERSCAN_API_KEY`
4. Confirm `require("dotenv").config()` is called at the **top** of `hardhat.config.js`, before any env variable is read. See **CDM-2**.
5. Verify `.env` is present locally: `ls -la .env`.
6. Confirm `.env` is gitignored: `git status` must not list it.
7. Check `package.json` scripts contain `deploy:sepolia` and `verify:sepolia`.
8. Confirm `@openzeppelin/contracts` ≥ 5.4.0: `npm list @openzeppelin/contracts`.

**Exit Criteria**: All Pre-Flight Checklist §1 items pass. `npx hardhat --version` exits 0.

---

### Phase 2 — ERC-20 Token Contract Development

**Goal**: Write the `PaxtonToken.sol` ERC-20 smart contract using OpenZeppelin v5, following the Paxton (PXT) token specification.

**Files Touched**: `contracts/PaxtonToken.sol` (CREATE)

> ⚠️ See **CDM-1** before writing this contract. OZ v5 `Ownable` constructor signature is different from v4 — research before coding.

<!-- TOOL: SOLIDITY -->

**Logical Flow**:

1. Create `contracts/PaxtonToken.sol` with SPDX-License-Identifier (`MIT`) and `pragma solidity ^0.8.21`.
2. Import OZ v5 `ERC20.sol` and `Ownable.sol` from `@openzeppelin/contracts`.
3. Define `contract PaxtonToken is ERC20, Ownable`.
4. Implement `constructor(address initialOwner)` — pass `initialOwner` to `Ownable` (OZ v5 requirement); call `ERC20("Paxton", "PXT")`; `_mint` 1,000,000 PXT to deployer.
5. Implement `mint(address to, uint256 amount) public onlyOwner` — allows owner to mint additional supply post-deploy.
6. Implement `burn(uint256 amount) public` — allows any holder to burn their own tokens (optional but good practice for test coverage).
7. Add a `Transfer` event observation note: OZ ERC20 already emits `Transfer` and `Approval` events — do not re-declare.
8. Compile after writing: `npx hardhat compile` — fix any errors before proceeding.

**Logical Hint** (structure only — no full implementation):

<!-- File: contracts/PaxtonToken.sol — skeleton only -->

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaxtonToken is ERC20, Ownable {
  constructor(
    address initialOwner
  ) ERC20("Paxton", "PXT") Ownable(initialOwner) {
    /* _mint 1_000_000 * 10**decimals() to msg.sender */
  }

  function mint(address to, uint256 amount) public onlyOwner {
    /* _mint */
  }
  function burn(uint256 amount) public {
    /* _burn */
  }
}
```

**Exit Criteria**: `npx hardhat compile` exits 0 with 0 errors. `artifacts/contracts/PaxtonToken.sol/PaxtonToken.json` is generated.

---

### Phase 3 — Hardhat Ignition Deployment Module

**Goal**: Create the Hardhat Ignition module that declares how `PaxtonToken` is deployed. This module is used for both testnet and optional local deploys.

**Files Touched**: `ignition/modules/Deploy.js` (CREATE — replaces `.gitkeep`)

<!-- TOOL: HARDHAT -->

**Logical Flow**:

1. Delete `ignition/modules/.gitkeep` — it must not coexist with `Deploy.js`.
2. Create `ignition/modules/Deploy.js` using `buildModule` from `@nomicfoundation/hardhat-ignition/modules`.
3. Declare the `PaxtonTokenModule` — use `m.contract("PaxtonToken", [deployerAddress])` where `deployerAddress` is the deploying account.
4. Export the module as the default export.
5. The `initialOwner` constructor arg must be the **deployer's address** — Ignition resolves this via `m.getAccount(0)` or equivalent.
6. Verify the module by doing a dry-run locally: `npx hardhat ignition deploy ./ignition/modules/Deploy.js --network hardhat` (ephemeral — only for module syntax validation, not as a permanent local deploy).

**Logical Hint** (structure only):

<!-- File: ignition/modules/Deploy.js — skeleton only -->

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PaxtonTokenModule", (m) => {
  const deployer = m.getAccount(0);
  const token = m.contract("PaxtonToken", [deployer]);
  return { token };
});
```

**Exit Criteria**: `npx hardhat ignition deploy ./ignition/modules/Deploy.js --network hardhat` completes without error (ephemeral deploy — address will differ each run).

---

### Phase 4 — Test Suite (Hardhat + Mocha/Chai)

**Goal**: Write a comprehensive Hardhat test suite for `PaxtonToken` covering ERC-20 basics and owner-gated functions.

**Files Touched**: `test/PaxtonToken.test.js` (CREATE — replaces `.gitkeep`)

<!-- TOOL: HARDHAT -->

**Logical Flow**:

1. Delete `test/.gitkeep` — it must not coexist with the test file.
2. Create `test/PaxtonToken.test.js` using Hardhat's built-in `ethers` and `expect` from `chai`.
3. Structure tests in `describe("PaxtonToken", () => { ... })` blocks:

   **Block A — Deployment**
   - Verify token name = `"Paxton"`, symbol = `"PXT"`, decimals = `18`.
   - Verify `totalSupply` = `1,000,000 * 10**18`.
   - Verify deployer holds the full initial supply.
   - Verify deployer is the `owner`.

   **Block B — Transfer**
   - Transfer 100 PXT from deployer to `addr1` — assert balances update correctly.
   - Verify `Transfer` event is emitted with correct args.

   **Block C — Allowance & transferFrom**
   - Approve `addr1` to spend 50 PXT from deployer — assert `allowance`.
   - `transferFrom` 50 PXT to `addr2` via `addr1` — assert balances and reduced allowance.

   **Block D — Mint (onlyOwner)**
   - Owner mints 500 PXT to `addr1` — assert `totalSupply` increases and `addr1` balance updates.
   - Non-owner calls `mint` — assert `OwnableUnauthorizedAccount` revert (OZ v5 error selector).

   **Block E — Burn**
   - Deployer burns 200 PXT — assert `totalSupply` decreases and deployer balance decreases.

4. Use `ethers.parseUnits("100", 18)` for all token amount expressions — never use raw integers.
5. Run after writing: `npx hardhat test`.

**Exit Criteria**: `npx hardhat test` → all tests passing, 0 failing. Minimum test count: 10 assertions.

---

### Phase 5 — Sepolia Testnet Pre-Launch

**Goal**: Ensure all prerequisites for Sepolia deployment are satisfied — .env keys loaded, MetaMask wallet funded, and RPC connection verified.

**Files Touched**: `.env` (VERIFY — read-only, do not stage)

> ⚠️ See **CDM-2** before this phase. Confirm dotenv is loaded before verifying env vars.

<!-- TOOL: SHELL -->

**Logical Flow**:

1. Verify `.env` is not staged: `git status` — must not list `.env`.
2. Confirm `PRIVATE_KEY` value in `.env` is a 64-character hex string (strip any `0x` prefix confusion).
3. Confirm `ALCHEMY_API_KEY` is set: the Alchemy endpoint must be for **Ethereum — Sepolia** (not Mainnet).
4. Test RPC connectivity:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
     https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>
   ```
   Expected response: `{"result":"0xaa36a7"}` (hex for 11155111).
5. Complete **MET-1** (MetaMask Sepolia config) and **MET-2** (faucet ETH) before proceeding to Phase 6.
6. Confirm wallet balance ≥ 0.05 ETH via MetaMask or Etherscan.

**Exit Criteria**: RPC returns `chainId = 0xaa36a7`. MetaMask Sepolia wallet shows ≥ 0.05 ETH balance.

---

### Phase 6 — Sepolia Deploy via Hardhat Ignition

**Goal**: Deploy `PaxtonToken` to Sepolia testnet using Hardhat Ignition. Capture the deployed contract address for subsequent phases.

**Files Touched**: `.env` (VERIFY), `ignition/modules/Deploy.js` (VERIFY)

> ⚠️ See **CDM-3** before running this step — Ignition journal state can block re-deploys.

<!-- TOOL: HARDHAT -->

**Logical Flow**:

1. Ensure Phase 5 exit criteria are met (Sepolia ETH in wallet, `.env` loaded).
2. Run Sepolia deployment:
   ```bash
   npm run deploy:sepolia
   ```
   This runs: `npx hardhat ignition deploy ./ignition/modules/Deploy.js --network sepolia`
3. Wait for the transaction to confirm on Sepolia (typically 15–30 seconds).
4. **Note the deployed contract address** printed to console — format: `PaxtonTokenModule#PaxtonToken - 0x<ADDRESS>`. Copy this address immediately.
5. Verify the deployment on Sepolia Etherscan: `https://sepolia.etherscan.io/address/0x<ADDRESS>` — confirm contract code, `name()`, `symbol()`, `totalSupply()` are visible.
6. Save the contract address for Phase 7 (Etherscan verification) and Phase 8 (Remix interaction).

**Exit Criteria**: Hardhat Ignition prints `PaxtonTokenModule#PaxtonToken - 0x<ADDRESS>`. Sepolia Etherscan shows the transaction confirmed.

---

### Phase 7 — Etherscan Contract Verification

**Goal**: Verify the `PaxtonToken` source code on Sepolia Etherscan so the contract ABI and source are publicly readable.

**Files Touched**: `hardhat.config.js` (VERIFY — `etherscan.apiKey` must be set)

> ⚠️ See **CDM-5** before running verification — constructor args must match exactly.

<!-- TOOL: HARDHAT -->

**Logical Flow**:

1. Confirm `ETHERSCAN_API_KEY` in `.env` is valid — generate at [https://etherscan.io/myapikey](https://etherscan.io/myapikey) if not.
2. Run verification command:
   ```bash
   npm run verify:sepolia <TOKEN_CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
   ```
   This runs: `npx hardhat verify --network sepolia <ADDRESS> <OWNER_ADDRESS>`
   - `<TOKEN_CONTRACT_ADDRESS>` — address from Phase 6.
   - `<INITIAL_OWNER_ADDRESS>` — the deployer wallet address (the `initialOwner` constructor arg).
3. Wait for Etherscan to verify — typically 10–60 seconds.
4. Confirm the ✅ verified badge appears on: `https://sepolia.etherscan.io/address/0x<ADDRESS>#code`.
5. Take a screenshot of the verified contract page — it is required for `EXP-4_DOC.md` output section.

**Exit Criteria**: Etherscan shows ✅ "Contract Source Code Verified" badge. Code tab shows `PaxtonToken.sol` source.

---

### Phase 8 — Remix IDE + MetaMask Deploy (Mandatory)

**Goal**: Deploy `PaxtonToken` to Sepolia via Remix IDE using the **Injected Provider — MetaMask** method. This phase is mandatory for producing the evaluation screenshots required by `EXP-4_DOC.md`.

**Files Touched**: None (Remix IDE is browser-based; no local files are created in this phase)

> ⚠️ See **CDM-4** before this phase — MetaMask nonce issues are very common after network switches.
> 💡 **Tip** — Even if the contract was already deployed in Phase 6, this phase deploys a **fresh instance** via Remix to produce clean, evaluator-facing UI screenshots.

<!-- TOOL: SHELL -->

**Logical Flow (remixd bridge setup)**:

1. Start the `remixd` bridge from the `Exp-4/` directory:
   ```bash
   remixd -s ./contracts --remix-ide https://remix.ethereum.org
   ```
2. Confirm `remixd` outputs: `Shared folder: ./contracts`. Keep this terminal open.

<!-- TOOL: REMIX -->

**Logical Flow (Remix IDE — browser)**: 3. Open [https://remix.ethereum.org](https://remix.ethereum.org) in Chrome. 4. In the **Workspaces** panel → click the **Remixd** icon → select **Connect to Localhost**. 5. The `contracts/` folder appears — open `PaxtonToken.sol`. 6. In the **Solidity Compiler** tab:

- Set compiler version to `0.8.21`.
- Enable **Optimization** (200 runs) to match `hardhat.config.js` settings.
- Click **Compile PaxtonToken.sol** — confirm 0 errors.

<!-- TOOL: METAMASK -->

**Logical Flow (MetaMask + Deploy)**: 7. Complete **MET-3** (see §5) — switch MetaMask to Sepolia. 8. In the **Deploy & Run Transactions** tab:

- Set **Environment** to `Injected Provider — MetaMask`.
- MetaMask popup appears — connect your Sepolia test wallet.
- Confirm **Custom (11155111) network** is shown in Remix.

9. Under **Contract**, select `PaxtonToken`.
10. In the `Deploy` input field: enter the `initialOwner` address (your MetaMask Sepolia address).
11. Click **Deploy** → MetaMask confirmation popup → review gas → **Confirm**.
12. Wait for transaction confirmation — Remix console shows the deployed address.
13. Complete **MET-4** (MetaMask Add Token / PXT Import) — see §5.
14. **Take required screenshots** (see §6.6 Screenshot Capture).

**Exit Criteria**: Remix console shows the `PaxtonToken` contract address. MetaMask shows PXT token balance = 1,000,000 PXT.

---

### Phase 9 — Interaction Script + Screenshots + Final Cleanup

**Goal**: Write a post-deploy ethers.js interaction script, capture all remaining screenshots, and ensure the repo state is clean for commit.

**Files Touched**: `scripts/interact.js` (CREATE), `screenshots/` (VERIFY/POPULATE)

<!-- TOOL: ETHERSJS -->

**Logical Flow (Interaction Script)**:

1. Create `scripts/interact.js` — query `totalSupply`, `name`, `symbol`, deployer `balanceOf`, and perform a test `transfer` to a second address.
2. The script must load the deployed contract address from a command-line arg or a constant — **never hardcode a private key in the script**.
3. Use `ethers.getContractAt("PaxtonToken", <CONTRACT_ADDRESS>)` to attach to the deployed instance.
4. Run against Sepolia: `npx hardhat run scripts/interact.js --network sepolia`.
5. Capture terminal output for documentation.

**Logical Hint** (structure only):

<!-- File: scripts/interact.js — skeleton only -->

```javascript
const { ethers } = require("hardhat");
async function main() {
  const token = await ethers.getContractAt("PaxtonToken", "<CONTRACT_ADDRESS>");
  const name = await token.name(); // "Paxton"
  const symbol = await token.symbol(); // "PXT"
  const supply = await token.totalSupply(); // 1_000_000 * 10**18
  // transfer, balanceOf queries ...
  console.log({ name, symbol, supply: ethers.formatUnits(supply, 18) });
}
main().catch(console.error);
```

<!-- TOOL: SHELL -->

**Logical Flow (Screenshots + Cleanup)**: 6. Capture all required screenshots (see §6.6) — save to `screenshots/` with correct naming convention. 7. If `screenshots/.gitkeep` exists and real screenshots are added, **delete** `.gitkeep`. 8. Run final compile and test: `npx hardhat compile && npx hardhat test` — both must exit 0. 9. Confirm no `.env` is staged: `git status`. 10. Confirm `artifacts/` and `cache/` are gitignored: `cat .gitignore | grep artifacts`. 11. Run formatter: `npm run format` — ensures consistent `.sol`, `.js`, `.json` formatting. 12. Update `FILE_LENGTH_TAG` on line 1 of `EXP-4_PLAN.md` with the correct tag (`soft`, `medium`, or `hard`) based on actual line count of this file.

**Exit Criteria**: `git status` shows only intentional tracked files. `npx hardhat test` all passing. All required screenshots present in `screenshots/`.

---

## 4. Crucial Development Moments (CDM)

> ⚠️ Read every CDM before starting the corresponding phase. These are the most common failure points.

---

#### CDM-1 — OZ v5 Ownable Constructor Signature _(Phase 2)_

**Risk**: Using OpenZeppelin v4 syntax when the project has `@openzeppelin/contracts ^5.4.0` installed — a very common mistake since most online tutorials and AI-generated code still use v4 patterns.

**Why it matters**: OZ v5 changed `Ownable`'s constructor to require an explicit `initialOwner` address argument. Writing `Ownable()` (v4 style) will cause a **compile error** on OZ v5. Additionally, `_msgSender()` patterns and some internal functions have been reorganised.

**What to do**:

- Before writing any code, research the current OZ v5 `Ownable` constructor signature by reading the installed source: `cat node_modules/@openzeppelin/contracts/access/Ownable.sol | head -40`.
- Alternative: Read the official OZ v5 migration guide at [https://docs.openzeppelin.com/contracts/5.x/api/access#Ownable](https://docs.openzeppelin.com/contracts/5.x/api/access#Ownable).
- Verification: `npx hardhat compile` exits 0 — any OZ v5 mismatch will surface immediately as a compile error.

**Common Mistake**: Copy-pasting `constructor() Ownable() { ... }` from a v4 tutorial — this will fail to compile on OZ v5.

> 💡 **Tip** — When in doubt, look at the actual installed file, not documentation from a web search that may return v4 results.

---

#### CDM-2 — dotenv Load Order Silent Failure _(Phase 1)_

**Risk**: `require("dotenv").config()` is called **after** the `PRIVATE_KEY` or `ALCHEMY_API_KEY` constant is read in `hardhat.config.js`, causing env variables to silently resolve to `undefined` or the fallback placeholder string.

**Why it matters**: If `PRIVATE_KEY` is `undefined`, the Sepolia network `accounts` array becomes empty `[]`. The deploy transaction will broadcast with no signer, causing a cryptic error like `No private key was provided` or a zero-balance deploy attempt.

**What to do**:

- Inspect `hardhat.config.js` — `require("dotenv").config()` must be the **very first line** before any `const` declarations that read `process.env.*`.
- Verification after fix:
  ```bash
  node -e "require('dotenv').config(); console.log(process.env.PRIVATE_KEY ? 'LOADED' : 'MISSING')"
  ```
  Run from `Exp-4/` — must log `LOADED`.

**Common Mistake**: Placing `require("dotenv").config()` below the `const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x000..."` line — the env file is read too late.

---

#### CDM-3 — Hardhat Ignition "Module Already Deployed" _(Phase 6)_

**Risk**: Re-running `npm run deploy:sepolia` after a previous successful deploy returns an error or silently no-ops because Hardhat Ignition tracks deployment state in `ignition/deployments/` journal files.

**Why it matters**: If the journal exists for `PaxtonTokenModule` on Sepolia, Ignition assumes the contract is already deployed and will not create a new deployment. This blocks Phase 8 if a fresh Remix deploy is needed, and blocks re-testing Phase 6.

**What to do**:

- To force a fresh deploy, add the `--reset` flag:
  ```bash
  npx hardhat ignition deploy ./ignition/modules/Deploy.js --network sepolia --reset
  ```
- Alternatively, delete the relevant journal: `rm -rf ignition/deployments/chain-11155111/`.
- The `ignition/deployments/` directory is gitignored — confirm with `git status`.
- Verification: After reset, deploy output shows a new transaction hash and a new contract address.

**Common Mistake**: Running deploy a second time without `--reset` and assuming the old address is still valid — it is, but only if the previous deploy succeeded cleanly.

---

#### CDM-4 — MetaMask Nonce Stuck After Network Switch _(Phase 8)_

**Risk**: MetaMask gets stuck on a "pending" transaction after switching between networks (e.g., Hardhat local → Sepolia), causing all subsequent Remix + MetaMask transactions to hang indefinitely.

**Why it matters**: If the Remix Phase 8 deploy hangs in MetaMask with a "Pending" status and never confirms, it is almost certainly a nonce mismatch — MetaMask expects a local nonce that doesn't match Sepolia's state.

**What to do**:

- Open MetaMask → Settings → Advanced → **Reset Account**.
- This clears MetaMask's local transaction history and nonce cache — **it does NOT affect on-chain funds or deployed contracts**.
- After reset, switch to Sepolia and retry the Remix deploy.
- Verification: MetaMask shows the deploy transaction as "Confirmed" within ~30 seconds.

**Common Mistake**: Cancelling the stuck transaction and retrying without resetting — the nonce mismatch persists.

---

#### CDM-5 — Etherscan Verification Constructor Args Mismatch _(Phase 7)_

**Risk**: Running `npx hardhat verify` without passing the correct constructor arguments causes Etherscan to reject verification with `"Bytecode does not match"` or `"Constructor arguments mismatch"`.

**Why it matters**: `PaxtonToken` takes `initialOwner` (an `address`) as its constructor argument. Etherscan's bytecode verification requires all constructor args to be passed to the verify command in the exact order they appear in the Solidity constructor.

**What to do**:

- Pass the `initialOwner` address explicitly in the verify command:
  ```bash
  npx hardhat verify --network sepolia <TOKEN_ADDRESS> <INITIAL_OWNER_ADDRESS>
  ```
- `<INITIAL_OWNER_ADDRESS>` must be the **exact address used during Phase 6 deployment** — this is the deployer's MetaMask Sepolia address.
- Verification: Etherscan page shows ✅ "Contract Source Code Verified".

**Common Mistake**: Running `npx hardhat verify --network sepolia <TOKEN_ADDRESS>` without the constructor arg — Etherscan rejects it silently or with a mismatch error.

---

## 5. Manual Execution Tasks

These steps must be performed **by hand** by the developer. They cannot be automated.

---

### MET-1 — MetaMask Sepolia Network Config + Test Wallet Import _(before Phase 5)_

1. Open the **MetaMask** browser extension → click the **network selector** at the top.
2. If Sepolia is not listed: click **Add a network** → **Add a network manually**.
3. Fill in Sepolia network details:
   - **Network Name**: `Sepolia test network`
   - **New RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>` (or MetaMask default Sepolia RPC)
   - **Chain ID**: `11155111`
   - **Currency Symbol**: `ETH`
   - **Block Explorer URL**: `https://sepolia.etherscan.io`
4. Click **Save** → switch to the Sepolia network in MetaMask.
5. If the test wallet is not already in MetaMask: click **Import Account** → paste the `PRIVATE_KEY` from `.env` (64-char hex with `0x` prefix).
6. Confirm the imported account address matches the deployer address you plan to use.
7. Verify Sepolia ETH balance is visible (may be 0 ETH before MET-2).

---

### MET-2 — Sepolia Faucet ETH Request _(before Phase 6)_

1. Navigate to a Sepolia faucet (try in order if rate-limited):
   - **Alchemy Faucet**: [https://sepoliafaucet.com](https://sepoliafaucet.com) — requires Alchemy account login
   - **Chainlink Faucet**: [https://faucets.chain.link/sepolia](https://faucets.chain.link/sepolia) — requires mainnet ≥ 1 ETH
   - **Google Cloud Faucet**: [https://cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) — requires Google account
2. Connect MetaMask or paste your Sepolia test wallet address.
3. Request test ETH — minimum required: **0.05 ETH** (0.1 ETH recommended; multiple deploy attempts are likely).
4. Wait for the faucet transaction to confirm (typically 15–90 seconds on Sepolia).
5. Verify balance in MetaMask or at: `https://sepolia.etherscan.io/address/<YOUR_ADDRESS>`.

> 📌 **Note** — Keep at least 0.05 ETH minimum before starting Phase 6. Phase 8 (Remix deploy) also requires a small amount for gas.

---

### MET-3 — Remix IDE + remixd + MetaMask Deploy _(Phase 8)_

1. Start `remixd` from the `Exp-4/` directory (terminal stays open throughout):
   ```bash
   remixd -s ./contracts --remix-ide https://remix.ethereum.org
   ```
2. Open [https://remix.ethereum.org](https://remix.ethereum.org) in **Google Chrome**.
3. In the Remix left sidebar → click **Plugin Manager** (plug icon) → search `remixd` → **Activate**.
4. A **localhost** connector icon appears — click **Connect to Localhost** → accept the connection prompt.
5. `contracts/PaxtonToken.sol` appears in the Remix file explorer.
6. Switch MetaMask to **Sepolia** network before changing the Remix environment.
7. In **Solidity Compiler** tab: set version to `0.8.21`, enable **Optimization** (200 runs) → **Compile PaxtonToken.sol**.
8. In **Deploy & Run Transactions** tab:
   - **Environment**: `Injected Provider — MetaMask`
   - MetaMask connection popup → approve → confirm Remix shows `Custom (11155111) network`.
9. Under **Contract**, select `PaxtonToken`. In the `Deploy` constructor input enter your MetaMask Sepolia address as `initialOwner`.
10. Click **transact (Deploy)** → MetaMask gas confirmation popup → **Confirm**.
11. Deployment transaction confirms in ~15–30 seconds — Remix console shows the new contract address.

> ⚠️ See **CDM-4** if MetaMask shows a stuck "Pending" state — reset the account nonce before retrying.

---

### MET-4 — MetaMask Add Token (PXT Import) _(after Phase 6 or Phase 8)_

1. Open **MetaMask** and confirm you are on **Sepolia** network.
2. Scroll to the bottom of the Assets tab → click **Import tokens**.
3. Select the **Custom token** tab.
4. Paste the deployed `PaxtonToken` contract address (from Phase 6 or Phase 8).
5. MetaMask auto-detects and populates: **Token Symbol = PXT**, **Token Decimals = 18**.
6. Click **Add custom token** → **Import tokens**.
7. Verify: **PXT** appears in the Assets list with balance = **1,000,000 PXT**.
8. **Screenshot** the MetaMask window showing PXT balance — required for `EXP-4_DOC.md` Fig 4.4.

---

## 6. Verification Checklist

Complete every item before committing the final state of this experiment.

### 6.1 Compilation & Build

- [ ] `npx hardhat compile` → 0 errors, 0 unexpected warnings
- [ ] `artifacts/contracts/PaxtonToken.sol/PaxtonToken.json` exists with correct `abi` and `bytecode`

### 6.2 Deployment

- [ ] Sepolia deployment transaction confirmed — `https://sepolia.etherscan.io` shows successful `Contract Creation` tx
- [ ] Deployed contract address captured from Ignition output: `PaxtonTokenModule#PaxtonToken - 0x<ADDRESS>`
- [ ] Contract address saved for Phase 7, 8, and `EXP-4_DOC.md` usage

### 6.3 Tests

- [ ] `npx hardhat test` → all test cases passing, 0 failing
- [ ] Test blocks covered: Deployment, Transfer, Allowance+transferFrom, Mint (onlyOwner), Burn
- [ ] Non-owner `mint` call asserts `OwnableUnauthorizedAccount` revert (OZ v5 custom error)

### 6.4 Etherscan Verification

- [ ] Sepolia Etherscan shows ✅ "Contract Source Code Verified" badge on `#code` tab
- [ ] `PaxtonToken.sol` source is readable, `name()` = `"Paxton"`, `symbol()` = `"PXT"`
- [ ] Contract ABI is public and browsable on Etherscan

### 6.5 MetaMask & Token UI

- [ ] MetaMask connected to Sepolia (Chain ID 11155111 confirmed in Remix and MetaMask header)
- [ ] PXT custom token imported — balance shows **1,000,000 PXT**
- [ ] Remix Deploy & Run shows `Injected Provider — MetaMask` with `Custom (11155111) network`

### 6.6 Screenshot Capture

Save all screenshots to `Exp-4/screenshots/` with naming format `fig-4.Y-description.png`:

| Fig                  | Required Screenshot                                                | Example Name                              |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Fig 4.1              | Terminal: `npx hardhat compile` output (0 errors)                  | `fig-4.1-hardhat-compile-output.png`      |
| Fig 4.2              | Terminal: Hardhat Ignition Sepolia deploy (address printed)        | `fig-4.2-sepolia-deploy-ignition.png`     |
| Fig 4.3              | Sepolia Etherscan: verified contract page (✅ badge visible)       | `fig-4.3-etherscan-verified-contract.png` |
| Fig 4.4              | Remix IDE: Compile + Deploy & Run tab (Injected Provider, Sepolia) | `fig-4.4-remix-deploy-metamask.png`       |
| Fig 4.5              | MetaMask: Import Token screen (PXT symbol, 18 decimals)            | `fig-4.5-metamask-add-pxt-token.png`      |
| Fig 4.6              | MetaMask: Assets tab (PXT balance = 1,000,000 PXT)                 | `fig-4.6-metamask-pxt-balance.png`        |
| Fig 4.7              | Terminal: `npx hardhat test` (all passing)                         | `fig-4.7-hardhat-test-passing.png`        |
| Fig 4.8 _(optional)_ | Terminal: `scripts/interact.js` output (name, symbol, totalSupply) | `fig-4.8-interact-script-output.png`      |

> ⚠️ **Redaction Rule** — Redact any visible `PRIVATE_KEY` value or wallet mnemonic before saving screenshots. Never commit screenshots containing private credentials.

### 6.7 Security & Hygiene

- [ ] `git status` shows no `.env` file (not staged, not tracked)
- [ ] No private keys or mnemonics in any committed `.js`, `.sol`, `.json`, or `.md` file
- [ ] `node_modules/`, `artifacts/`, `cache/`, `ignition/deployments/` are gitignored
- [ ] `npm run format` executed — no formatting errors

### 6.8 Documentation

- [ ] `Exp-4/README.md` reflects the Paxton (PXT) token name and current deploy commands
- [ ] `EXP-4_PLAN.md` line 1 `FILE_LENGTH_TAG` updated to match actual post-authoring line count
- [ ] `screenshots/.gitkeep` deleted if real screenshots are added to the directory

---

## 7. Known Issues & Fixes

---

### Issue-1 — OZ v5 Import Path & Constructor Change

**Symptom**: `TypeError: Wrong argument count for function call: 0 arguments given but expected 1` during `npx hardhat compile`.

**Root Cause**: OpenZeppelin v5 requires `Ownable(address initialOwner)` in the constructor — a breaking change from v4's `Ownable()` no-arg pattern.

**Fix**:

```solidity
// OZ v5 — CORRECT
constructor(address initialOwner) ERC20("Paxton", "PXT") Ownable(initialOwner) { ... }

// OZ v4 — WRONG (compile error on OZ v5)
constructor() ERC20("Paxton", "PXT") Ownable() { ... }
```

**Reference**: [OpenZeppelin v5 Migration Guide](https://docs.openzeppelin.com/contracts/5.x/wizard)

---

### Issue-2 — Hardhat 2.x Node 22 ExperimentalWarning

**Symptom**: `ExperimentalWarning: VM Modules is an experimental feature` printed to stderr on every `npx hardhat` command.

**Root Cause**: Hardhat 2.x uses Node's VM module which emits an experimental warning on Node 22 LTS. Cosmetic only — does not affect functionality.

**Fix**:

```bash
export NODE_OPTIONS=--no-experimental-vm-modules
```

**Reference**: [Hardhat GitHub Issue #3956](https://github.com/NomicFoundation/hardhat/issues/3956)

---

### Issue-3 — MetaMask Pending Transaction Stuck

**Symptom**: MetaMask shows a Sepolia transaction as "Pending" indefinitely — usually after switching from a Hardhat local node to Sepolia.

**Root Cause**: Nonce mismatch between MetaMask's local cache and Sepolia's on-chain nonce for the wallet.

**Fix**:

```
MetaMask → Settings → Advanced → Reset Account
```

Safe — does not affect on-chain funds or deployed contracts.

**Reference**: [MetaMask Support — Reset Account](https://support.metamask.io/hc/en-us/articles/360015488891)

---

### Issue-4 — Hardhat Ignition Journal Conflict on Re-deploy

**Symptom**: `npx hardhat ignition deploy` outputs `Nothing to deploy` or silently skips on a second run.

**Root Cause**: `ignition/deployments/chain-11155111/` journal exists from a prior deploy. Ignition treats the module as already deployed.

**Fix**:

```bash
# Force a fresh deploy (new address, new transaction)
npx hardhat ignition deploy ./ignition/modules/Deploy.js --network sepolia --reset

# Or manually delete the journal
rm -rf ignition/deployments/chain-11155111/
```

**Reference**: [Hardhat Ignition — Re-running Deployments](https://hardhat.org/ignition/docs/guides/rerunning-deployments)

---

### Issue-5 — remixd CORS / Connection Refused

**Symptom**: Remix IDE shows "Cannot connect to localhost" or a CORS error when attempting to connect the remixd workspace.

**Root Cause**: `remixd` started pointing to wrong directory, wrong `--remix-ide` origin, or not started at all.

**Fix**:

```bash
# Start from Exp-4/ with exact flag
remixd -s ./contracts --remix-ide https://remix.ethereum.org
```

- Confirm `remixd --version` ≥ 0.6.x.
- Ensure the `--remix-ide` URL uses `https://` not `http://`.
- If browser blocks localhost: disable conflicting extensions or use Chrome incognito mode.

**Reference**: [Remixd Documentation](https://remix-ide.readthedocs.io/en/latest/remixd.html)

---

## 8. Security Reminders

> ⚠️ These rules are non-negotiable. A PR will be rejected if any of these are violated.

- **Never** commit `.env` to Git. Use `.env.example` with placeholder values only.
- **Never** use a MetaMask wallet holding real ETH for any lab experiment — use a dedicated Sepolia test wallet only.
- **Never** deploy to Ethereum Mainnet — this experiment targets Sepolia testnet exclusively.
- **Always** use a **dedicated throwaway MetaMask wallet** for Sepolia — its private key will be in `.env`.
- **Always** verify `git diff --cached` shows no `.env`, `*.pem`, or `*.key` files before every commit.
- **Sepolia-specific**: The `PRIVATE_KEY` in `.env` must be a testnet-only wallet. If the key is ever accidentally committed, rotate it immediately and stop using that wallet for anything else.
- **Token-specific**: Do not publicly share the deployed PXT contract address in combination with the `.env` private key. Treat address + key as a credential pair.
- **Screenshots**: Redact any terminal output that shows `PRIVATE_KEY`, seed phrase, or wallet credentials before saving to `screenshots/`.

---

## 9. Git Commit Checkpoints

Commit at each checkpoint. Use the exact format: `<type>(<scope>): <summary>`

| Checkpoint | After Completing                                      | Suggested Commit Message                                                         |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| CP-1       | Phase 1 — Env & config verified                       | `config(exp-4): verify hardhat config and env setup for sepolia`                 |
| CP-2       | Phase 2 — PaxtonToken.sol compiles                    | `feat(exp-4): add PaxtonToken ERC-20 contract with OZ v5 Ownable`                |
| CP-3       | Phase 3 — Ignition module created                     | `exp(exp-4): add Hardhat Ignition deploy module for PaxtonToken`                 |
| CP-4       | Phase 4 — Test suite all passing                      | `test(exp-4): add Hardhat Mocha tests for PaxtonToken basics and access control` |
| CP-5       | Phase 6 + 7 — Sepolia deploy + Etherscan verified     | `exp(exp-4): deploy PaxtonToken to Sepolia and verify on Etherscan`              |
| CP-6       | Phase 9 — Screenshots, interact script, final cleanup | `chore(exp-4): add screenshots, interaction script, finalize exp-4`              |

> 📌 **Note** — Do not commit after Phase 5 (pre-launch checks only) or after Phase 8 alone (Remix deploy is for evaluation screenshots; the canonical deploy is Phase 6). Always commit at phase exit criteria with passing tests and no compile errors.

---

_Blockchain Lab · ITL801 · University of Mumbai · BE IT SEM VIII · AY 2025-26_
_This PLAN file governs Experiment 4 implementation. Refer to `docs/PLAN_RULE.md` for authoring standards._
