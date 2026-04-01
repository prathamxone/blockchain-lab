FILE_LENGTH_TAG=medium

# EXP-5_PLAN — Deployment of Chain Code in Hyperledger Fabric

> **Blockchain Lab · ITL801 · University of Mumbai · BE IT SEM VIII · AY 2025-26**
> Single source of truth for implementing Experiment 5. Read completely before running any command.

---

## Table of Contents

- [EXP-5\_PLAN — Deployment of Chain Code in Hyperledger Fabric](#exp-5_plan--deployment-of-chain-code-in-hyperledger-fabric)
  - [Table of Contents](#table-of-contents)
  - [0. Experiment Snapshot](#0-experiment-snapshot)
    - [Network Awareness](#network-awareness)
  - [1. Pre-Flight Checklist](#1-pre-flight-checklist)
    - [1.1 Docker \& Docker Compose](#11-docker--docker-compose)
    - [1.2 Node \& nvm](#12-node--nvm)
    - [1.3 Hyperledger Fabric Binaries](#13-hyperledger-fabric-binaries)
    - [1.4 fabric-samples](#14-fabric-samples)
    - [1.5 Environment Variables](#15-environment-variables)
    - [1.6 Ports](#16-ports)
    - [1.7 Chaincode Dependencies](#17-chaincode-dependencies)
  - [2. Repository File Map](#2-repository-file-map)
  - [3. Sequential Development Phases](#3-sequential-development-phases)
    - [Phase 1 — Environment \& Prerequisites Verification](#phase-1--environment--prerequisites-verification)
    - [Phase 2 — Chaincode Review \& Dependency Install](#phase-2--chaincode-review--dependency-install)
    - [Phase 3 — Start Fabric Test Network \& Create Channel](#phase-3--start-fabric-test-network--create-channel)
    - [Phase 4 — Stage Chaincode in Fabric-Accessible Location](#phase-4--stage-chaincode-in-fabric-accessible-location)
    - [Phase 5 — Deploy Chaincode via deployCC](#phase-5--deploy-chaincode-via-deploycc)
    - [Phase 6 — Invoke \& Query Chaincode](#phase-6--invoke--query-chaincode)
    - [Phase 7 — Teardown \& Final Cleanup](#phase-7--teardown--final-cleanup)
  - [4. Crucial Development Moments (CDM)](#4-crucial-development-moments-cdm)
      - [CDM-1 — Node Version Must Be 20 — Do NOT Use Node 22 or 24 _(Phase 1)_](#cdm-1--node-version-must-be-20--do-not-use-node-22-or-24-phase-1)
      - [CDM-2 — Docker Daemon Not Running or Wrong Container Mode _(Phase 1)_](#cdm-2--docker-daemon-not-running-or-wrong-container-mode-phase-1)
      - [CDM-3 — Fabric Binaries Not in PATH _(Phase 1)_](#cdm-3--fabric-binaries-not-in-path-phase-1)
      - [CDM-4 — CORE\_PEER\_TLS\_ENABLED and Peer TLS Env Vars Not Set _(Phase 5)_](#cdm-4--core_peer_tls_enabled-and-peer-tls-env-vars-not-set-phase-5)
      - [CDM-5 — Chaincode Package ID Mismatch After Reinstall _(Phase 5)_](#cdm-5--chaincode-package-id-mismatch-after-reinstall-phase-5)
      - [CDM-6 — What deployCC Does Under the Hood: Full Manual Lifecycle Reference _(Phase 5)_](#cdm-6--what-deploycc-does-under-the-hood-full-manual-lifecycle-reference-phase-5)
  - [5. Manual Execution Tasks](#5-manual-execution-tasks)
    - [MET-1 — Install Hyperledger Fabric Samples, Binaries \& Docker Images _(before Phase 1)_](#met-1--install-hyperledger-fabric-samples-binaries--docker-images-before-phase-1)
    - [MET-2 — Export Fabric Binaries to PATH _(before Phase 1)_](#met-2--export-fabric-binaries-to-path-before-phase-1)
    - [MET-3 — Start Fabric Test Network _(Phase 3)_](#met-3--start-fabric-test-network-phase-3)
  - [6. Verification Checklist](#6-verification-checklist)
    - [6.1 Docker \& Network](#61-docker--network)
    - [6.2 Chaincode Deployment](#62-chaincode-deployment)
    - [6.3 Invoke \& Query Verification](#63-invoke--query-verification)
    - [6.4 Screenshot Capture](#64-screenshot-capture)
    - [6.5 Teardown](#65-teardown)
    - [6.6 Security \& Hygiene](#66-security--hygiene)
    - [6.7 Documentation](#67-documentation)
  - [7. Known Issues \& Fixes](#7-known-issues--fixes)
    - [Issue-1 — Deprecated Fabric Bootstrap URL (`bit.ly/2ysbOFE`)](#issue-1--deprecated-fabric-bootstrap-url-bitly2ysbofe)
    - [Issue-2 — `docker-compose` vs `docker compose` Command Difference](#issue-2--docker-compose-vs-docker-compose-command-difference)
    - [Issue-3 — CORE\_PEER\_TLS Env Vars Lost Across Terminal Sessions](#issue-3--core_peer_tls-env-vars-lost-across-terminal-sessions)
    - [Issue-4 — Chaincode Path Must Have `node_modules/` Before deployCC](#issue-4--chaincode-path-must-have-node_modules-before-deploycc)
    - [Issue-5 — Previous Test Network Not Torn Down Properly](#issue-5--previous-test-network-not-torn-down-properly)
  - [8. Security Reminders](#8-security-reminders)
  - [9. Git Commit Checkpoints](#9-git-commit-checkpoints)

---

## 0. Experiment Snapshot

| Field | Value |
| ----- | ----- |
| Experiment | Exp-5 — To study the deployment of chain code in hyper ledger fabric |
| Lab Outcome | LO5 — Write and deploy chain code in Hyperledger Fabric |
| Bloom's Taxonomy Level | L4 |
| Primary Tool(s) | Docker v29.x.x, Hyperledger Fabric v2.5.x, fabric-samples test-network |
| Supporting Tool(s) | fabric-contract-api ^2.5.0, fabric-shim ^2.5.0, peer CLI, npm |
| Chaincode Language | JavaScript (Node.js v20 LTS) |
| Node Version | v20.x.x (nvm use 20) — `.nvmrc = 20` |
| Local Network(s) | Hyperledger Fabric test-network — Orderer (7050), Org1 peer (7051), Org2 peer (9051) |
| Testnet | N/A — Hyperledger Fabric is a permissioned blockchain, not Ethereum |
| Prerequisite Experiments | None — Exp-5 is an independent stack parallel to the Ethereum track (Exp-1–4, Exp-6) |
| Estimated Phases | 7 phases |
| FILE_LENGTH_TAG | Assigned after authoring — see line 1 |

> ⚠️ **Warning** — Hyperledger Fabric is a **permissioned blockchain**. It uses peers, orderers, channels, and MSPs — not wallets, gas, or Ethereum accounts. Do NOT attempt to use MetaMask, Hardhat, Truffle, Remix IDE, or Ganache for this experiment.

> 📌 **Note** — This experiment operates on a completely separate stack from Exp-1–4 and Exp-6. The Ethereum and Hyperledger Fabric tracks share no tools, node configuration, or deployment workflows.

### Network Awareness

| Network | Type | Chain ID | Default Ports | Tool | When Used |
| ------- | ---- | -------- | ------------- | ---- | --------- |
| Hyperledger Fabric test-network | Permissioned (private) | N/A | 7050 (orderer), 7051 (Org1 peer), 9051 (Org2 peer), 7054 (Fabric CA) | `network.sh` from fabric-samples | Phases 3–7 |

> 📌 **Note** — Hyperledger Fabric uses MSP IDs (`Org1MSP`, `Org2MSP`) and named channels (`mychannel`) rather than numeric chain IDs. Network identity is established via cryptographic certificates generated during network startup by the Fabric CA.

---

## 1. Pre-Flight Checklist

Run these checks **before starting Phase 1**. Do not proceed if any item fails.

### 1.1 Docker & Docker Compose

- [ ] `docker --version` → `Docker version 29.x.x`
- [ ] `docker compose version` → `Docker Compose version v2.x.x` _(use `docker compose`, not the deprecated `docker-compose`)_
- [ ] `docker ps` exits 0 — Docker daemon is running
- [ ] Docker is using **Linux containers** _(important if running on WSL2 with Docker Desktop)_

> 💡 **Tip** — If `docker ps` fails with "Cannot connect to the Docker daemon", start Docker with `sudo systemctl start docker` on Linux, or open Docker Desktop on Windows.

### 1.2 Node & nvm

- [ ] `nvm --version` confirms nvm ≥ 0.40.x is installed
- [ ] `nvm use 20` succeeds — outputs `Now using node v20.x.x (npm v10.x.x)`
- [ ] `node --version` inside `Exp-5/` outputs `v20.x.x` (`.nvmrc = 20` respected)

> ⚠️ **Warning — Node 20 is mandatory for this experiment. Do NOT run `nvm use 22` or `nvm use 24`.** Hyperledger Fabric's chaincode runner (fabric-shim) relies on gRPC native bindings compiled for Node 18/20 LTS. Node 22 or 24 may silently break peer-chaincode communication during invocation. See CDM-1 for full details.

### 1.3 Hyperledger Fabric Binaries

- [ ] `peer version` → `peer: 2.5.x` _(confirms binary is in PATH)_
- [ ] `orderer version` → `orderer: 2.5.x`
- [ ] `which peer` → returns a path under `$HOME/fabric-samples/bin/`
- [ ] If binaries are not found, run **MET-2** (export PATH and FABRIC_CFG_PATH) before continuing

### 1.4 fabric-samples

- [ ] `ls ~/fabric-samples/` shows `test-network/`, `bin/`, `config/`, `chaincode/` directories
- [ ] `~/fabric-samples/test-network/network.sh` exists — verify: `ls -la ~/fabric-samples/test-network/network.sh`
- [ ] `~/fabric-samples/bin/peer` is present and executable
- [ ] If fabric-samples is not installed, complete **MET-1** before proceeding

### 1.5 Environment Variables

- [ ] `echo $FABRIC_CFG_PATH` outputs `$HOME/fabric-samples/config/` _(non-empty)_
- [ ] `echo $PATH | tr ':' '\n' | grep fabric` confirms `$HOME/fabric-samples/bin` is in PATH
- [ ] If vars are not set, run **MET-2** before proceeding

> 📌 **Note** — Environment variables must be re-exported in every new terminal session. Add them to `~/.bashrc` or `~/.bash_profile` for persistence across sessions.

### 1.6 Ports

- [ ] Port `7050` is free — `lsof -i :7050` returns empty _(Fabric orderer)_
- [ ] Port `7051` is free — `lsof -i :7051` returns empty _(Org1 peer)_
- [ ] Port `9051` is free — `lsof -i :9051` returns empty _(Org2 peer)_
- [ ] Port `7054` is free — `lsof -i :7054` returns empty _(Fabric CA)_

> 💡 **Tip** — If any port is occupied from a leftover Fabric session, run `cd ~/fabric-samples/test-network && ./network.sh down` to stop all containers and release all ports.

### 1.7 Chaincode Dependencies

- [ ] `Exp-5/chaincode/javascript/package.json` is present — inspect to confirm `fabric-contract-api ^2.5.0` and `fabric-shim ^2.5.0`
- [ ] `node_modules/` inside `Exp-5/chaincode/javascript/` will be installed in **Phase 2** — not required at this stage
- [ ] `cat Exp-5/.nvmrc` outputs `20`

---

## 2. Repository File Map

> **Legend**: `CREATE` — new file | `UPDATE` — modify existing | `DELETE` — remove | `VERIFY` — read-only reference

> 📌 **Note** — Only files within `Exp-5/` are listed here. External paths (`~/fabric-samples/`) are referenced in §1 Pre-Flight Checklist and §5 Manual Execution Tasks. No new source files are created for this experiment — the chaincode is fully implemented.

| # | File Path (relative to `Exp-5/`) | Action | Phase | Purpose |
|---|----------------------------------|--------|-------|---------|
| 1 | `chaincode/javascript/lib/myAsset.js` | VERIFY | 2 | Asset management chaincode — 8 functions: InitLedger, CreateAsset, ReadAsset, UpdateAsset, DeleteAsset, AssetExists, TransferAsset, GetAllAssets |
| 2 | `chaincode/javascript/index.js` | VERIFY | 2 | Chaincode entry point — exports `MyAssetContract`; `module.exports.contracts` array required by fabric-shim |
| 3 | `chaincode/javascript/package.json` | VERIFY | 2 | npm manifest — confirms `fabric-contract-api ^2.5.0`, `fabric-shim ^2.5.0`, `engines.node ≥18` |
| 4 | `.nvmrc` | VERIFY | 1 | Node version pin — must be `20` for Hyperledger Fabric compatibility |
| 5 | `screenshots/` | VERIFY | 6 | Directory containing all output screenshots used for validation and lab records |
| 6 | `EXP-5_PLAN.md` | VERIFY | — | Confirm `FILE_LENGTH_TAG` on line 1 matches actual line count after authoring |
| 7 | `../docs/BLOCKCHAIN_LAB_MANUAL.md` | VERIFY | — | Source of LO text for §0 and the evaluation file |

> 📌 **Note** — `Exp-5/` contains no Solidity contracts, Hardhat config, Truffle migrations, or `.env` files. Hyperledger Fabric uses a peer lifecycle CLI mechanism operating on Docker containers, not an npm-based Ethereum toolchain.

---

## 3. Sequential Development Phases

> ⚠️ Read every CDM before starting the corresponding phase. These are the most common failure points in Hyperledger Fabric experiments.

---

### Phase 1 — Environment & Prerequisites Verification

**Goal**: Confirm Docker daemon is running, Node 20 is active, Fabric binaries are in PATH, and all required ports are free before touching any file or chaincode command.

**Files Touched**: `.nvmrc` (VERIFY)

<!-- TOOL: SHELL -->

**Logical Flow**:
1. `nvm use 20` — switch to Node 20 LTS; confirm `Now using node v20.x.x`. See **CDM-1** before considering any other Node version.
2. `node --version` — must output `v20.x.x`. If not, inspect `Exp-5/.nvmrc` — it must contain `20`.
3. `docker ps` — verify Docker daemon is running. See **CDM-2** if this fails.
4. `docker compose version` — confirm v2.x syntax (`docker compose` with a space, NOT `docker-compose`).
5. `which peer` — confirm the binary resolves under `$HOME/fabric-samples/bin/`. See **CDM-3** if command not found.
6. `peer version` — confirm output shows `peer: 2.5.x`.
7. `echo $FABRIC_CFG_PATH` — must be non-empty. If empty, run **MET-2** before proceeding.
8. `echo $PATH | tr ':' '\n' | grep fabric` — confirm `$HOME/fabric-samples/bin` appears.
9. Check all Fabric ports are free:

```bash
lsof -i :7050 -i :7051 -i :9051 -i :7054
```

10. If any port is occupied, tear down residual containers: `cd ~/fabric-samples/test-network && ./network.sh down`.

**Exit Criteria**: `docker ps` exits 0; `peer version` shows `2.5.x`; `node --version` shows `v20.x.x`; all four Fabric ports return empty from `lsof`.

---

### Phase 2 — Chaincode Review & Dependency Install

**Goal**: Review the existing JavaScript chaincode for correctness — confirm all required functions, exports, and package manifest — then install npm dependencies under the Node 20 context.

**Files Touched**: `chaincode/javascript/lib/myAsset.js` (VERIFY), `chaincode/javascript/index.js` (VERIFY), `chaincode/javascript/package.json` (VERIFY)

<!-- TOOL: FABRIC -->

**Logical Flow**:
1. Review `chaincode/javascript/lib/myAsset.js` — confirm `class MyAssetContract extends Contract` with all 8 functions:
   - `InitLedger(ctx)` — seeds world state with 6 sample assets
   - `CreateAsset(ctx, id, color, size, owner, appraisedValue)` — validates non-existence → `putState`
   - `ReadAsset(ctx, id)` — `getState` → validates existence → returns JSON string
   - `UpdateAsset(ctx, id, color, size, owner, appraisedValue)` — validates existence → `putState`
   - `DeleteAsset(ctx, id)` — validates existence → `deleteState`
   - `AssetExists(ctx, id)` — returns boolean via `getState` result length
   - `TransferAsset(ctx, id, newOwner)` — reads asset → updates `Owner` → `putState` → returns old owner
   - `GetAllAssets(ctx)` — `getStateByRange('', '')` iterator → collects all → returns JSON array
2. Review `chaincode/javascript/index.js` — confirm:
   - `const { MyAssetContract } = require('./lib/myAsset')` is present
   - `module.exports.MyAssetContract = MyAssetContract` is present
   - `module.exports.contracts = [MyAssetContract]` is present _(fabric-shim requires this array)_
3. Review `chaincode/javascript/package.json` — confirm all of:
   - `"main": "index.js"` is set
   - `"fabric-contract-api": "^2.5.0"` in dependencies
   - `"fabric-shim": "^2.5.0"` in dependencies
   - `"engines": { "node": ">=18.0.0" }` is present
4. Ensure Node 20 is active: `nvm use 20`.
5. Install dependencies:

```bash
cd Exp-5/chaincode/javascript
npm install
```

6. Verify `node_modules/fabric-contract-api` and `node_modules/fabric-shim` exist after install.
7. Return to the repository root.

<!-- TOOL: FABRIC -->

**Logical Hint** (chaincode skeleton — structure reference only, no full implementation):

<!-- File: chaincode/javascript/lib/myAsset.js — skeleton -->
```javascript
'use strict';
const { Contract } = require('fabric-contract-api');
class MyAssetContract extends Contract {
  async InitLedger(ctx) { /* seed world state with 6 sample assets */ }
  async CreateAsset(ctx, id, color, size, owner, appraisedValue) { /* validate → putState */ }
  async ReadAsset(ctx, id) { /* getState → validate → return JSON */ }
  async TransferAsset(ctx, id, newOwner) { /* read → update Owner → putState → return oldOwner */ }
  async GetAllAssets(ctx) { /* getStateByRange → collect → return JSON array */ }
}
module.exports = { MyAssetContract };
```

**Exit Criteria**: `npm install` completes with 0 errors. `node_modules/` exists inside `Exp-5/chaincode/javascript/`.

---

### Phase 3 — Start Fabric Test Network & Create Channel

**Goal**: Bring up the two-organization Hyperledger Fabric test network with a Fabric CA and create `mychannel` with both Org1 and Org2 joined.

**Files Touched**: None in `Exp-5/` — all operations are on `~/fabric-samples/test-network/`

<!-- TOOL: FABRIC -->

**Logical Flow**:
1. Navigate to the test network directory — all `network.sh` commands **must** run from this exact location:

```bash
cd ~/fabric-samples/test-network
```

2. Tear down any previous Fabric network state (safe even if nothing is running):

```bash
./network.sh down
```

3. Start the network, create the channel, and use Certificate Authorities in one command:

```bash
./network.sh up createChannel -c mychannel -ca
```

   - `-c mychannel` — channel name (default is also `mychannel`)
   - `-ca` — uses Fabric CA to generate crypto material instead of the older `cryptogen` tool
   - Starts: `orderer.example.com`, `peer0.org1.example.com`, `peer0.org2.example.com`, and CA containers

4. Wait for the command to complete. Watch for the success line:

```
Channel 'mychannel' joined
```

5. Verify all containers are running:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

   Expected: peer0.org1, peer0.org2, orderer.example.com, and Fabric CA containers — all in `Up` state.

<!-- TOOL: SHELL -->

**Exit Criteria**: `docker ps` shows all Fabric containers in `Up` state. Terminal output confirms `Channel 'mychannel' joined`.

> ⚠️ See **CDM-2** if `./network.sh up` fails with Docker-related errors.

---

### Phase 4 — Stage Chaincode in Fabric-Accessible Location

**Goal**: Copy the Exp-5 chaincode to a path under `~/fabric-samples/chaincode/` so the `deployCC` command can locate and package it, then install its npm dependencies at that location under Node 20.

**Files Touched**: None in `Exp-5/` — creates external copy at `~/fabric-samples/chaincode/myasset/javascript/`

<!-- TOOL: SHELL -->

**Logical Flow**:
1. Create the target directory structure:

```bash
mkdir -p ~/fabric-samples/chaincode/myasset/javascript
```

2. Copy all chaincode files from the repository to the fabric-accessible location:

```bash
cp -r Exp-5/chaincode/javascript/. ~/fabric-samples/chaincode/myasset/javascript/
```

   This copies: `index.js`, `package.json`, `lib/myAsset.js`.

3. Confirm the copy was successful:

```bash
ls ~/fabric-samples/chaincode/myasset/javascript/
```

   Expected: `index.js  lib  package.json`

4. Ensure Node 20 is active, then install dependencies at the staged location:

```bash
nvm use 20
cd ~/fabric-samples/chaincode/myasset/javascript
npm install
```

5. Verify `node_modules/fabric-contract-api` and `node_modules/fabric-shim` exist.
6. Return to the test-network directory for the next phase:

```bash
cd ~/fabric-samples/test-network
```

<!-- TOOL: SHELL -->

**Exit Criteria**: `~/fabric-samples/chaincode/myasset/javascript/node_modules/` exists and `npm install` completed with 0 errors.

> 📌 **Note** — The `node_modules/` directory **must** be present in the staged path before running `deployCC` in Phase 5. See **Issue-4** in §7 Known Issues if `deployCC` fails at the packaging step.

---

### Phase 5 — Deploy Chaincode via deployCC

**Goal**: Use the fabric-samples `deployCC` shortcut to package, install on both peers, approve for both organizations, and commit the chaincode definition to `mychannel` in a single automated command.

**Files Touched**: None in `Exp-5/` — all operations are on `~/fabric-samples/test-network/`

<!-- TOOL: FABRIC -->

**Logical Flow**:
1. Ensure you are in the test-network directory:

```bash
cd ~/fabric-samples/test-network
```

2. Confirm the Fabric network is still running: `docker ps` — should show peer and orderer containers in `Up` state.
3. Run the `deployCC` command to deploy the `myasset` chaincode:

```bash
./network.sh deployCC -ccn myasset \
  -ccp ../chaincode/myasset/javascript \
  -ccl javascript \
  -ccv 1.0 \
  -ccs 1
```

   - `-ccn myasset` — chaincode name used to reference it in invoke/query commands
   - `-ccp ../chaincode/myasset/javascript` — path to the staged chaincode (relative to test-network/)
   - `-ccl javascript` — language: Node.js chaincode
   - `-ccv 1.0` — chaincode version (informational label)
   - `-ccs 1` — chaincode definition sequence number (increment on updates)

4. `deployCC` performs the full lifecycle automatically:
   - Packages the chaincode into a `.tar.gz`
   - Installs the package on `peer0.org1.example.com`
   - Installs the package on `peer0.org2.example.com`
   - Approves the chaincode definition for **Org1**
   - Approves the chaincode definition for **Org2**
   - Commits the chaincode definition to `mychannel`

5. Watch for these lines in the output to confirm success:

```
Committing chaincode definition myasset on channel 'mychannel'
... status:200
Chaincode definition committed on channel 'mychannel'
```

6. Verify the chaincode is committed on the channel:

<!-- TOOL: SHELL -->

```bash
export PATH=$HOME/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/fabric-samples/config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode querycommitted --channelID mychannel --name myasset
```

   Expected output: shows `Name: myasset`, `Version: 1.0`, `Sequence: 1`, `Endorsement Plugin: escc`, `Validation Plugin: vscc`.

**Exit Criteria**: `peer lifecycle chaincode querycommitted` returns committed status for `myasset` on `mychannel`.

> ⚠️ See **CDM-4** before setting peer TLS env vars. See **CDM-5** if you are re-running after a failed first attempt. See **CDM-6** for a full explanation of what `deployCC` does under the hood.

---

### Phase 6 — Invoke & Query Chaincode

**Goal**: Validate all major chaincode functions by invoking `InitLedger` to seed the ledger, then performing CRUD operations and capturing screenshots as evidence.

**Files Touched**: `screenshots/` (VERIFY — save output screenshots here)

<!-- TOOL: FABRIC -->

> 📌 **Note** — All peer commands in this phase require the Org1 TLS environment variables from Phase 5 to remain set. Run the `export` block from Phase 5 step 6 again if you opened a new terminal.

**Logical Flow**:

1. **Invoke InitLedger** — seed the world state with 6 sample assets:

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $HOME/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -c '{"function":"InitLedger","Args":[]}'
```

2. **Query GetAllAssets** — verify all 6 seeded assets are returned:

```bash
peer chaincode query -C mychannel -n myasset \
  -c '{"Args":["GetAllAssets"]}'
```

   Expected: JSON array with 6 assets (asset1 through asset6). Capture this as a screenshot: `fig-5.1-get-all-assets-init.png`.

3. **Invoke CreateAsset** — add a new asset to the ledger:

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $HOME/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -c '{"function":"CreateAsset","Args":["asset7","purple","20","Pratham","1500"]}'
```

4. **Query ReadAsset** — retrieve the newly created asset:

```bash
peer chaincode query -C mychannel -n myasset \
  -c '{"Args":["ReadAsset","asset7"]}'
```

   Expected: `{"AppraisedValue":1500,"Color":"purple","ID":"asset7","Owner":"Pratham","Size":20}`. Capture as `fig-5.2-read-asset7.png`.

5. **Invoke TransferAsset** — transfer ownership of asset7:

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $HOME/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -c '{"function":"TransferAsset","Args":["asset7","Christopher"]}'
```

6. **Query ReadAsset again** — confirm owner changed to `Christopher`. Capture as `fig-5.3-transfer-asset7.png`.
7. **Screenshot guide** — save all screenshots to `Exp-5/screenshots/` using the naming convention `fig-5.X-description.png`.

<!-- TOOL: SHELL -->

**Exit Criteria**: `InitLedger` succeeds (status 200), `GetAllAssets` returns 6 assets, `CreateAsset`/`ReadAsset`/`TransferAsset` round-trip succeeds, at least 3 screenshots captured.

---

### Phase 7 — Teardown & Final Cleanup

**Goal**: Bring down the Fabric test network cleanly, verify no residual Docker containers remain, and confirm the repository is in a clean git state.

**Files Touched**: None in `Exp-5/` — operates on `~/fabric-samples/test-network/`

<!-- TOOL: SHELL -->

**Logical Flow**:
1. Navigate to the test-network directory:

```bash
cd ~/fabric-samples/test-network
```

2. Tear down the network — stops all containers, removes volumes, and clears generated crypto material:

```bash
./network.sh down
```

3. Verify no Fabric containers are still running:

```bash
docker ps -a | grep -E 'peer|orderer|ca_'
```

   Expected: no output (all Fabric containers removed).

4. Optionally remove the staged chaincode directory to keep the fabric-samples environment clean:

```bash
rm -rf ~/fabric-samples/chaincode/myasset
```

5. Return to the repository root and verify git status:

```bash
git status
```

   Expected: only intentional tracked files appear — `Exp-5/EXP-5_PLAN.md`, `Exp-5/screenshots/`, etc. No `node_modules/`, no generated artifacts, no `.env` files.

6. Confirm `Exp-5/chaincode/javascript/node_modules/` is covered by `.gitignore` (it should be — verify with `git status --ignored Exp-5/chaincode/`).

<!-- TOOL: SHELL -->

**Exit Criteria**: `docker ps -a | grep -E 'peer|orderer|ca_'` returns empty. `git status` shows no unintended tracked files.

---

## 4. Crucial Development Moments (CDM)

> ⚠️ Read every CDM before starting the corresponding phase. These are the most common failure points.

---

#### CDM-1 — Node Version Must Be 20 — Do NOT Use Node 22 or 24 _(Phase 1)_

**Risk**: Running `nvm use 22` or `nvm use 24` before installing chaincode dependencies or invoking chaincode may silently break the Fabric peer-chaincode gRPC communication channel. The install step (`deployCC`) may appear to succeed, but chaincode invocation fails with cryptic gRPC transport errors.

**Why it matters**: `fabric-shim` v2.5 bundles `@grpc/grpc-js` which has native add-ons compiled against specific Node.js ABI versions. Node 22 and 24 use a different ABI from Node 18/20 LTS. The mismatch can manifest only at runtime invocation, not at packaging or install time — making it very hard to diagnose if you do not know to look for it.

**What to do**:
- Always run `nvm use 20` when working on Exp-5.
- Verify `Exp-5/.nvmrc` contains `20` (already set correctly).
- If you accidentally ran `npm install` under Node 22, delete `node_modules/` and reinstall under Node 20:

```bash
nvm use 20
rm -rf ~/fabric-samples/chaincode/myasset/javascript/node_modules
cd ~/fabric-samples/chaincode/myasset/javascript && npm install
```

- Verification: `node --version` must output `v20.x.x` at every step where you interact with Fabric tooling.

**Common Mistake**: Switching to a higher Node version for another experiment (Exp-1–4 use Node 22), then forgetting to switch back to Node 20 before running Fabric commands.

---

#### CDM-2 — Docker Daemon Not Running or Wrong Container Mode _(Phase 1)_

**Risk**: `./network.sh up` fails immediately with `Cannot connect to the Docker daemon at unix:///var/run/docker.sock` or hangs indefinitely when pulling images.

**Why it matters**: The entire Hyperledger Fabric test network runs inside Docker containers. Without a running Docker daemon, no peer, orderer, or CA can be started. This blocks all phases after Phase 1.

**What to do**:
- On Ubuntu/Linux — start Docker daemon:

```bash
sudo systemctl start docker
sudo systemctl enable docker   # persist across reboots
```

- Verify Docker is responsive: `docker ps` (returns empty list if daemon is running, no error).
- On WSL2 with Docker Desktop — ensure Docker Desktop is running and set to **Linux containers** mode (not Windows containers). Hyperledger Fabric images are Linux-only.
- Verification: `docker run --rm hello-world` must print `Hello from Docker!` without errors.

**Common Mistake**: Starting the experiment immediately after boot without verifying Docker is active, or having Docker Desktop paused/idle on Windows.

---

#### CDM-3 — Fabric Binaries Not in PATH _(Phase 1)_

**Risk**: `peer version` returns `command not found`. All peer lifecycle commands, channel operations, and chaincode queries fail.

**Why it matters**: The `peer`, `orderer`, `configtxgen`, and other binaries installed by `install-fabric.sh` are placed in `~/fabric-samples/bin/`. This directory is NOT automatically added to `$PATH`. Without it, no Fabric CLI command works, and the shell falls back to system packages (if any), which are typically not version 2.5.

**What to do**:
- Add the Fabric bin directory to PATH (see **MET-2**):

```bash
export PATH=$HOME/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/fabric-samples/config/
```

- Verify: `which peer` must return `$HOME/fabric-samples/bin/peer`.
- To persist across sessions, add those exports to `~/.bashrc`:

```bash
echo 'export PATH=$HOME/fabric-samples/bin:$PATH' >> ~/.bashrc
echo 'export FABRIC_CFG_PATH=$HOME/fabric-samples/config/' >> ~/.bashrc
source ~/.bashrc
```

- Verification: `peer version` outputs `peer: 2.5.x` and `which peer` returns a path under `fabric-samples/bin/`.

**Common Mistake**: Opening a new terminal session mid-experiment and running peer commands without re-exporting PATH, because the exports from the previous session are lost.

---

#### CDM-4 — CORE\_PEER\_TLS\_ENABLED and Peer TLS Env Vars Not Set _(Phase 5)_

**Risk**: Running `peer lifecycle chaincode querycommitted` or any `peer chaincode invoke`/`query` command without the five required TLS environment variables results in connection errors like `transport: Error while dialing: dial tcp [::1]:7051: connect: connection refused` or `rpc error: code = Unavailable`.

**Why it matters**: The Fabric test network started with `-ca` flag runs all peer-to-peer and client-to-peer communication over TLS. Without setting `CORE_PEER_TLS_ENABLED=true` and the associated certificate paths, the peer CLI attempts a plaintext connection that the TLS-enabled peer rejects.

**What to do** — export all five variables before any peer command in Phase 5 and Phase 6:

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=\
  $HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=\
  $HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```

- Verification: `echo $CORE_PEER_TLS_ENABLED` outputs `true`. `echo $CORE_PEER_ADDRESS` outputs `localhost:7051`.
- These vars must be re-set in every new terminal session.

**Common Mistake**: Running `peer lifecycle chaincode querycommitted` immediately after opening a new terminal without re-exporting the TLS vars from the session where `deployCC` was run.

---

#### CDM-5 — Chaincode Package ID Mismatch After Reinstall _(Phase 5)_

**Risk**: If `deployCC` is run more than once (e.g., after fixing a problem), or if `peer lifecycle chaincode install` is run manually, a new package ID is generated. Using a stale package ID from a previous run in `approveformyorg` causes the commit to fail with a policy endorsement error.

**Why it matters**: The Fabric chaincode lifecycle ties the approval to a specific package ID (a hash of the chaincode content). If the package is reinstalled (even with identical code), the hash changes and the package ID changes. The approval and commit must reference the current package ID.

**What to do**:
- After every install (manual or via `deployCC`), re-query the installed chaincodes to get the current package ID:

```bash
peer lifecycle chaincode queryinstalled
```

   Output example: `Package ID: myasset_1.0:a7b3c2...hex..., Label: myasset_1.0`

- Copy the full `Package ID` value (including the hash after the colon) and use it in `approveformyorg`.
- When using `deployCC` as the primary path, this is handled automatically — this CDM is relevant only if you are following the manual lifecycle path in CDM-6.

**Common Mistake**: Copy-pasting a package ID from a previous terminal session or from a documentation example instead of running `queryinstalled` after the current install.

---

#### CDM-6 — What deployCC Does Under the Hood: Full Manual Lifecycle Reference _(Phase 5)_

**Purpose**: This CDM documents the complete manual chaincode lifecycle that `./network.sh deployCC` automates. Read this to understand what each step does. Use these commands only if `deployCC` fails or you want to debug a specific lifecycle step.

> 📌 **Note** — All commands below must be run from `~/fabric-samples/test-network/`.

**Step 1 — Set Org1 Peer Environment Variables**:

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```

**Step 2 — Package the Chaincode**:

```bash
peer lifecycle chaincode package myasset.tar.gz \
  --path ../chaincode/myasset/javascript \
  --lang node \
  --label myasset_1.0
```

**Step 3 — Install on Org1 Peer**:

```bash
peer lifecycle chaincode install myasset.tar.gz
```

**Step 4 — Get the Package ID** _(copy the full string including the hex hash)_:

```bash
peer lifecycle chaincode queryinstalled
# Output: Package ID: myasset_1.0:<hex-hash>, Label: myasset_1.0
export PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid myasset.tar.gz)
```

**Step 5 — Approve Chaincode Definition for Org1**:

```bash
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

**Step 6 — Switch to Org2 Peer Environment Variables**:

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
```

**Step 7 — Install on Org2 Peer**:

```bash
peer lifecycle chaincode install myasset.tar.gz
```

**Step 8 — Approve Chaincode Definition for Org2**:

```bash
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

**Step 9 — Check Commit Readiness** _(both Orgs should show `true`)_:

```bash
peer lifecycle chaincode checkcommitreadiness \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --output json
# Expected: {"approvals": {"Org1MSP": true, "Org2MSP": true}}
```

**Step 10 — Commit Chaincode Definition to Channel** _(switch back to Org1 env vars first)_:

```bash
# Re-export Org1 env vars (Step 1) first
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
```

> ⚠️ **Key insight**: The `commit` command requires `--peerAddresses` for **both** Org1 and Org2 peers. Omitting Org2 causes an endorsement policy failure even if both orgs approved. This is why the README's manual path (Org1 only) would fail at the commit step — `deployCC` handles both orgs correctly.

**Common Mistake**: Forgetting to approve for Org2 before committing, or committing without both peer addresses in the `--peerAddresses` flags.

---

## 5. Manual Execution Tasks

These steps must be performed **by hand** by the developer. They cannot be automated.

---

### MET-1 — Install Hyperledger Fabric Samples, Binaries & Docker Images _(before Phase 1)_

1. Navigate to the home directory (or any preferred working directory):

```bash
cd ~
```

2. Download the official `install-fabric.sh` script from the Hyperledger Fabric repository:

```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
```

3. Run the installer with Fabric version 2.5.15 — this installs Docker images, CLI binaries, and clones the fabric-samples repository:

```bash
./install-fabric.sh --fabric-version 2.5.15 docker samples binary
```

   - `docker` — pulls Hyperledger Fabric Docker images (`hyperledger/fabric-peer:2.5.15`, `hyperledger/fabric-orderer:2.5.15`, etc.)
   - `samples` — clones the `fabric-samples` GitHub repository to the current directory
   - `binary` — downloads peer, orderer, configtxgen, and other CLI binaries into `fabric-samples/bin/`

4. Verify the installation:

```bash
ls ~/fabric-samples/test-network/
# Expected: network.sh, configtx/, organizations/, scripts/, etc.

ls ~/fabric-samples/bin/
# Expected: peer  orderer  configtxgen  configtxlator  cryptogen  discover  osnadmin  ...
```

5. Confirm the correct Fabric image version:

```bash
docker images | grep hyperledger/fabric-peer
# Expected: hyperledger/fabric-peer   2.5.15   ...
```

> 📌 **Note** — `install-fabric.sh` is the current official replacement for the deprecated `curl -sSL https://bit.ly/2ysbOFE | bash -s` bootstrap script. The old URL still works but points to an older version of the bootstrap script. Always use `install-fabric.sh` for new installs.

> ⚠️ **Warning** — Do NOT clone `fabric-samples` inside the `Exp-5/` or `blockchain-lab/` repository. Install it in a separate directory (e.g., `~/fabric-samples`) to keep the blockchain-lab repository clean.

---

### MET-2 — Export Fabric Binaries to PATH _(before Phase 1)_

1. Export the Fabric binary directory to PATH and set the config path:

```bash
export PATH=$HOME/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/fabric-samples/config/
```

2. Verify both variables are set correctly:

```bash
which peer
# Expected: /home/<user>/fabric-samples/bin/peer

peer version
# Expected: peer: 2.5.x

echo $FABRIC_CFG_PATH
# Expected: /home/<user>/fabric-samples/config/
```

3. To persist these exports across all terminal sessions, add them to `~/.bashrc`:

```bash
echo 'export PATH=$HOME/fabric-samples/bin:$PATH' >> ~/.bashrc
echo 'export FABRIC_CFG_PATH=$HOME/fabric-samples/config/' >> ~/.bashrc
source ~/.bashrc
```

> 📌 **Note** — `FABRIC_CFG_PATH` must point to the `config/` directory inside `fabric-samples` which contains `core.yaml`, `configtx.yaml`, and `orderer.yaml`. Without this, the peer daemon cannot start.

---

### MET-3 — Start Fabric Test Network _(Phase 3)_

1. Navigate to the test-network directory:

```bash
cd ~/fabric-samples/test-network
```

2. Clean up any previous network state:

```bash
./network.sh down
```

3. Bring up the network with Certificate Authorities and create `mychannel`:

```bash
./network.sh up createChannel -c mychannel -ca
```

4. Wait for the script to finish. Confirm the expected output:

```
Creating channel 'mychannel'.
...
Anchor peer set for org 'Org1MSP' on channel 'mychannel'
Anchor peer set for org 'Org2MSP' on channel 'mychannel'
Channel 'mychannel' joined
```

5. Verify running containers:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

   Expected: `peer0.org1.example.com`, `peer0.org2.example.com`, `orderer.example.com`, plus Fabric CA containers — all in `Up` state.

> ⚠️ If the network fails to start, check **CDM-2** (Docker daemon) and **CDM-3** (Fabric binaries in PATH).

---

## 6. Verification Checklist

Complete every item before committing the final state of this experiment.

### 6.1 Docker & Network

- [ ] `docker ps` shows all Fabric containers (`peer0.org1`, `peer0.org2`, `orderer`, CAs) in `Up` state after `./network.sh up createChannel`
- [ ] `docker ps -a | grep -E 'peer|orderer|ca_'` returns empty after `./network.sh down` _(teardown verification)_
- [ ] No Fabric ports remain in use after teardown: `lsof -i :7050 -i :7051 -i :9051` returns empty

### 6.2 Chaincode Deployment

- [ ] `deployCC` completed with no errors and printed `Chaincode definition committed on channel 'mychannel'`
- [ ] `peer lifecycle chaincode querycommitted --channelID mychannel --name myasset` returns:
  - `Name: myasset`
  - `Version: 1.0`
  - `Sequence: 1`
  - `Endorsement Plugin: escc`
  - `Validation Plugin: vscc`
- [ ] `node_modules/` exists inside staged chaincode path `~/fabric-samples/chaincode/myasset/javascript/` _(before deployCC)_

### 6.3 Invoke & Query Verification

- [ ] `peer chaincode invoke InitLedger` completed with status 200 (no error message in output)
- [ ] `peer chaincode query GetAllAssets` returns a valid JSON array of exactly 6 assets (asset1 – asset6)
- [ ] `peer chaincode invoke CreateAsset` with asset7 succeeded (no error)
- [ ] `peer chaincode query ReadAsset asset7` returns `{"AppraisedValue":1500,"Color":"purple","ID":"asset7","Owner":"Pratham","Size":20}`
- [ ] `peer chaincode invoke TransferAsset asset7 Christopher` succeeded
- [ ] `peer chaincode query ReadAsset asset7` after transfer shows `"Owner":"Christopher"`

### 6.4 Screenshot Capture

- [ ] `fig-5.1-get-all-assets-init.png` — terminal showing `GetAllAssets` output (6 assets JSON array)
- [ ] `fig-5.2-read-asset7.png` — terminal showing `ReadAsset` output for asset7
- [ ] `fig-5.3-transfer-asset7.png` — terminal showing updated `ReadAsset` after `TransferAsset`
- [ ] `fig-5.4-deploycc-success.png` — terminal showing `deployCC` completion and `querycommitted` output
- [ ] All screenshots saved to `Exp-5/screenshots/` with the naming convention `fig-5.X-description.png`

### 6.5 Teardown

- [ ] `./network.sh down` completed without errors
- [ ] `docker ps -a | grep -E 'peer|orderer|ca_'` returns empty
- [ ] All Fabric Docker volumes removed (network.sh down handles this automatically)

### 6.6 Security & Hygiene

- [ ] No `.env` file exists in `Exp-5/` (this experiment has no private keys or API keys)
- [ ] `git status` shows no `node_modules/`, no `myasset.tar.gz`, no generated crypto material
- [ ] `Exp-5/chaincode/javascript/node_modules/` is gitignored — verify with `git status --ignored Exp-5/chaincode/`
- [ ] `~/fabric-samples/` is NOT inside the `blockchain-lab/` repository

### 6.7 Documentation

- [ ] `Exp-5/.nvmrc` contains `20`
- [ ] `Exp-5/EXP-5_PLAN.md` `FILE_LENGTH_TAG` on line 1 matches actual line count (`wc -l Exp-5/EXP-5_PLAN.md`)
- [ ] `Exp-5/README.md` uses the updated `install-fabric.sh` URL (not the deprecated `bit.ly/2ysbOFE`)

---

## 7. Known Issues & Fixes

---

### Issue-1 — Deprecated Fabric Bootstrap URL (`bit.ly/2ysbOFE`)

**Symptom**: Running `curl -sSL https://bit.ly/2ysbOFE | bash -s` installs an older version of fabric-samples and may not pull the latest Fabric 2.5.x images.

**Root Cause**: The `bit.ly/2ysbOFE` URL is a legacy short link pointing to the old `bootstrap.sh` script. While it still works, it defaults to older Fabric versions and lacks the improved syntax of the newer `install-fabric.sh`.

**Fix**: Use the updated official script:

```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.15 docker samples binary
```

**Reference**: [Hyperledger Fabric Install Docs](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

---

### Issue-2 — `docker-compose` vs `docker compose` Command Difference

**Symptom**: `docker-compose up` fails with `command not found` or `docker-compose: error creating file`.

**Root Cause**: Docker Compose v1 (`docker-compose`) was deprecated and removed in Docker Desktop 4.x and Docker Engine 24.x. The Hyperledger Fabric `network.sh` script uses Docker Compose v2 which is invoked as `docker compose` (with a space, as a Docker CLI plugin).

**Fix**: Ensure Docker Engine 24+ or Docker Desktop 4+ is installed. Use `docker compose version` (not `docker-compose --version`) to verify. Docker v29.3.1 (installed on this system) already supports `docker compose` natively.

**Reference**: [Docker Compose Migration Guide](https://docs.docker.com/compose/migrate/)

---

### Issue-3 — CORE\_PEER\_TLS Env Vars Lost Across Terminal Sessions

**Symptom**: `peer chaincode invoke` or `peer lifecycle chaincode querycommitted` fails with `rpc error: code = Unavailable` or `connection refused` after opening a new terminal.

**Root Cause**: The five `CORE_PEER_*` environment variables set in Phase 5/6 are shell session variables. They are lost when the terminal is closed or a new one is opened.

**Fix**: Re-export the Org1 TLS env vars at the start of every new terminal session before running any peer command:

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```

---

### Issue-4 — Chaincode Path Must Have `node_modules/` Before deployCC

**Symptom**: `./network.sh deployCC` fails during the packaging step with an error like `failed to get chaincode install package` or the chaincode container fails to start after install.

**Root Cause**: The `peer lifecycle chaincode package` command for Node.js chaincode bundles the `node_modules/` directory into the `.tar.gz` package. If `node_modules/` is missing, the packaged chaincode will fail to run when the peer attempts to start the chaincode container.

**Fix**: Always run `npm install` in the staged chaincode directory before `deployCC`:

```bash
nvm use 20
cd ~/fabric-samples/chaincode/myasset/javascript
npm install
cd ~/fabric-samples/test-network
```

---

### Issue-5 — Previous Test Network Not Torn Down Properly

**Symptom**: `./network.sh up createChannel` fails with port conflict errors, or Docker containers from a previous experiment are still running.

**Root Cause**: If the previous Fabric session was not terminated with `./network.sh down` (e.g., system was rebooted, or the terminal was closed), Docker containers may still be running and holding ports 7050, 7051, 9051.

**Fix**: Always run `./network.sh down` before starting a new Fabric session:

```bash
cd ~/fabric-samples/test-network
./network.sh down
docker ps -a | grep -E 'peer|orderer'    # verify all containers removed
```

If containers are still present after `network.sh down`, force-remove them:

```bash
docker rm -f $(docker ps -aq --filter name=peer0 --filter name=orderer)
docker volume prune -f
```

---

## 8. Security Reminders

> ⚠️ These rules are non-negotiable. A PR will be rejected if any of these are violated.

- **Never** commit `.env` to Git. _(This experiment has no `.env` file — Fabric uses crypto material, not API keys.)_
- **Never** use production Hyperledger Fabric organization certificates or channel configurations in this lab. The test-network uses sample certificates generated by the Fabric CA — they are for development only and must never be used in production.
- **Never** commit `node_modules/` to the repository. Ensure `node_modules/` is covered by `.gitignore`.
- **Never** commit the `myasset.tar.gz` chaincode package to the repository. It is a build artifact generated during deployment and belongs in `.gitignore`.
- **Never** commit the `~/fabric-samples/` directory into the blockchain-lab repository. It is an external dependency cloned separately.
- **Always** verify `git status` shows no unintended files before committing.
- **Always** run `./network.sh down` at the end of every lab session to release ports and clean up Docker resources.

---

## 9. Git Commit Checkpoints

Commit at each checkpoint. Use the exact format: `<type>(<scope>): <summary>`

| Checkpoint | After Completing | Suggested Commit Message |
|------------|------------------|--------------------------|
| CP-1 | Phase 2 — chaincode reviewed and deps confirmed | `feat(exp-5): add myasset chaincode with fabric-contract-api dependencies` |
| CP-2 | Phase 5 — chaincode deployed and querycommitted verified | `exp(exp-5): deploy myasset chaincode to test-network via deployCC` |
| CP-3 | Phase 6 — invoke and query round-trip verified | `exp(exp-5): verify InitLedger, CreateAsset, ReadAsset, TransferAsset on mychannel` |
| CP-4 | Phase 7 — network torn down, screenshots saved, repo clean | `chore(exp-5): teardown test-network, add screenshots, finalize exp-5` |

> 📌 **Note** — Commit messages follow the `CONTRIBUTING.md §3` convention. The scope `exp-5` is required. Never commit with failing verification steps or without the screenshots required in Phase 6.

---

*Blockchain Lab · IT Engineering SEM VIII · University of Mumbai · AY 2025-26*
*This PLAN file governs the implementation of Exp-5. See `docs/PLAN_RULE.md` for the authoring standard.*
