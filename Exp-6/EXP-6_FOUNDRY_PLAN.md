FILE_LENGTH_TAG=medium

# EXP-6_FOUNDRY_PLAN — DVote (MVP + Foundry) Extensive Development Plan

> Blockchain Lab (ITL801) · University of Mumbai · BE IT SEM VIII
> 
> Authoring scope: Exp-6 Foundry only (on-chain layer + Foundry workflows).
> 
> Canonical integration boundaries: backend and frontend consume Foundry outcomes but never override chain finality.
> 
> Mini-project exception applied: authoring or filling `EXP-6_DOC.md` is intentionally out of scope for this plan phase and will be done after DVote reaches stable implementation readiness.

---

## Table of Contents

- [0. Experiment Snapshot](#0-experiment-snapshot)
- [1. Pre-Flight Checklist](#1-pre-flight-checklist)
- [2. Repository File Map](#2-repository-file-map)
- [3. Sequential Development Phases](#3-sequential-development-phases)
- [4. Crucial Development Moments (CDM)](#4-crucial-development-moments-cdm)
- [5. Manual Execution Tasks (MET)](#5-manual-execution-tasks-met)
- [6. Verification Checklist](#6-verification-checklist)
- [7. Known Issues & Fixes](#7-known-issues--fixes)
- [8. Security Reminders](#8-security-reminders)
- [9. Git Commit Checkpoints](#9-git-commit-checkpoints)

---

## 0. Experiment Snapshot

| Field | Value |
|---|---|
| Experiment | Exp-6 — Mini Project: Full-fledged DApp using Ethereum |
| Plan Scope | DVote (MVP + Foundry) only |
| Lab Outcome | LO6 — Develop and test a Full-fledged DApp using Ethereum/Hyperledger |
| Bloom's Taxonomy Level | L5 |
| Primary Tool(s) | Foundry (`forge`, `anvil`, `cast`) |
| Secondary Fallback Tool | Hardhat 3 (fallback-only path) |
| Solidity Version | `0.8.26` (current repo baseline) |
| Node Version Baseline | `22.12+` (standardized for Hardhat 3 + Vite + Prisma forward compatibility) |
| On-chain Access Model | OpenZeppelin `AccessControl` roles |
| KYC Attestation Model | EIP-712 typed data + SignatureChecker (EOA + ERC-1271 support for attestation validation) |
| Result Model | Pure on-chain incremental tally |
| Rerun Model | Mandatory rerun on base-election NOTA top; max reruns = 1 |
| Rerun SLA | Hard-coded 7 days (MVP) |
| Candidate Cap | 15 contesting candidates per election |
| NOTA Policy | Included in tie-lot; NOTA top in base election triggers rerun |
| Tie-Lot Seed Authority | ECI-only signed seed |
| Pause Policy | Pause never extends `votingEnd` |
| Vote Close Policy | Strict no-grace: mined at/after `votingEnd` must revert |
| Aadhaar-only Count Policy | Audit-only off-chain aggregation from on-chain events |
| Observer Anomaly Policy | Event-only in MVP (no automatic mitigation hooks) |
| Multi-signer KYC | Deferred completely from MVP implementation |
| Prerequisite Experiments | Exp-1 to Exp-4 (Ethereum track) |
| Estimated Phases | 14 phases |
| FILE_LENGTH_TAG | medium (to be revalidated after final line count) |

### 0.1 Network Awareness Table

| Network | Type | Chain ID | Port / RPC | Tooling Usage |
|---|---|---:|---|---|
| `hardhat` | Local ephemeral | 31337 | in-process | fallback smoke checks only |
| `anvil` | Local persistent | 31337 | `http://127.0.0.1:8545` | primary local execution for Foundry |
| `sepolia` | Public testnet | 11155111 | provider RPC | deployment + verification target |

### 0.2 Policy Locks from Brainstorm Agreement

1. Strict no-grace closure is final: vote tx mined at or after `votingEnd` is invalid.
2. Pause does not extend election window; rerun mechanism handles disruption recovery.
3. Tie-lot seed signer is ECI-only.
4. Rerun excludes all parent contesting candidates.
5. Parent election becomes fully immutable once child rerun is created.
6. Rerun SLA remains hard-coded at 7 days for MVP.
7. Chain ID assertions are mandatory in EIP-712 tests (positive + negative paths).
8. Multi-signer KYC is deferred entirely.
9. Aadhaar-only counts are off-chain derived from event logs and indexed data.
10. Observer anomaly path is event-only in MVP.

### 0.3 Consumer Integration Contract Freeze (Foundry -> Backend/Frontend)

This table freezes the downstream-facing event contract for MVP integration safety.

| Event | Critical Payload Fields (ordered) | Freeze Expectations |
|---|---|---|
| `KycApproved` | `electionId`, `wallet`, `commitment`, `signer`, `isAadhaarOnly`, `reasonCodeHash` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `VoteCast` | `electionId`, `candidateIndex`, `wallet`, `commitment`, `candidateVoteCountSnapshot`, `totalVotesCastSnapshot` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `ElectionStatusChanged` | `electionId`, `previousStatus`, `nextStatus`, `sender` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `ElectionFinalized` | `electionId`, `winnerIndex`, `winnerIsNota`, `finalizationOutcome`, `finalizedAt` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `ElectionRerunRequired` | `electionId`, `rerunDeadline` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `RerunElectionCreated` | `parentElectionId`, `childElectionId` | Name, field order, canonical types, and indexed flags are frozen for MVP. |
| `ObserverAnomalyReported` | `electionId`, `reporter`, `anomalyCode`, `evidenceHash` | Name, field order, canonical types, and indexed flags are frozen for MVP. |

Freeze clarifications:
1. Event names are immutable for MVP and remain non-anonymous.
2. Indexed parameter placement is frozen because topic layout drives consumer filters.
3. Any rename, reorder, type change, or indexed-flag change is integration-breaking and out of MVP scope.

### 0.4 Consumer Parity Note for Boundary Semantics

1. Backend and frontend must surface vote-window semantics unchanged from Foundry contract truth.
2. Strict no-grace rule is mandatory in consumer UX and read-model contracts: votes mined at or after `votingEnd` are invalid.
3. Pause-not-extend rule is mandatory in consumer UX and read-model contracts: pause or unpause cannot alter election `votingEnd`.
4. If consumer cache or API read models diverge, contract truth takes precedence without reinterpretation.

---

## 1. Pre-Flight Checklist

Run all checks before Phase 1 execution. Do not proceed until all applicable checks pass.

### 1.0 Mandatory Research and Dependency Alignment (Added by project decision)

- [ ] Confirm latest authoritative references using MCP tools:
  - Foundry installation and configuration guidance
  - Hardhat 3 Foundry compatibility guidance
  - OpenZeppelin AccessControl and SignatureChecker references
  - Node baseline compatibility references for future backend/frontend coexistence
- [ ] Record selected versions and policy decisions in this plan before contract coding.
- [ ] Confirm no unresolved governance-policy ambiguities remain for: pause, rerun, tie-lot seed, vote close boundary.

### 1.1 Runtime Baseline

- [ ] `nvm --version` confirms `0.40.x` or higher.
- [ ] `nvm use 22` succeeds in `Exp-6/`.
- [ ] `node --version` returns `v22.x.x`.
- [ ] `npm --version` returns `10.x` or newer.

### 1.2 Foundry and Hardhat Toolchain

- [ ] `forge --version` succeeds.
- [ ] `anvil --version` succeeds.
- [ ] `cast --version` succeeds.
- [ ] `npx hardhat --version` succeeds.
- [ ] `Exp-6/foundry.toml` confirms source path and remappings are valid.
- [ ] `Exp-6/hardhat.config.js` confirms fallback network setup for `anvil` and `sepolia`.

### 1.3 Dependency Health

- [ ] `npm install` in `Exp-6/` exits zero.
- [ ] `forge install foundry-rs/forge-std --no-commit` is completed if missing.
- [ ] `forge install OpenZeppelin/openzeppelin-contracts --no-commit` is completed if missing.
- [ ] Remappings for `forge-std` and OpenZeppelin resolve correctly.

### 1.4 Environment and Secrets Hygiene

- [ ] `Exp-6/.env` exists locally but is never staged.
- [ ] `Exp-6/.env.example` includes all placeholders required for Foundry deployment and verification.
- [ ] `PRIVATE_KEY` in local `.env` is a dedicated test wallet only.
- [ ] `ALCHEMY_API_URL_SEPOLIA` or equivalent provider config resolves correctly.
- [ ] `ETHERSCAN_API_KEY` is set for verification flows.

### 1.5 Ports and Process Hygiene

- [ ] Port `8545` availability verified before starting `anvil`.
- [ ] Port `31337` availability verified before fallback `hardhat node` usage.
- [ ] No stale anvil/hardhat node processes conflict with current test run.

### 1.6 Build and Test Smoke Gates

- [ ] `forge build` exits zero.
- [ ] `forge test -vvv` exits zero for baseline scaffolding.
- [ ] `npx hardhat compile` exits zero (fallback path gate).

### 1.7 Git and Branch Safety

- [ ] Current branch is `b-pratham`.
- [ ] Local modifications are intentional and understood before phase execution.
- [ ] No secret-bearing files are staged.

### 1.8 Scope Safety Gate

- [ ] This plan execution does not author or update `EXP-6_DOC.md` content.
- [ ] Backend and frontend implementation details are treated as interface boundaries only.

---

## 2. Repository File Map

> Legend: `CREATE` = new file, `UPDATE` = modify existing, `VERIFY` = read-only check, `DEFER` = intentionally deferred in this plan.

| # | File Path (relative to `Exp-6/`) | Action | Phase | Purpose |
|---:|---|---|---:|---|
| 1 | `EXP-6_FOUNDRY_PLAN.md` | UPDATE | 0 | Canonical execution blueprint |
| 2 | `foundry.toml` | UPDATE | 1 | Profiles, fuzz and invariant baseline settings |
| 3 | `hardhat.config.js` | VERIFY | 1 | Fallback compatibility and network parity check |
| 4 | `package.json` | UPDATE | 1 | Foundry-first scripts and fallback commands |
| 5 | `.env.example` | UPDATE | 1 | Required placeholders for role wallets and deploy vars |
| 6 | `README.md` | UPDATE | 13 | Foundry-centric runbook alignment after implementation |
| 7 | `src/Counter.sol` | DELETE | 2 | Remove starter contract scaffold |
| 8 | `script/Counter.s.sol` | DELETE | 2 | Remove starter deploy script |
| 9 | `test/Counter.t.sol` | DELETE | 2 | Remove starter test scaffold |
| 10 | `src/DVoteManager.sol` | CREATE | 3 | Core election manager contract |
| 11 | `src/lib/DVoteTypes.sol` | CREATE | 3 | Shared enums and structs |
| 12 | `src/lib/DVoteErrors.sol` | CREATE | 3 | Custom errors for gas-efficient reverts |
| 13 | `src/lib/DVoteHashing.sol` | CREATE | 3 | Commitment and typed-hash helpers |
| 14 | `src/lib/DVoteEvents.sol` | CREATE | 3 | Event declarations and shared event semantics |
| 15 | `src/interfaces/IDVoteManager.sol` | CREATE | 3 | External interface contract for integration |
| 16 | `src/constants/DVoteConstants.sol` | CREATE | 3 | Cap and policy constants |
| 17 | `script/DeployDVote.s.sol` | CREATE | 10 | Deploy core contract and bootstrap roles |
| 18 | `script/BootstrapElection.s.sol` | CREATE | 10 | Create election and register candidates |
| 19 | `script/FinalizeElection.s.sol` | CREATE | 10 | Trigger finalization with outcome logs |
| 20 | `script/CreateRerunElection.s.sol` | CREATE | 10 | Parent-child rerun creation flow |
| 21 | `script/RotateKycSigner.s.sol` | CREATE | 10 | Signer rotation runbook |
| 22 | `script/PostDeployCheck.s.sol` | CREATE | 10 | Sanity checks after deployment |
| 23 | `test/helpers/DVoteTestBase.sol` | CREATE | 11 | Shared fixtures, role seeds, and helper utilities |
| 24 | `test/helpers/MockERC1271Wallet.sol` | CREATE | 11 | SignatureChecker contract-wallet test fixture |
| 25 | `test/unit/DVoteManager.rbac.t.sol` | CREATE | 11 | RBAC and role governance tests |
| 26 | `test/unit/DVoteManager.lifecycle.t.sol` | CREATE | 11 | Lifecycle and transition guard tests |
| 27 | `test/unit/DVoteManager.kyc.t.sol` | CREATE | 11 | EIP-712 KYC attestation tests |
| 28 | `test/unit/DVoteManager.vote.t.sol` | CREATE | 11 | Voting path tests and rejection cases |
| 29 | `test/unit/DVoteManager.finalize.t.sol` | CREATE | 11 | Finalization, NOTA, and tie-lot behavior |
| 30 | `test/unit/DVoteManager.rerun.t.sol` | CREATE | 11 | Rerun creation, exclusion, and SLA escalation tests |
| 31 | `test/unit/DVoteManager.events.t.sol` | CREATE | 11 | Event completeness and payload parity tests |
| 32 | `test/fuzz/DVoteManager.fuzz.lifecycle.t.sol` | CREATE | 11 | Timing and state-transition fuzz tests |
| 33 | `test/fuzz/DVoteManager.fuzz.kyc.t.sol` | CREATE | 11 | Signature and replay fuzz tests |
| 34 | `test/fuzz/DVoteManager.fuzz.vote.t.sol` | CREATE | 11 | Vote path fuzz and dedupe checks |
| 35 | `test/invariant/DVoteManager.invariant.t.sol` | CREATE | 11 | Core invariants across randomized sequences |
| 36 | `scripts/deploy.js` | UPDATE | 10 | Hardhat fallback deployment script aligned to DVoteManager |
| 37 | `docs/FEATURE_FOUNDRY.md` | VERIFY | 0-14 | Source policy authority for Foundry decisions |
| 38 | `docs/FEATURE_BACKEND.md` | VERIFY | 0-14 | Integration boundaries and parity references |
| 39 | `docs/FEATURE_FRONTEND.md` | VERIFY | 0-14 | Integration boundaries and parity references |
| 40 | `EXP-6_DOC.md` | DEFER | — | Deferred intentionally until mini-project implementation maturity |

---

## 3. Sequential Development Phases

Each phase includes Goal, Files Touched, Logical Flow, and Exit Criteria. Execute phases in sequence.

---

### Phase 1 — Research Lock and Dependency Baseline

**Goal**: Freeze authoritative references, runtime baselines, and tool compatibility before contract coding.

**Files Touched**: `EXP-6_FOUNDRY_PLAN.md` (UPDATE), `foundry.toml` (UPDATE), `package.json` (UPDATE), `.env.example` (UPDATE), `hardhat.config.js` (VERIFY)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Enter `Exp-6/` and switch to Node 22 context.
2. Confirm Foundry binaries and Hardhat are available in current shell context.
3. Run compile and smoke tests for current scaffold to establish baseline.
4. Record current pass/fail baseline in working notes.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Validate Foundry profile defaults in `foundry.toml`.
2. Add or verify profile fields for fuzz runs, invariant runs, and deterministic CI behavior.
3. Confirm remappings are explicit and stable.

<!-- TOOL: HARDHAT -->
**Logical Flow**:
1. Validate fallback-only Hardhat scripts still compile current source.
2. Ensure no Hardhat plugin assumptions conflict with Foundry-first layout.
3. Keep fallback path documented but not primary.

<!-- TOOL: MCP_DOCS -->
**Logical Flow**:
1. Verify current official guidance for Foundry installation and profiles.
2. Verify OpenZeppelin usage guidance for AccessControl, EIP-712, and SignatureChecker.
3. Validate runtime compatibility assumptions used in this plan.

**Exit Criteria**:
- `forge build` passes.
- `forge test -vvv` baseline passes on scaffold.
- `npx hardhat compile` passes.
- Dependency and policy baseline is documented with no unresolved contradictions.

---

### Phase 2 — Replace Starter Scaffold with DVote Foundation

**Goal**: Remove Counter starter artifacts and scaffold DVote-oriented contract/test/script layout.

**Files Touched**: `src/Counter.sol` (DELETE), `script/Counter.s.sol` (DELETE), `test/Counter.t.sol` (DELETE), `src/DVoteManager.sol` (CREATE), `src/lib/DVoteTypes.sol` (CREATE), `src/lib/DVoteErrors.sol` (CREATE), `src/lib/DVoteHashing.sol` (CREATE), `src/lib/DVoteEvents.sol` (CREATE), `src/interfaces/IDVoteManager.sol` (CREATE), `src/constants/DVoteConstants.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Remove starter Counter contract and create DVote contract file set.
2. Move enums, structs, and shared constants into dedicated library files.
3. Keep `DVoteManager.sol` focused on orchestration and mutation flow.
4. Declare policy constants once, reference everywhere.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Compile incrementally after each file addition.
2. Keep imports explicit; avoid cyclic dependency between library files.
3. Confirm compiler version and SPDX identifiers are consistent.

**Logical Hint (structure only, not full implementation)**:

```solidity
// src/constants/DVoteConstants.sol
library DVoteConstants {
	uint8 internal constant MAX_CONTESTING_CANDIDATES = 15;
	uint8 internal constant MAX_RERUNS = 1;
	uint64 internal constant RERUN_CREATION_SLA = 7 days;
	bytes32 internal constant NOTA_CANDIDATE_ID = keccak256("D VOTE NOTA");
}
```

**Exit Criteria**:
- Counter scaffold files are removed.
- DVote foundation files exist and compile.
- `forge build` passes with new file graph.

---

### Phase 3 — Data Model, Events, and Deterministic Storage Rules

**Goal**: Implement canonical enums, structs, mappings, constants, and event contracts.

**Files Touched**: `src/lib/DVoteTypes.sol` (UPDATE), `src/lib/DVoteEvents.sol` (UPDATE), `src/lib/DVoteErrors.sol` (UPDATE), `src/constants/DVoteConstants.sol` (UPDATE), `src/DVoteManager.sol` (UPDATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Add lifecycle enums and outcome enums exactly as locked in feature spec.
2. Add election, candidate, voter, and KYC structs.
3. Define mappings in manager contract with election-scoped isolation.
4. Apply explicit storage safety checks for candidate cap and salt uniqueness.
5. Add all required events with integration-safe payload fields.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Compile after introducing each enum group and struct cluster.
2. Add temporary compile-only tests to validate type wiring.
3. Validate no storage packing assumptions break readability or semantics.

**Exit Criteria**:
- All required enums, structs, and mappings are compiled.
- Event interface compiles with no signature conflicts.
- Candidate cap and rerun cap constants are referenced from shared constants.

---

### Phase 4 — RBAC Matrix and Signer Governance

**Goal**: Implement role model and signer rotation with least-privilege guarantees.

**Files Touched**: `src/DVoteManager.sol` (UPDATE), `src/lib/DVoteErrors.sol` (UPDATE), `test/unit/DVoteManager.rbac.t.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Extend OpenZeppelin AccessControl in `DVoteManager.sol`.
2. Define role constants: admin, ECI, SRO, RO, Observer, KYC signer, emergency.
3. Implement role-gated grant/revoke and signer rotation guards.
4. Emit detailed role and signer events for audit parity.
5. Ensure no internal path allows observer privilege escalation.

**Logical Hint (structure only, not full implementation)**:

```solidity
bytes32 public constant ECI_ROLE = keccak256("ECI_ROLE");
bytes32 public constant KYC_SIGNER_ROLE = keccak256("KYC_SIGNER_ROLE");

function rotateKycSigner(address oldSigner, address newSigner)
	external
	onlyRole(ECI_ROLE)
{
	// revoke old signer, grant new signer, emit KycSignerRotated
}
```

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Write role matrix tests for positive and negative authorization paths.
2. Validate event emission for grant/revoke/rotation operations.
3. Assert unauthorized callers revert with custom errors.

**Exit Criteria**:
- Role checks enforce least privilege on privileged functions.
- Signer rotation supports immediate cutoff behavior.
- RBAC tests pass for grant/revoke/escalation-denial scenarios.

---

### Phase 5 — Election Lifecycle Engine and Transition Guards

**Goal**: Implement election creation and status transitions with immutable time policy constraints.

**Files Touched**: `src/DVoteManager.sol` (UPDATE), `test/unit/DVoteManager.lifecycle.t.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Implement create-election flow with schedule validity checks.
2. Implement transitions: Draft -> RegistrationOpen -> VotingOpen -> VotingPaused <-> VotingOpen -> VotingClosed -> Finalized.
3. Allow Draft -> Cancelled pre-vote only.
4. Ensure candidate registration gates close at VotingOpen.
5. Enforce strict no-grace close rule at vote casting boundary.
6. Enforce locked decision: pause cannot extend `votingEnd`.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Add lifecycle transition tests for allowed and forbidden edges.
2. Add boundary tests at exact `votingEnd` timestamp.
3. Add test ensuring pause/unpause does not mutate end timestamp.

**Exit Criteria**:
- Transition graph is enforced on-chain.
- Voting boundary rule `[votingStart, votingEnd)` is test-validated.
- Pause logic cannot alter deadline behavior.

---

### Phase 6 — EIP-712 KYC Attestation and Commitment Gate

**Goal**: Implement signature-verified KYC attestation path with replay protections and commitment integrity.

**Files Touched**: `src/DVoteManager.sol` (UPDATE), `src/lib/DVoteHashing.sol` (UPDATE), `test/unit/DVoteManager.kyc.t.sol` (CREATE), `test/helpers/MockERC1271Wallet.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Define typed data structure for KYC payload fields.
2. Implement `_hashTypedDataV4` path and validate signer through SignatureChecker.
3. Enforce nonce monotonicity, expiry guard, election binding, and wallet binding.
4. Persist KYC state with commitment and aadhaar-only flags.
5. Emit KYC-approved event with `isAadhaarOnly` and `reasonCodeHash`.
6. Explicitly keep multi-signer KYC deferred (no dormant code branches in MVP).

**Logical Hint (structure only, not full implementation)**:

```solidity
bytes32 private constant KYC_TYPEHASH = keccak256(
	 "KycApproval(address subjectWallet,bytes32 commitment,uint256 electionId,uint256 nonce,uint256 expiry,bool isAadhaarOnly,bytes32 reasonCodeHash)"
);

function approveKycWithSig(KycApproval calldata approval, bytes calldata sig) external {
	 // validate nonce, expiry, typed hash, signer role, election binding
}
```

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Test EOA valid signature path.
2. Test ERC-1271 valid signature path.
3. Test wrong signer, wrong nonce, expired signature, wrong election, and replay failures.
4. Add mandatory chain ID matrix tests:
	- correct chain ID should pass
	- mismatched chain ID should fail deterministically
5. Add fuzz cases around signature fields and replay vectors.

**Exit Criteria**:
- KYC attestation requires valid EIP-712 signature and active signer role.
- Chain ID assertions are enforced in unit and fuzz matrices.
- Multi-signer KYC remains absent by design in MVP contracts.

---

### Phase 7 — Voting Path and One-Wallet/One-Commitment Enforcement

**Goal**: Implement vote casting with strict preconditions and cumulative tally updates.

**Files Touched**: `src/DVoteManager.sol` (UPDATE), `test/unit/DVoteManager.vote.t.sol` (CREATE), `test/fuzz/DVoteManager.fuzz.vote.t.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Enforce voting status and window checks.
2. Enforce KYC-approved and KYC-validity checks.
3. Reject wallet double-vote attempts.
4. Reject commitment reuse in same election.
5. Validate candidate index and active status.
6. Increment candidate count and election total atomically.
7. Emit VoteCast event with cumulative snapshots.

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Add happy-path vote test from KYC approval to cast success.
2. Add rejection tests for all precondition failures.
3. Add boundary tests around open and close timestamps.
4. Add fuzz tests for candidate index, repeated vote attempts, and timestamp boundaries.

**Exit Criteria**:
- One-wallet-one-vote and one-commitment-one-vote both enforced.
- VoteCast event emitted atomically with state updates.
- Fuzz suite validates dedupe and timing rejection behavior.

---

### Phase 8 — Finalization, NOTA, Tie-Lot, and Rerun Governance

**Goal**: Implement deterministic finalization outcomes and rerun governance with locked policy decisions.

**Files Touched**: `src/DVoteManager.sol` (UPDATE), `test/unit/DVoteManager.finalize.t.sol` (CREATE), `test/unit/DVoteManager.rerun.t.sol` (CREATE), `test/fuzz/DVoteManager.fuzz.lifecycle.t.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Implement bounded candidate scan for winner computation.
2. Apply NOTA trigger rule for base election rerun.
3. Implement tie-lot logic with ECI-only signed seed validation.
4. Trigger rerun if tie-lot selects NOTA.
5. Enforce one-rerun-only fallback: rerun NOTA top leads to highest non-NOTA winner.
6. Implement parent-child linkage for rerun elections.
7. Enforce all-parent-candidates exclusion in rerun.
8. Enforce hard-coded rerun SLA as `finalizedAt + 7 days`.
9. Enforce immutable parent election after rerun child creation (on-chain).

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Add unit tests for all `FinalizationOutcome` branches.
2. Add tests for rerun child linkage and parent superseded behavior.
3. Add tests that parent candidates cannot be added to rerun.
4. Add tests for SLA breach and ECI escalation path activation.
5. Add tests confirming parent immutability post-child creation.

**Exit Criteria**:
- Finalization outcomes map exactly to locked enums.
- Rerun mechanics satisfy candidate exclusion and one-rerun cap.
- Parent immutability and SLA behavior are test-validated.

---

### Phase 9 — Observability Event Layer and Anomaly Path

**Goal**: Ensure event semantics are complete for off-chain reconciliation and lock anomaly behavior to event-only mode.

**Files Touched**: `src/lib/DVoteEvents.sol` (UPDATE), `src/DVoteManager.sol` (UPDATE), `test/unit/DVoteManager.events.t.sol` (CREATE)

<!-- TOOL: SOLIDITY -->
**Logical Flow**:
1. Add full event contract payloads for role, election, KYC, vote, pause, finalize, rerun, and anomaly actions.
2. Implement observer anomaly report function as event-only path.
3. Explicitly avoid auto-mitigation hooks in anomaly path for MVP.
4. Ensure event payload fields are sufficient for backend reconstruction.
5. Maintain aadhaar-only trace fields in events for off-chain counting.
6. Publish frozen consumer parity contract for event fields and boundary semantics (strict `votingEnd` and pause-not-extend).

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Add event emission tests for each critical mutation path.
2. Validate indexed fields and payload integrity.
3. Validate anomaly flow emits event and does not mutate election state.

**Exit Criteria**:
- Event model is complete and deterministic.
- Observer anomaly route is event-only and state-safe.
- Aadhaar-only off-chain aggregation is feasible from events.
- Consumer parity contract for event payload and vote-boundary semantics is documented for integration handoff.

---

### Phase 10 — Foundry Script Suite and Hardhat Fallback Alignment

**Goal**: Build deterministic deployment and operational scripts for local and Sepolia workflows.

**Files Touched**: `script/DeployDVote.s.sol` (CREATE), `script/BootstrapElection.s.sol` (CREATE), `script/FinalizeElection.s.sol` (CREATE), `script/CreateRerunElection.s.sol` (CREATE), `script/RotateKycSigner.s.sol` (CREATE), `script/PostDeployCheck.s.sol` (CREATE), `scripts/deploy.js` (UPDATE), `package.json` (UPDATE)

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Implement deployment script to deploy manager and grant initial roles.
2. Implement bootstrap script for election setup and candidate registration.
3. Implement finalize script for controlled finalization execution.
4. Implement rerun creation script with parent-child and exclusion checks.
5. Implement signer rotation script with immediate cutoff verification.
6. Implement post-deploy check script for invariants and role matrix sanity.

<!-- TOOL: HARDHAT -->
**Logical Flow**:
1. Update fallback `scripts/deploy.js` to deploy `DVoteManager` (not Counter).
2. Keep fallback usage limited to recovery scenarios.
3. Ensure fallback script logs exact verify command for sepolia.

**Exit Criteria**:
- All required Foundry scripts compile.
- Local script execution on anvil succeeds.
- Hardhat fallback deploy script remains functional and aligned.

---

### Phase 11 — Unit, Fuzz, and Invariant Test Completion

**Goal**: Build complete test matrix for correctness, replay safety, and policy enforcement.

**Files Touched**: `test/helpers/DVoteTestBase.sol` (CREATE), `test/unit/*.sol` (CREATE), `test/fuzz/*.sol` (CREATE), `test/invariant/DVoteManager.invariant.t.sol` (CREATE)

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Build shared fixture utilities and test addresses in base helper.
2. Implement unit tests for RBAC, lifecycle, KYC, vote, finalize, rerun, events.
3. Implement fuzz tests for timing, replay vectors, and candidate ordering.
4. Implement invariants:
	- total votes equals sum of candidate votes
	- wallet and commitment dedupe monotonicity
	- rerun cap and superseded state safety
5. Add mandatory chain ID mismatch matrix in EIP-712 unit and fuzz suites.
6. Ensure paused elections do not accept votes and pause never mutates deadline.

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Execute `forge test -vvv` after each major suite addition.
2. Use `forge test --match-test` for targeted debugging.
3. Capture deterministic logs for failing edge paths.

**Exit Criteria**:
- Unit, fuzz, and invariant suites pass.
- Chain ID replay protection is explicitly test-asserted.
- Critical policy locks are all covered by tests.

---

### Phase 12 — Gas and Performance Gates

**Goal**: Enforce gas-awareness and detect regressions in critical mutation paths.

**Files Touched**: `package.json` (UPDATE), `test/unit/*.sol` (UPDATE as needed)

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Run `forge snapshot` and capture baseline gas values.
2. Identify high-impact functions:
	- KYC approval
	- cast vote
	- pause/unpause
	- finalize
	- create rerun
3. Eliminate avoidable storage reads and long revert strings.
4. Re-run snapshots and compare to baseline before phase close.

**Exit Criteria**:
- Snapshot generated successfully.
- No unexpected gas blow-up in critical paths.

---

### Phase 13 — Sepolia Deployment and Verification Runbook

**Goal**: Execute controlled testnet deployment and verification using Foundry primary workflow.

**Files Touched**: `script/*.s.sol` (UPDATE if needed), `.env.example` (VERIFY), `README.md` (UPDATE)

<!-- TOOL: FOUNDRY -->
**Logical Flow**:
1. Confirm all required env variables before broadcast.
2. Run deploy script against sepolia with broadcast and verify.
3. Run bootstrap and post-deploy checks on sepolia.
4. Record deployed addresses and role assignments.

<!-- TOOL: ETHERSCAN -->
**Logical Flow**:
1. Confirm verify output and contract source linkage.
2. Confirm constructor args and compiler settings match expected profile.

**Exit Criteria**:
- Sepolia deploy succeeds.
- Verification succeeds.
- Post-deploy check confirms expected role and state sanity.

---

### Phase 14 — Final Hygiene, Handoff, and Plan Lock

**Goal**: Finish with clean repository state, complete checklist, and reproducible runbook.

**Files Touched**: `README.md` (UPDATE), `EXP-6_FOUNDRY_PLAN.md` (UPDATE), `package.json` (VERIFY)

<!-- TOOL: SHELL -->
**Logical Flow**:
1. Run full test and build suite one final time.
2. Ensure no secret files are staged.
3. Ensure temporary debug scripts/logs are removed.
4. Update README commands and expected outputs where needed.
5. Revalidate line count and finalize FILE_LENGTH_TAG.

**Exit Criteria**:
- Clean final command suite passes.
- Plan and README align with actual executable flow.
- Repository is ready for phase-based commits.

---

## 4. Crucial Development Moments (CDM)

> Read each CDM before its related phase. These are the highest-risk failure points.

---

#### CDM-1 — Typed Data Domain Drift (Phase 6)

**Risk**: EIP-712 signatures fail silently across environments if domain values differ.

**Why it matters**: KYC approvals become unverifiable and voter eligibility collapses.

**What to do**:
1. Lock EIP-712 domain name and version constants.
2. Lock chain ID expectations in tests.
3. Assert mismatch reverts for chain ID and contract address domain drift.

**Common Mistake**: Testing only valid signatures and skipping mismatch assertions.

---

#### CDM-2 — Deadline Mutation Through Pause Logic (Phase 5)

**Risk**: Hidden extension of `votingEnd` can introduce governance abuse vectors.

**Why it matters**: Election predictability and fairness assumptions break.

**What to do**:
1. Keep `votingEnd` immutable after creation.
2. Pause/unpause should only toggle status.
3. Add explicit tests that deadline remains unchanged before and after pause cycles.

**Common Mistake**: Adding convenience extension logic during incident handling.

---

#### CDM-3 — Boundary-Time Vote Acceptance (Phase 7)

**Risk**: Accepting votes at `block.timestamp == votingEnd` violates locked policy.

**Why it matters**: Deterministic closure and replay-safe finalization are weakened.

**What to do**:
1. Implement range check as `[votingStart, votingEnd)`.
2. Test exactly at boundary and one second after.
3. Ensure mined-after-end transactions always revert.

**Common Mistake**: Writing `<= votingEnd` during precondition checks.

---

#### CDM-4 — Tie-Lot Signer Authority Confusion (Phase 8)

**Risk**: Allowing non-ECI signers for tie seed introduces trust ambiguity.

**Why it matters**: Tie resolution legitimacy can be disputed.

**What to do**:
1. Restrict tie-seed signature authority to ECI role only.
2. Validate signer role in tie-lot execution path.
3. Emit event with seed hash and signer address.

**Common Mistake**: Reusing generic signer role checks for tie-lot path.

---

#### CDM-5 — Parent Mutability After Rerun Creation (Phase 8)

**Risk**: Post-child edits to parent election state create audit ambiguity.

**Why it matters**: Parent lineage becomes contestable and historical integrity weakens.

**What to do**:
1. Mark parent as superseded and immutable immediately after child rerun creation.
2. Block all parent mutation entry points except read functions.
3. Test every previously mutable path for correct superseded-state revert.

**Common Mistake**: Allowing “minor metadata edits” on parent after child creation.

---

#### CDM-6 — Candidate Exclusion Leakage in Rerun (Phase 8)

**Risk**: Parent contesting candidates accidentally re-enter rerun.

**Why it matters**: Rerun legitimacy policy is directly violated.

**What to do**:
1. Persist disallow set during child creation.
2. Reject candidate registration if candidate exists in parent contesting set.
3. Add tests for all parent candidates, not only top-vote subset.

**Common Mistake**: Blocking only tied finalists instead of all parent contestants.

---

#### CDM-7 — Signature Replay Through Nonce Mis-scoping (Phase 6)

**Risk**: Improper nonce handling permits reused approvals.

**Why it matters**: KYC integrity and one-identity constraints degrade.

**What to do**:
1. Keep nonces strictly monotonic per subject wallet.
2. Include nonce in typed payload and on-chain verification.
3. Test replay attempts with same nonce and altered payload variants.

**Common Mistake**: Incrementing nonce only on successful vote, not on approval acceptance.

---

#### CDM-8 — ERC-1271 False Positives (Phase 6)

**Risk**: Contract wallet signatures pass with malformed return values if checks are loose.

**Why it matters**: Attestation trust boundary is compromised.

**What to do**:
1. Use OpenZeppelin SignatureChecker path.
2. Test valid and invalid ERC-1271 return values via fixture contract.
3. Verify same payload rules apply across EOA and contract-wallet signers.

**Common Mistake**: Assuming `isValidSignature` success without checking exact magic value semantics.

---

#### CDM-9 — Event Contract Drift from Backend Expectations (Phase 9)

**Risk**: Event payload changes break read-model reconstruction.

**Why it matters**: Backend and frontend may show inconsistent status despite correct chain state.

**What to do**:
1. Freeze event field set before integration handoff.
2. Add event parity tests with expected field values.
3. Avoid renaming payload semantics after integration freeze.

**Common Mistake**: Refactoring event names and indexes late in cycle.

---

#### CDM-10 — Aadhaar-Only Counting Misplaced On-Chain (Phase 9)

**Risk**: Attempting to maintain aggregate counts on-chain increases gas/storage complexity.

**Why it matters**: MVP cost profile and contract simplicity regress.

**What to do**:
1. Emit aadhaar-only flags and reason hashes in events.
2. Keep aggregate counting in off-chain indexers.
3. Validate indexer derivation logic with sampled event replay.

**Common Mistake**: Introducing mutable on-chain counters for reporting convenience.

---

#### CDM-11 — Multi-signer Dead-code Introduction (Phase 6)

**Risk**: Partially wired multi-signer logic creates unreachable or insecure branches.

**Why it matters**: Attack surface expands without feature readiness.

**What to do**:
1. Keep MVP code strictly single-signer path.
2. Document extension point in comments and plan only.
3. Reject feature creep PRs introducing disabled multi-signer branches.

**Common Mistake**: Adding feature flags for trust models not yet validated.

---

#### CDM-12 — Script Environment Drift (Phase 10/13)

**Risk**: Scripts succeed locally but fail on sepolia due env mismatch.

**Why it matters**: Deployment reproducibility breaks near final stages.

**What to do**:
1. Keep required env key list versioned in `.env.example`.
2. Add preflight checks in scripts for missing env values.
3. Use post-deploy sanity scripts after each network deployment.

**Common Mistake**: Running verify path without confirming exact compiler/network settings.

---

## 5. Manual Execution Tasks (MET)

These tasks require human action and are not safely automated.

---

### MET-1 — Wallet Preparation for Role Accounts (before Phase 6)

1. Prepare dedicated wallets for Admin, ECI, SRO, RO, Observer, and KYC signer.
2. Ensure wallets are test-only and not linked to production funds.
3. Record wallet labels in a local secure note for deterministic script mapping.
4. Populate local `.env` role addresses where required by scripts.

---

### MET-2 — Sepolia Funding (before Phase 13)

1. Acquire Sepolia ETH for all operational wallets from trusted faucets.
2. Ensure deployer wallet has sufficient ETH for deployment and verification retries.
3. Confirm ECI signer wallet has enough ETH for tie-seed and rerun actions.

---

### MET-3 — Anvil Session Start (before Phase 10)

1. Start `anvil` in a dedicated terminal.
2. Confirm chain ID is `31337`.
3. Export one funded private key to local `.env` for script runs.
4. Keep node session active through script dry-run sequence.

---

### MET-4 — KYC Typed Payload Dry-Run Signing (before Phase 6 tests)

1. Produce a sample typed KYC payload off-chain.
2. Sign payload using test EOA signer.
3. Replay same payload with wrong chain ID and verify expected rejection.
4. Archive sample payload JSON in local non-committed notes.

---

### MET-5 — ERC-1271 Fixture Validation (before Phase 11 close)

1. Deploy mock ERC-1271 wallet fixture via test environment.
2. Verify valid signature path passes.
3. Verify malformed or magic-value-mismatch signature fails.

---

### MET-6 — Rerun Governance Drill (before Phase 13)

1. Run a local election that triggers NOTA rerun condition.
2. Create child rerun election via script.
3. Verify parent election is superseded and immutable.
4. Verify all parent candidates are excluded from child.

---

### MET-7 — Tie-Lot Seed Workflow Check (before Phase 13)

1. Prepare sample tie-lot seed payload tied to election context.
2. Sign payload with ECI wallet only.
3. Attempt same with non-ECI signer and confirm rejection.

---

### MET-8 — Pause Boundary Drill (before Phase 11 close)

1. Pause election near close boundary.
2. Unpause within allowed window.
3. Confirm `votingEnd` remains unchanged.
4. Confirm vote at/after end still fails.

---

### MET-9 — Event Replay for Off-chain Aadhaar Counts (before Phase 14)

1. Export local chain events containing `isAadhaarOnly` field.
2. Compute aggregate aadhaar-only counts off-chain.
3. Compare derived counts against expected KYC approvals.

---

### MET-10 — Observer Anomaly Event-Only Validation (before Phase 14)

1. Submit sample anomaly report from observer role.
2. Confirm event emission is present.
3. Confirm no automatic election status mutation occurred.

---

### MET-11 — Verification and Explorer Evidence Capture (before final commit)

1. Verify sepolia deployment on explorer.
2. Capture deployed address, tx hash, and verification URL.
3. Store links in local release notes and README as needed.

---

### MET-12 — Pre-commit Secret Sweep (before Phase 14 close)

1. Run staged diff review.
2. Confirm no secret-bearing files are staged.
3. Confirm `.env` remains untracked.

---

## 6. Verification Checklist

All boxes should be checked before marking implementation complete.

### 6.1 Build and Compiler Gates

- [ ] `forge build` returns zero errors.
- [ ] `npx hardhat compile` returns zero errors for fallback compatibility.
- [ ] All new source files compile without import-cycle warnings.

### 6.2 Unit Test Gates

- [ ] RBAC suite passes.
- [ ] Lifecycle suite passes.
- [ ] KYC suite passes.
- [ ] Voting suite passes.
- [ ] Finalization suite passes.
- [ ] Rerun suite passes.
- [ ] Event suite passes.

### 6.3 Fuzz and Invariant Gates

- [ ] Lifecycle fuzz suite passes.
- [ ] KYC fuzz suite passes.
- [ ] Vote fuzz suite passes.
- [ ] Invariant suite passes.
- [ ] No invariant break appears in randomized execution.

### 6.4 Mandatory Policy Assertions

- [ ] Vote at exact `votingEnd` fails.
- [ ] Pause does not alter `votingEnd`.
- [ ] Tie-lot seed is accepted only from ECI signer.
- [ ] All parent contesting candidates are excluded in rerun.
- [ ] Parent election is immutable once child rerun is created.
- [ ] Rerun SLA is fixed to 7 days.
- [ ] EIP-712 chain ID mismatch tests fail as expected.
- [ ] Multi-signer KYC logic is absent from MVP code paths.
- [ ] Aadhaar-only counts are derived off-chain from events.
- [ ] Observer anomaly path remains event-only.

### 6.5 Script and Deployment Gates

- [ ] Local deploy script (`DeployDVote.s.sol`) passes on anvil.
- [ ] Local bootstrap script passes.
- [ ] Local finalization script passes.
- [ ] Local rerun creation script passes.
- [ ] Local signer rotation script passes.
- [ ] Post-deploy check script passes.

### 6.6 Sepolia Gates

- [ ] Sepolia deployment succeeds.
- [ ] Contract verification succeeds.
- [ ] Role matrix on deployed contract matches expected role addresses.

### 6.7 Hygiene and Security Gates

- [ ] No secret files staged.
- [ ] `.env` remains untracked.
- [ ] README command set aligns with final script names.
- [ ] FILE_LENGTH_TAG matches actual line count classification.

### 6.8 Integration Handoff Gate (Consumer Interface Freeze)

- [ ] Event payload parity artifact is generated before backend/frontend integration handoff.
- [ ] Artifact includes event name, field order, canonical type, and indexed-flag matrix for all frozen consumer events.
- [ ] Artifact confirms strict vote boundary parity in consumer contracts: no-grace `votingEnd` and pause-not-extend behavior are surfaced unchanged.
- [ ] Integration handoff is blocked if any event-schema or boundary-semantics drift is unresolved.

---

## 7. Known Issues & Fixes

### Issue-1 — Hardhat 3 command failures under old Node

**Symptom**: Hardhat initialization/compile failures with unsupported Node version.

**Root Cause**: Hardhat 3 expects Node 22+ baseline.

**Fix**:

```bash
cd Exp-6
nvm install 22
nvm use 22
node --version
npx hardhat --version
```

**Reference**: Hardhat docs (Getting Started / Foundry compatibility).

---

### Issue-2 — Signature verification mismatch from typed data domain drift

**Symptom**: Valid-looking KYC signatures revert as invalid signer.

**Root Cause**: Chain ID or verifying-contract mismatch in EIP-712 domain.

**Fix**:

```bash
forge test -vvv --match-path test/unit/DVoteManager.kyc.t.sol
```

Then validate typed payload domain values in test fixtures and signer toolchain.

---

### Issue-3 — Forge remapping resolution failures

**Symptom**: Import errors for `forge-std` or OpenZeppelin contracts.

**Root Cause**: Missing `forge install` dependencies or remapping drift.

**Fix**:

```bash
cd Exp-6
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
```

---

### Issue-4 — Sepolia verification mismatch

**Symptom**: Explorer verification fails despite successful deployment.

**Root Cause**: Compiler settings mismatch or incorrect constructor argument handling.

**Fix**:

```bash
cd Exp-6
forge build
forge script script/DeployDVote.s.sol --rpc-url sepolia --broadcast --verify -vvvv
```

Ensure compile profile and deploy script arguments match exactly.

---

### Issue-5 — Flaky boundary tests around timestamps

**Symptom**: Vote-window tests pass intermittently.

**Root Cause**: Time warping without deterministic setup for boundary block timestamps.

**Fix**:

```bash
forge test -vvv --match-path test/unit/DVoteManager.lifecycle.t.sol
```

Pin warp values explicitly and isolate boundary assertions.

---

### Issue-6 — Event decoding drift in integration consumers

**Symptom**: Backend parser fails after event payload refactor.

**Root Cause**: Event schema changes introduced without parity checks.

**Fix**:

```bash
forge test -vvv --match-path test/unit/DVoteManager.events.t.sol
```

Freeze event schema after integration handoff.

---

## 8. Security Reminders

> These are non-negotiable security rules for DVote Foundry MVP.

1. Never commit `.env`, private keys, or seed phrases.
2. Use only dedicated test wallets for all role actors.
3. Do not deploy to mainnet.
4. Restrict privileged functions with explicit role checks.
5. Keep signer rotation auditable via events.
6. Do not add hidden override paths for election mutation.
7. Keep pause action bounded to status toggles; never deadline mutation.
8. Enforce strict vote close boundary and reject late-mined transactions.
9. Keep anomaly handling event-only in MVP; avoid automatic punitive state transitions.
10. Keep Aadhaar-only aggregate metrics off-chain; on-chain stores only traceable event fields.
11. Do not introduce deferred multi-signer logic branches into runtime code.
12. Verify staged changes before every commit using diff review.

---

## 9. Git Commit Checkpoints

Use commit boundaries after successful phase exits.

| Checkpoint | After Completing | Suggested Commit Message |
|---|---|---|
| CP-1 | Phase 1 | `chore(exp-6): lock node22 and foundry baseline for dvote` |
| CP-2 | Phase 2 | `feat(exp-6): replace counter scaffold with dvote contract layout` |
| CP-3 | Phase 3 | `feat(exp-6): add dvote types errors constants and event model` |
| CP-4 | Phase 4 | `feat(exp-6): implement rbac and kyc signer governance` |
| CP-5 | Phase 5 | `feat(exp-6): add lifecycle guards with strict no-grace close` |
| CP-6 | Phase 6 | `feat(exp-6): implement eip712 kyc with chainid replay protection` |
| CP-7 | Phase 7 | `feat(exp-6): implement vote path with wallet and commitment dedupe` |
| CP-8 | Phase 8 | `feat(exp-6): add nota tie-lot rerun and parent immutability logic` |
| CP-9 | Phase 9 | `feat(exp-6): finalize observability events and anomaly event-only path` |
| CP-10 | Phase 10 | `exp(exp-6): add foundry deployment bootstrap and rerun scripts` |
| CP-11 | Phase 11 | `test(exp-6): add unit fuzz invariant suites for dvote manager` |
| CP-12 | Phase 12 | `test(exp-6): capture gas snapshots and optimize critical paths` |
| CP-13 | Phase 13 | `exp(exp-6): deploy and verify dvote manager on sepolia` |
| CP-14 | Phase 14 | `chore(exp-6): finalize README hygiene and plan lock for dvote` |

### 9.1 Commit Hygiene Rules

1. Do not commit with failing tests.
2. Do not batch unrelated refactors into phase commits.
3. Keep commit scope as `exp-6`.
4. Squash local WIP commits before PR if needed.

---

### 9.2 Deferred Items Register (Post-MVP)

These are intentionally deferred and must not be implemented in MVP code paths.

1. Multi-signer KYC trust model.
2. Configurable rerun SLA governance parameter.
3. Automatic anomaly-driven mitigation hooks.
4. On-chain aadhaar-only aggregate counters.
5. Privacy-preserving voting cryptography.

---

### 9.3 Plan Completion Declaration

This plan is complete for Foundry MVP authoring scope when all sections 0-9 are present, all phase exit criteria are satisfied, and verification gates in Section 6 pass on local and testnet execution.



