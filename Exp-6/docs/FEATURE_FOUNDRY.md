# DVote (MVP + Foundry) - Technical Feature Description

Authoring scope: Exp-6 Foundry only
Status: Revised draft baseline for implementation
Last updated: 2026-04-07

---

## 1. Purpose and Scope

This document defines the complete technical feature description for the DVote mini-project Foundry
layer in Exp-6. It is the implementation contract for on-chain architecture, permissions,
election lifecycle behavior, finalization policy, security boundaries, testing strategy, and
deployment runbooks.

This specification is aligned to:

- ITL801 LO6 (full-fledged DApp design and development)
- Blockchain Lab manual expectations for mini-project quality and documentation
- Exp-6 idea constraints finalized during Foundry-focused brainstorming
- Backend integration contract in Exp-6/docs/FEATURE_BACKEND.md
- Frontend integration contract in Exp-6/docs/FEATURE_FRONTEND.md

### 1.1 In Scope (Foundry MVP)

- Solidity contracts under Exp-6/src
- Foundry scripts under Exp-6/script
- Foundry tests under Exp-6/test
- On-chain RBAC and election lifecycle controls
- On-chain identity commitment and vote-integrity guarantees
- EIP-712 based KYC attestation verification interface
- NOTA policy, tie policy, and rerun governance rules
- Sepolia deployment and verification workflow
- Hardhat fallback guidance only where necessary

### 1.2 Out of Scope (for this document)

- Frontend routing, UI system, and design tokens
- Backend API implementation internals (Prisma, Turso, Redis, R2)
- Notification transport infrastructure details
- Websocket or polling implementation details
- Vercel deployment internals for frontend and backend

### 1.3 Core Decisions (Locked)

- Result model: pure on-chain incremental tally
- Candidate cap: 15 contesting candidates per election
- Identity commitment: sha256(identityDocumentCanonical + electionSalt)
- KYC authorization path: EIP-712 signed attestation only
- Signature verification support: EOA plus ERC-1271 smart-contract wallets
- Role model: OpenZeppelin AccessControl
- Vote token policy: backend-side only, not validated on-chain
- Winner strategy: bounded finalize scan, no unbounded loops
- Candidate registration cutoff: locked at VotingOpen
- NOTA policy: if NOTA is top winner in base election, rerun is mandatory
- Tie policy: lot includes NOTA, using ECI-signed random seed
- Rerun cap policy: only one rerun; if rerun also has NOTA top, highest non-NOTA candidate wins

### 1.4 Cross-Layer Authority and Boundaries

1. This file is the canonical authority for election outcome logic and on-chain state transitions.
2. Backend and frontend specifications are integration contracts and cannot override on-chain finality.
3. Backend orchestration may pre-validate and relay actions, but contract rules remain final.

### 1.5 Statutory Baseline vs DVote Protocol Policy

1. Real-world statutory defaults are documented for academic traceability.
2. DVote intentionally applies stricter protocol-level rules for project robustness goals.
3. NOTA rerun behavior in DVote is a deliberate protocol policy choice.

---

## 2. Functional Goals

1. Guarantee one eligible identity commitment can cast only one vote per election.
2. Guarantee one wallet can cast only one vote per election.
3. Prevent voting outside configured election windows.
4. Preserve transparent and immutable tally progression on-chain.
5. Support election operations with explicit role-based access controls.
6. Provide emergency controls with auditable reason metadata.
7. Provide deterministic rerun behavior for NOTA and tie edge cases.
8. Provide robust test depth: unit plus fuzz plus invariants before deployment.

---

## 3. Non-Goals

1. Anonymous cryptographic voting (zk, blind signatures, homomorphic tally) in MVP.
2. Fully decentralized KYC source of truth.
3. Upgradeable proxy architecture in MVP.
4. Cross-chain election support.
5. Replacing backend abuse controls like API rate limiting with contract-side throttling.

---

## 4. Contract Topology (Foundry MVP)

The MVP uses a single election-manager architecture (single deployable core contract) that manages
multiple elections internally using mappings and bounded collections.

### 4.1 Primary Contract

DVoteManager.sol responsibilities:

- Role-based administration (AccessControl)
- Election creation, scheduling, pausing, closure, finalization, and rerun linkage
- Candidate registration per election with strict cap
- Voter KYC attestation acceptance and eligibility gates
- Vote submission and tally updates
- Result publication and rerun trigger states
- Audit events for all critical transitions

### 4.2 Optional Supporting Libraries

DVoteErrors.sol
- Custom errors for lower gas and deterministic revert handling.

DVoteTypes.sol
- Shared enums and structs for contract clarity and test parity.

DVoteHashing.sol
- Helpers for canonical commitment and typed-hash generation.

---

## 5. Role and Permission Model

OpenZeppelin AccessControl is mandatory for MVP role management.

### 5.1 Role Constants

- DEFAULT_ADMIN_ROLE
- ECI_ROLE
- SRO_ROLE
- RO_ROLE
- OBSERVER_ROLE
- KYC_SIGNER_ROLE
- EMERGENCY_ROLE

### 5.2 Principle of Least Privilege

1. DEFAULT_ADMIN_ROLE grants and revokes non-admin roles.
2. ECI_ROLE governs election lifecycle approvals and signer governance.
3. SRO_ROLE handles constituency-level setup under ECI policy.
4. RO_ROLE executes constituency operations such as candidate onboarding.
5. OBSERVER_ROLE cannot mutate election or identity state, except anomaly report emission.
6. EMERGENCY_ROLE can pause or unpause according to strict guards.

### 5.3 Role Escalation Constraints

- No role can self-upgrade into admin privileges.
- Observer role cannot gain management rights through internal call paths.
- Emergency actions are separately permissioned from election creation rights.

### 5.4 Role Reassignment Model

1. On-chain reassignment is explicit revoke then grant.
2. No on-chain pending-role state machine is used in MVP.
3. Backend may manage pending workflow off-chain, but chain truth is only emitted revoke/grant events.

---

## 6. Data Model

### 6.1 Election and Control Enums

enum ElectionStatus {
  Draft,
  RegistrationOpen,
  VotingOpen,
  VotingPaused,
  VotingClosed,
  Finalized,
  RerunRequired,
  Superseded,
  Cancelled
}

enum PauseReason {
  SecurityAnomaly,
  InfrastructureFailure,
  JudicialDirective,
  TechnicalMaintenance
}

enum AnomalyCode {
  DuplicateIdentitySuspicion,
  VoteSpikeShortWindow,
  InfrastructureOutage,
  UnauthorizedAdminActionAttempt,
  KycReviewManipulationSuspicion
}

enum FinalizationOutcome {
  CandidateWon,
  NotaTriggeredRerun,
  TieLotCandidateWon,
  TieLotNotaTriggeredRerun
}

### 6.2 Canonical Constants

- NOTA_CANDIDATE_ID = keccak256("D VOTE NOTA")
- MAX_CONTESTING_CANDIDATES = 15
- MAX_RERUNS = 1
- RERUN_CREATION_SLA = 7 days
- EIP712_NAME = "DVoteKycAttestation"
- EIP712_VERSION = "1"

### 6.3 Core Structs

Election
- uint256 electionId
- bytes32 constituencyId
- bytes32 electionSalt
- uint256 parentElectionId
- uint256 childElectionId
- uint64 registrationStart
- uint64 registrationEnd
- uint64 votingStart
- uint64 votingEnd
- uint64 rerunDeadline
- uint64 createdAt
- ElectionStatus status
- uint8 candidateCount
- uint8 rerunCount
- uint8 winnerIndex
- bool winnerIsNota
- uint64 totalVotesCast
- uint64 finalizedAt
- bool exists

Candidate
- bytes32 candidateId
- string displayName
- bytes32 nominationMetadataHash
- uint64 voteCount
- uint64 registeredAt
- bool isNota
- bool active

VoterState
- bool isKycApproved
- bool hasVoted
- uint64 votedAt
- uint64 kycValidUntil
- bytes32 identityCommitment

KycApproval
- address subjectWallet
- bytes32 commitment
- uint256 electionId
- uint256 nonce
- uint256 expiry
- bool isAadhaarOnly
- bytes32 reasonCodeHash

### 6.4 Mappings

- mapping(uint256 => Election) elections
- mapping(uint256 => mapping(uint8 => Candidate)) candidates
- mapping(uint256 => mapping(address => VoterState)) voterStates
- mapping(uint256 => mapping(bytes32 => bool)) commitmentUsed
- mapping(address => uint256) kycNonces
- mapping(uint256 => mapping(bytes32 => bool)) electionSaltUsed
- mapping(uint256 => mapping(bytes32 => bool)) candidateIdRegistered
- mapping(uint256 => mapping(bytes32 => bool)) disallowedCandidateInRerun

### 6.5 Storage Safety Rules

1. Contesting candidate count must be less than or equal to 15.
2. NOTA uses a fixed pseudo-candidate and does not consume contesting-candidate cap.
3. Candidate ID and nomination hash must be unique within each election.
4. Election salt must be non-zero and unique per election.
5. Election IDs are monotonic and never reused.
6. Winner fields are valid only when election status is Finalized.
7. KYC nonces are strictly monotonic per subject wallet.
8. Rerun count cannot exceed one for a root election.
9. Superseded parent elections cannot reopen registration or voting.

### 6.6 EIP-712 Typed Data Contract

The canonical KYC typed payload fields are:

- subjectWallet
- commitment
- electionId
- nonce
- expiry
- isAadhaarOnly
- reasonCodeHash

Type hash and domain separator must be explicitly versioned in-contract and test-asserted.

---

## 7. Identity Commitment and KYC Gate

### 7.1 Identity Commitment Construction

commitment = sha256(abi.encodePacked(identityDocumentCanonical, electionSalt))

Where:

- identityDocumentCanonical is derived off-chain from Aadhaar or EPIC input.
- Raw Aadhaar and EPIC values are never written on-chain.
- electionSalt is stored on-chain and emitted at election creation.

### 7.2 KYC Approval Flow (EIP-712)

1. Authorized signer with KYC_SIGNER_ROLE signs typed data.
2. Subject wallet or trusted relay submits attestation payload.
3. Contract validates role, domain, type hash, signer binding, nonce, expiry, and election binding.
4. Signature verification supports EOA and ERC-1271 via SignatureChecker.
5. On success, voter state becomes KYC-approved for target election.

Direct privileged KYC-approve flips are not part of MVP.

### 7.3 Replay and Misuse Controls

1. Nonce mismatch reverts.
2. Expired signatures revert.
3. Signature reuse across wallet or election scope reverts.
4. Used commitment cannot cast a second vote in the same election.
5. KYC signer rotation is immediate cutoff; revoked signer signatures become invalid.

### 7.4 Aadhaar-Only Fallback Traceability

1. Aadhaar-only approvals are accepted only via signed attestation path.
2. Contract stores isAadhaarOnly and reasonCodeHash.
3. Raw reason text and raw identity data remain off-chain.
4. Backend and frontend rely on hash-linked metadata for audit parity.

### 7.5 Backend-to-Contract KYC Handoff

1. Backend queue approval does not directly mutate on-chain eligibility.
2. Eligibility becomes valid on-chain only after accepted EIP-712 attestation.

---

## 8. Election Lifecycle and Rerun Governance

### 8.1 Allowed Transitions

Draft -> RegistrationOpen -> VotingOpen -> VotingPaused <-> VotingOpen -> VotingClosed -> Finalized

Draft -> Cancelled is allowed before voting opens.

Finalized -> RerunRequired occurs only when finalization outcome triggers rerun policy.

Parent election in RerunRequired -> Superseded when child rerun election is created.

### 8.2 Transition Guards

1. registrationStart < registrationEnd.
2. votingStart < votingEnd.
3. votingStart must be after registrationEnd.
4. Candidate registration is allowed only in Draft or RegistrationOpen.
5. addCandidate must revert once status is VotingOpen or beyond.
6. Pause allowed only in VotingOpen.
7. Unpause allowed only from VotingPaused and before votingEnd.
8. Finalize allowed only after VotingClosed.

### 8.3 Time Boundary Policy

1. Vote is valid only when block.timestamp is within [votingStart, votingEnd).
2. Any transaction mined at or after votingEnd reverts for vote cast.
3. On-chain time is UTC epoch. Display timezone conversion is off-chain concern.

### 8.4 Rerun SLA and Escalation

1. If rerun is required, rerunDeadline is set to finalizedAt + 7 days.
2. Owner roles are expected to create the rerun before deadline.
3. If deadline is missed, authority to trigger rerun creation auto-escalates to ECI_ROLE path.
4. Rerun election links parentElectionId and parent childElectionId both ways.

### 8.5 Rerun Participation Rules

1. All prior contesting candidates from parent election are disallowed in rerun.
2. Prior voter KYC may be reused only if attestation validity window is still active.
3. Rerun count is capped to one.

---

## 9. Voting Rules and Finalization Policy

### 9.1 Cast Vote Preconditions

1. Election exists and status is VotingOpen.
2. Caller is KYC approved for election and KYC validity has not expired.
3. Caller has not voted in election.
4. Submitted commitment is unused in election.
5. Candidate index is valid and candidate is active.
6. Contract does not validate backend vote token by design.

### 9.2 State Updates on Vote

1. hasVoted becomes true.
2. commitmentUsed becomes true.
3. Candidate vote count increments by exactly one.
4. election.totalVotesCast increments by exactly one.
5. votedAt timestamp persists.
6. VoteCast event emits cumulative snapshot fields.

### 9.3 Finalization Strategy

Winner is computed by bounded scan at finalize time. No unbounded loops are allowed.

### 9.4 Tie and NOTA Policy

1. If highest vote holder is NOTA in base election, status enters RerunRequired.
2. If top tie exists, lot includes NOTA as a participant where applicable.
3. Lot randomness source is ECI-signed random seed validated on-chain.
4. If lot result picks NOTA, rerun is triggered immediately.
5. If rerun election also results in NOTA top, highest non-NOTA candidate is finalized as winner.

---

## 10. Events and Observability

Mandatory event semantics (names can vary if semantics are preserved):

- RoleGrantedDetailed(role, account, sender, timestamp)
- RoleRevokedDetailed(role, account, sender, timestamp)
- ElectionCreated(electionId, constituencyId, sender)
- ElectionSaltPublished(electionId, electionSalt)
- ElectionStatusChanged(electionId, previousStatus, nextStatus, sender)
- CandidateAdded(electionId, candidateIndex, candidateId, nominationMetadataHash)
- KycApproved(electionId, wallet, commitment, signer, isAadhaarOnly, reasonCodeHash)
- VoteCast(electionId, candidateIndex, wallet, commitment, candidateVoteCountSnapshot, totalVotesCastSnapshot)
- ElectionPaused(electionId, sender, pauseReason)
- ElectionUnpaused(electionId, sender)
- ObserverAnomalyReported(electionId, reporter, anomalyCode, evidenceHash)
- ElectionFinalized(electionId, winnerIndex, winnerIsNota, finalizationOutcome, finalizedAt)
- ElectionRerunRequired(electionId, rerunDeadline)
- RerunElectionCreated(parentElectionId, childElectionId)
- KycSignerRotated(oldSigner, newSigner, rotatedBy)

Event requirements:

1. Every critical mutation emits an event in the same transaction.
2. Vote state updates and VoteCast emission are atomic.
3. Events must be sufficient for backend reconciliation without hidden assumptions.

---
## 11. Security Controls

### 11.1 Access Security

1. All privileged functions must use explicit role checks.
2. No fallback ownership bypass path should exist.
3. Role grant and revoke and signer-rotation paths must be event-audited.

### 11.2 Integrity Controls

1. Enforce one-wallet-one-vote per election.
2. Enforce one-commitment-one-vote per election.
3. Reject invalid status transitions.
4. Reject out-of-window voting.
5. Reject candidate additions after VotingOpen.

### 11.3 Emergency Controls

1. Election-level pause and unpause are role-gated.
2. Pause actions must use closed PauseReason enum values.
3. Emergency close must not permit retroactive vote writes.

### 11.4 Signature and Key Safety

1. KYC signatures must be verified against active KYC_SIGNER_ROLE holders.
2. Signer rotation uses immediate cutoff (no grace period).
3. Typed data domain values must be test-asserted against expected constants.

### 11.5 Off-Chain Boundary Clarity

1. Backend vote token issuance and API rate limits remain off-chain controls.
2. Contract integrity does not depend on backend token validation.
3. Contract remains safe under direct on-chain interaction assumptions.

---

## 12. Gas and Performance Strategy

### 12.1 Hard Constraints

1. Contesting candidate count per election is capped at 15.
2. No unbounded loops in vote path.
3. No full voter iteration in finalize path.
4. Winner determination uses bounded candidate scan.

### 12.2 Design Practices

1. Use fixed-width types where safe for packing.
2. Use custom errors over long revert strings.
3. Cache repeated storage reads in memory during complex branches.
4. Keep event indexing selective for query value versus gas cost.

### 12.3 Measurement Expectations

1. Maintain gas snapshots via forge snapshot.
2. Track gas regressions for KYC approval, vote cast, pause or unpause, finalize, and rerun setup.

---

## 13. Invariants and Correctness Properties

1. Candidate voteCount never decreases.
2. Wallet cannot vote twice in same election.
3. Commitment cannot be reused in same election.
4. Sum of candidate votes equals election totalVotesCast.
5. Status transitions follow allowed graph only.
6. No vote accepted when block.timestamp is at or after votingEnd.
7. Candidate additions after VotingOpen always revert.
8. Parent election in Superseded state cannot reopen voting.
9. Rerun count never exceeds one.
10. If rerun count is one and NOTA is top again, finalize chooses highest non-NOTA candidate.

---

## 14. Foundry Test Specification

### 14.1 Directory Layout

Recommended organization:

- test/unit/
- test/fuzz/
- test/invariant/
- test/helpers/

### 14.2 Unit Tests (minimum expected)

1. Role grant and revoke and permission boundaries.
2. Election schedule creation guards.
3. Candidate registration and cap plus post-VotingOpen cutoff.
4. KYC approval success and failure (bad signer, bad nonce, expiry, wrong election).
5. KYC signature validation for EOA and ERC-1271 paths.
6. Voting success path and rejection path (double vote, duplicate commitment, invalid candidate).
7. Pause and unpause with enum reason checks.
8. Finalization path for normal winner.
9. Finalization path for NOTA top and rerun required.
10. Tie lot path including NOTA.
11. Rerun policy tests:
    - parent-child linkage
    - disallow parent candidates
    - KYC reuse window checks
    - one-rerun-only behavior
12. Rerun SLA breach escalation to ECI trigger path.

### 14.3 Fuzz Tests

1. Fuzz election timing boundaries.
2. Fuzz candidate indexes and registration ordering.
3. Fuzz KYC signature payload fields and replay attempts.
4. Fuzz anomaly reporting payloads and enum values.
5. Fuzz tie inputs and deterministic lot validation guards.

### 14.4 Invariant Tests

1. sum(votes) equals totalVotesCast.
2. hasVoted never flips true back to false.
3. commitmentUsed never flips true back to false.
4. rerunCount does not exceed one.
5. superseded election cannot accept new votes.

### 14.5 Coverage and Quality Gates

1. forge test -vvv must pass.
2. forge coverage should pass before release candidate tag.
3. Critical flows (KYC verify, vote cast, finalize, rerun) require unit and fuzz coverage.

---

## 15. Script and Deployment Specification

### 15.1 Script Responsibilities

script/DeployDVote.s.sol
- Deploy manager contract
- Grant initial roles
- Emit and print deployment metadata

script/BootstrapElection.s.sol
- Create election
- Publish electionSalt
- Add contesting candidates and NOTA pseudo-candidate

script/FinalizeElection.s.sol
- Trigger finalization and record outcome

script/CreateRerunElection.s.sol
- Create child rerun election from parent RerunRequired state
- Enforce candidate disallow-list from parent election

script/RotateKycSigner.s.sol
- Rotate signer role with immediate cutoff assertions

script/PostDeployCheck.s.sol
- Validate roles, enums, status guards, and key invariants

### 15.2 Environment Requirements

Minimum variables:

- PRIVATE_KEY
- ALCHEMY_API_URL_SEPOLIA or ALCHEMY_API_KEY or INFURA_API_KEY
- ETHERSCAN_API_KEY
- role wallet addresses for Admin, ECI, SRO, RO, Observer, KYC signer

### 15.3 Primary Deployment Workflow (Foundry)

1. Compile: forge build
2. Test: forge test -vvv
3. Deploy local: forge script script/DeployDVote.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
4. Deploy Sepolia: forge script script/DeployDVote.s.sol --rpc-url sepolia --broadcast --verify

### 15.4 Hardhat Fallback Workflow (Secondary)

Hardhat remains fallback only for operational recovery if Foundry path is blocked.

---

## 16. Manual Execution Tasks (MET) and Crucial Development Moments (CDM)

### 16.1 MET Checklist

1. Validate role addresses and signer addresses before deployment.
2. Validate election schedule and salt publication before opening registration.
3. Validate candidate cap and NOTA pseudo-candidate registration.
4. Validate typed-data domain values before collecting signatures.
5. Validate rerun procedure dry-run including candidate disallow rules.

### 16.2 CDM Checklist

1. CDM-RBAC: first role matrix test pass.
2. CDM-KYC: first EIP-712 approval accepted and replay rejected.
3. CDM-SIG: first ERC-1271 validation test pass.
4. CDM-VOTE: first full election from setup to finalize.
5. CDM-NOTA: first NOTA-triggered rerun scenario pass.
6. CDM-RERUN: first SLA breach escalation scenario pass.
7. CDM-TESTNET: Sepolia deployment plus verification plus smoke finalization.

---

## 17. File Map (Target End State)

- src/DVoteManager.sol
- src/lib/DVoteErrors.sol (optional)
- src/lib/DVoteTypes.sol (optional)
- src/lib/DVoteHashing.sol (optional)
- script/DeployDVote.s.sol
- script/BootstrapElection.s.sol
- script/FinalizeElection.s.sol
- script/CreateRerunElection.s.sol
- script/RotateKycSigner.s.sol
- script/PostDeployCheck.s.sol
- test/unit/DVoteManager.unit.t.sol
- test/fuzz/DVoteManager.fuzz.t.sol
- test/invariant/DVoteManager.invariant.t.sol
- test/helpers/DVoteTestBase.sol

---

## 18. Acceptance Criteria (Definition of Done)

1. Contracts compile under configured Foundry profile.
2. Role matrix and reassignment event trail are enforced and tested.
3. Election lifecycle transitions are guarded and tested.
4. KYC EIP-712 path validates signer, nonce, expiry, and replay protections.
5. EOA and ERC-1271 signature paths are both validated.
6. One-wallet-one-vote and one-commitment-one-vote rules are enforced.
7. Candidate cap and post-VotingOpen candidate lock are enforced.
8. Election salt is stored and emitted at election creation.
9. VoteCast includes cumulative candidate and total-vote snapshots.
10. NOTA and tie-lot rules behave as specified.
11. Mandatory rerun triggers on base-election NOTA top outcome.
12. Rerun enforces parent-child linkage and disallows prior candidates.
13. Rerun SLA breach escalation to ECI path is implemented.
14. One-rerun-only fallback (second NOTA top leads to highest non-NOTA candidate win) is enforced.
15. Unit plus fuzz plus invariant suites pass.
16. Sepolia deployment and verification flow is reproducible.

---

## 19. Risks, Tradeoffs, and Deferred Items

### 19.1 Chosen Tradeoffs

1. On-chain incremental tally maximizes auditability at higher per-vote storage cost.
2. Backend-only vote-token validation keeps contracts lean while preserving off-chain UX safeguards.
3. NOTA rerun protocol is stricter than typical default public-election behavior by deliberate design.

### 19.2 Known Risks

1. KYC signer key compromise can affect eligibility decisions.
2. Tie-lot randomness quality depends on signer and verification rigor.
3. Governance misuse risk exists if role custody controls are weak.

### 19.3 Deferred to Post-MVP

1. Advanced privacy-preserving vote cryptography.
2. Upgradeable architecture and migration framework.
3. Multi-chain or L2 strategy.
4. Formal verification beyond invariant fuzzing.

---

## 20. Implementation Sequence (Execution Order)

1. Implement RBAC foundation and role tests.
2. Implement election storage types, enums, and lifecycle transitions.
3. Implement candidate management with cap and registration cutoff.
4. Implement EIP-712 KYC flow with EOA and ERC-1271 support.
5. Implement vote cast path and incremental tally updates.
6. Implement bounded finalization and outcome branching.
7. Implement NOTA rerun mechanics and one-rerun-only fallback.
8. Implement tie-lot flow with ECI-signed seed validation.
9. Implement rerun SLA breach escalation logic.
10. Implement event completeness and atomicity checks.
11. Expand fuzz plus invariant suites.
12. Execute Sepolia dry-run deployment and verification.

---

## 21. Glossary

- electionSalt: per-election unique bytes32 value used in identity commitment hashing.
- reasonCodeHash: hashed reason metadata for Aadhaar-only fallback approvals.
- rerun: mandatory child election triggered by NOTA top outcome in base election.
- superseded election: parent election that cannot accept new actions after rerun creation.
