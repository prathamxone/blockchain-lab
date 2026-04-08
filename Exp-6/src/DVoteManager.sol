// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import {DVoteConstants} from "./constants/DVoteConstants.sol";
import {DVoteErrors} from "./lib/DVoteErrors.sol";
import {DVoteEvents} from "./lib/DVoteEvents.sol";
import {DVoteHashing} from "./lib/DVoteHashing.sol";
import {DVoteTypes} from "./lib/DVoteTypes.sol";
import {IDVoteManager} from "./interfaces/IDVoteManager.sol";

contract DVoteManager is AccessControl, EIP712, IDVoteManager {
    bytes32 public constant ECI_ROLE = keccak256("ECI_ROLE");
    bytes32 public constant SRO_ROLE = keccak256("SRO_ROLE");
    bytes32 public constant RO_ROLE = keccak256("RO_ROLE");
    bytes32 public constant OBSERVER_ROLE = keccak256("OBSERVER_ROLE");
    bytes32 public constant KYC_SIGNER_ROLE = keccak256("KYC_SIGNER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    uint256 public nextElectionId = 1;
    address public activeKycSigner;

    mapping(uint256 => DVoteTypes.Election) private _elections;
    mapping(uint256 => mapping(uint8 => DVoteTypes.Candidate)) private _candidates;
    mapping(uint256 => mapping(address => DVoteTypes.VoterState)) private _voterStates;

    mapping(uint256 => mapping(bytes32 => bool)) public commitmentUsed;
    mapping(address => uint256) public kycNonces;
    mapping(uint256 => mapping(bytes32 => bool)) public electionSaltUsed;
    mapping(uint256 => mapping(bytes32 => bool)) public candidateIdRegistered;
    mapping(uint256 => mapping(bytes32 => bool)) public disallowedCandidateInRerun;

    mapping(uint256 => bool) private _notaAdded;
    mapping(bytes32 => bool) private _globalElectionSaltUsed;

    constructor(
        address admin,
        address eci,
        address sro,
        address ro,
        address observer,
        address kycSigner,
        address emergency
    ) EIP712(DVoteConstants.EIP712_NAME, DVoteConstants.EIP712_VERSION) {
        if (
            admin == address(0) ||
            eci == address(0) ||
            sro == address(0) ||
            ro == address(0) ||
            observer == address(0) ||
            kycSigner == address(0) ||
            emergency == address(0)
        ) {
            revert DVoteErrors.ZeroAddress();
        }

        _grantRoleWithEvent(DEFAULT_ADMIN_ROLE, admin);
        _grantRoleWithEvent(ECI_ROLE, eci);
        _grantRoleWithEvent(SRO_ROLE, sro);
        _grantRoleWithEvent(RO_ROLE, ro);
        _grantRoleWithEvent(OBSERVER_ROLE, observer);
        _grantRoleWithEvent(KYC_SIGNER_ROLE, kycSigner);
        _grantRoleWithEvent(EMERGENCY_ROLE, emergency);

        activeKycSigner = kycSigner;
    }

    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.grantRole(role, account);
        emit DVoteEvents.RoleGrantedDetailed(role, account, msg.sender, uint64(block.timestamp));
    }

    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.revokeRole(role, account);
        emit DVoteEvents.RoleRevokedDetailed(role, account, msg.sender, uint64(block.timestamp));
    }

    function createElection(
        bytes32 constituencyId,
        bytes32 electionSalt,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 votingStart,
        uint64 votingEnd,
        uint256 parentElectionId
    ) external override onlyRole(ECI_ROLE) returns (uint256 electionId) {
        if (electionSalt == bytes32(0)) revert DVoteErrors.ElectionSaltIsZero();
        if (_globalElectionSaltUsed[electionSalt]) revert DVoteErrors.ElectionSaltAlreadyUsed(electionSalt);
        if (!(registrationStart < registrationEnd && votingStart < votingEnd && votingStart > registrationEnd)) {
            revert DVoteErrors.InvalidSchedule();
        }

        if (parentElectionId != 0) {
            _requireElection(parentElectionId);
        }

        electionId = nextElectionId;
        nextElectionId++;

        DVoteTypes.Election storage election = _elections[electionId];
        election.electionId = electionId;
        election.constituencyId = constituencyId;
        election.electionSalt = electionSalt;
        election.parentElectionId = parentElectionId;
        election.registrationStart = registrationStart;
        election.registrationEnd = registrationEnd;
        election.votingStart = votingStart;
        election.votingEnd = votingEnd;
        election.createdAt = uint64(block.timestamp);
        election.status = DVoteTypes.ElectionStatus.Draft;
        election.exists = true;

        electionSaltUsed[electionId][electionSalt] = true;
        _globalElectionSaltUsed[electionSalt] = true;

        emit DVoteEvents.ElectionCreated(electionId, constituencyId, msg.sender);
        emit DVoteEvents.ElectionSaltPublished(electionId, electionSalt);
    }

    function openRegistration(uint256 electionId) external override onlyRole(SRO_ROLE) {
        _transition(electionId, DVoteTypes.ElectionStatus.Draft, DVoteTypes.ElectionStatus.RegistrationOpen);
    }

    function openVoting(uint256 electionId) external override onlyRole(ECI_ROLE) {
        _transition(electionId, DVoteTypes.ElectionStatus.RegistrationOpen, DVoteTypes.ElectionStatus.VotingOpen);
    }

    function pauseVoting(uint256 electionId, DVoteTypes.PauseReason reason) external override onlyRole(EMERGENCY_ROLE) {
        _transition(electionId, DVoteTypes.ElectionStatus.VotingOpen, DVoteTypes.ElectionStatus.VotingPaused);
        emit DVoteEvents.ElectionPaused(electionId, msg.sender, reason);
    }

    function unpauseVoting(uint256 electionId) external override onlyRole(EMERGENCY_ROLE) {
        DVoteTypes.Election storage election = _requireElection(electionId);
        if (election.status != DVoteTypes.ElectionStatus.VotingPaused) {
            revert DVoteErrors.InvalidElectionStatus(
                electionId,
                uint8(election.status),
                uint8(DVoteTypes.ElectionStatus.VotingPaused)
            );
        }
        if (uint64(block.timestamp) >= election.votingEnd) {
            revert DVoteErrors.VoteWindowClosed(electionId, election.votingStart, election.votingEnd, uint64(block.timestamp));
        }

        _setStatus(electionId, election, DVoteTypes.ElectionStatus.VotingOpen);
        emit DVoteEvents.ElectionUnpaused(electionId, msg.sender);
    }

    function closeVoting(uint256 electionId) external override onlyRole(ECI_ROLE) {
        DVoteTypes.Election storage election = _requireElection(electionId);
        if (
            election.status != DVoteTypes.ElectionStatus.VotingOpen &&
            election.status != DVoteTypes.ElectionStatus.VotingPaused
        ) {
            revert DVoteErrors.InvalidElectionStatusTransition(
                electionId,
                uint8(election.status),
                uint8(DVoteTypes.ElectionStatus.VotingClosed)
            );
        }
        if (uint64(block.timestamp) < election.votingEnd) {
            revert DVoteErrors.VoteWindowClosed(electionId, election.votingStart, election.votingEnd, uint64(block.timestamp));
        }

        _setStatus(electionId, election, DVoteTypes.ElectionStatus.VotingClosed);
    }

    function finalizeElection(
        uint256 electionId,
        bytes32 tieSeed,
        bytes calldata tieSeedSignature
    ) external override onlyRole(ECI_ROLE) {
        DVoteTypes.Election storage election = _requireElection(electionId);
        if (election.status != DVoteTypes.ElectionStatus.VotingClosed) {
            revert DVoteErrors.InvalidElectionStatus(
                electionId,
                uint8(election.status),
                uint8(DVoteTypes.ElectionStatus.VotingClosed)
            );
        }

        uint8[16] memory tiedCandidates;
        uint8 tieCount;
        uint64 topVotes;

        if (_notaAdded[electionId]) {
            DVoteTypes.Candidate storage notaCandidate = _candidates[electionId][0];
            if (notaCandidate.active && notaCandidate.candidateId != bytes32(0)) {
                tiedCandidates[0] = 0;
                tieCount = 1;
                topVotes = notaCandidate.voteCount;
            }
        }

        for (uint8 index = 1; index <= election.candidateCount; index++) {
            DVoteTypes.Candidate storage candidate = _candidates[electionId][index];
            if (!candidate.active || candidate.candidateId == bytes32(0)) continue;

            if (tieCount == 0 || candidate.voteCount > topVotes) {
                topVotes = candidate.voteCount;
                tiedCandidates[0] = index;
                tieCount = 1;
            } else if (candidate.voteCount == topVotes) {
                tiedCandidates[tieCount] = index;
                tieCount++;
            }
        }

        if (tieCount == 0) revert DVoteErrors.NoActiveCandidates(electionId);

        bool tieLotUsed = tieCount > 1;
        uint8 winnerIndex = tiedCandidates[0];
        if (tieLotUsed) {
            _validateTieSeedSignature(electionId, tieSeed, tieSeedSignature);
            uint256 selected = uint256(keccak256(abi.encodePacked(tieSeed, electionId, tieCount))) % tieCount;
            winnerIndex = tiedCandidates[selected];
        }

        bool winnerIsNota = winnerIndex == 0;
        uint64 finalizedAt = uint64(block.timestamp);

        if (winnerIsNota && election.parentElectionId == 0 && election.rerunCount < DVoteConstants.MAX_RERUNS) {
            election.winnerIndex = winnerIndex;
            election.winnerIsNota = true;
            election.finalizedAt = finalizedAt;

            DVoteTypes.FinalizationOutcome rerunOutcome = tieLotUsed
                ? DVoteTypes.FinalizationOutcome.TieLotNotaTriggeredRerun
                : DVoteTypes.FinalizationOutcome.NotaTriggeredRerun;

            emit DVoteEvents.ElectionFinalized(electionId, winnerIndex, true, rerunOutcome, finalizedAt);
            _applyRerunRequired(electionId, election, finalizedAt);
            return;
        }

        if (winnerIsNota) {
            winnerIndex = _highestNonNotaCandidate(electionId, election);
            winnerIsNota = false;
            tieLotUsed = false;
        }

        election.winnerIndex = winnerIndex;
        election.winnerIsNota = winnerIsNota;
        election.finalizedAt = finalizedAt;

        _setStatus(electionId, election, DVoteTypes.ElectionStatus.Finalized);

        DVoteTypes.FinalizationOutcome outcome = tieLotUsed
            ? DVoteTypes.FinalizationOutcome.TieLotCandidateWon
            : DVoteTypes.FinalizationOutcome.CandidateWon;
        emit DVoteEvents.ElectionFinalized(electionId, winnerIndex, winnerIsNota, outcome, finalizedAt);
    }

    function createRerunElection(
        uint256 parentElectionId,
        bytes32 electionSalt,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 votingStart,
        uint64 votingEnd
    ) external override onlyRole(ECI_ROLE) returns (uint256 childElectionId) {
        DVoteTypes.Election storage parent = _requireElection(parentElectionId);
        if (parent.status != DVoteTypes.ElectionStatus.RerunRequired) {
            revert DVoteErrors.InvalidElectionStatus(
                parentElectionId,
                uint8(parent.status),
                uint8(DVoteTypes.ElectionStatus.RerunRequired)
            );
        }
        if (parent.rerunCount >= DVoteConstants.MAX_RERUNS) {
            revert DVoteErrors.RerunCapExceeded(parentElectionId, parent.rerunCount);
        }

        if (electionSalt == bytes32(0)) revert DVoteErrors.ElectionSaltIsZero();
        if (_globalElectionSaltUsed[electionSalt]) revert DVoteErrors.ElectionSaltAlreadyUsed(electionSalt);
        if (!(registrationStart < registrationEnd && votingStart < votingEnd && votingStart > registrationEnd)) {
            revert DVoteErrors.InvalidSchedule();
        }

        childElectionId = nextElectionId;
        nextElectionId++;

        DVoteTypes.Election storage child = _elections[childElectionId];
        child.electionId = childElectionId;
        child.constituencyId = parent.constituencyId;
        child.electionSalt = electionSalt;
        child.parentElectionId = parentElectionId;
        child.registrationStart = registrationStart;
        child.registrationEnd = registrationEnd;
        child.votingStart = votingStart;
        child.votingEnd = votingEnd;
        child.createdAt = uint64(block.timestamp);
        child.status = DVoteTypes.ElectionStatus.Draft;
        child.exists = true;
        child.rerunCount = parent.rerunCount + 1;

        electionSaltUsed[childElectionId][electionSalt] = true;
        _globalElectionSaltUsed[electionSalt] = true;

        emit DVoteEvents.ElectionCreated(childElectionId, parent.constituencyId, msg.sender);
        emit DVoteEvents.ElectionSaltPublished(childElectionId, electionSalt);

        for (uint8 index = 1; index <= parent.candidateCount; index++) {
            bytes32 parentCandidateId = _candidates[parentElectionId][index].candidateId;
            if (parentCandidateId != bytes32(0)) {
                disallowedCandidateInRerun[childElectionId][parentCandidateId] = true;
            }
        }

        parent.childElectionId = childElectionId;
        parent.rerunCount += 1;
        _setStatus(parentElectionId, parent, DVoteTypes.ElectionStatus.Superseded);

        emit DVoteEvents.RerunElectionCreated(parentElectionId, childElectionId);
    }

    function addCandidate(
        uint256 electionId,
        bytes32 candidateId,
        string calldata displayName,
        bytes32 nominationMetadataHash,
        bool isNota
    ) external override onlyRole(RO_ROLE) {
        DVoteTypes.Election storage election = _requireElection(electionId);

        if (
            election.status != DVoteTypes.ElectionStatus.Draft &&
            election.status != DVoteTypes.ElectionStatus.RegistrationOpen
        ) {
            revert DVoteErrors.InvalidElectionStatusTransition(
                electionId,
                uint8(election.status),
                uint8(DVoteTypes.ElectionStatus.RegistrationOpen)
            );
        }

        if (isNota && _notaAdded[electionId]) {
            revert DVoteErrors.CandidateAlreadyRegistered(electionId, DVoteConstants.NOTA_CANDIDATE_ID);
        }
        if (!isNota && election.candidateCount >= DVoteConstants.MAX_CONTESTING_CANDIDATES) {
            revert DVoteErrors.CandidateCapReached(electionId);
        }
        if (!isNota && candidateIdRegistered[electionId][candidateId]) {
            revert DVoteErrors.CandidateAlreadyRegistered(electionId, candidateId);
        }
        if (!isNota && disallowedCandidateInRerun[electionId][candidateId]) {
            revert DVoteErrors.CandidateDisallowedInRerun(electionId, candidateId);
        }

        uint8 candidateIndex;
        bytes32 canonicalCandidateId = candidateId;
        if (isNota) {
            candidateIndex = 0;
            canonicalCandidateId = DVoteConstants.NOTA_CANDIDATE_ID;
            _notaAdded[electionId] = true;
        } else {
            election.candidateCount++;
            candidateIndex = election.candidateCount;
            candidateIdRegistered[electionId][candidateId] = true;
        }

        _candidates[electionId][candidateIndex] = DVoteTypes.Candidate({
            candidateId: canonicalCandidateId,
            displayName: displayName,
            nominationMetadataHash: nominationMetadataHash,
            voteCount: 0,
            registeredAt: uint64(block.timestamp),
            isNota: isNota,
            active: true
        });

        emit DVoteEvents.CandidateAdded(electionId, candidateIndex, canonicalCandidateId, nominationMetadataHash);
    }

    function approveKycWithSig(DVoteTypes.KycApproval calldata approval, bytes calldata signature) external override {
        _requireElection(approval.electionId);

        if (block.timestamp > approval.expiry) {
            revert DVoteErrors.SignatureExpired(approval.expiry, block.timestamp);
        }

        uint256 expectedNonce = kycNonces[approval.subjectWallet];
        if (approval.nonce != expectedNonce) {
            revert DVoteErrors.InvalidNonce(expectedNonce, approval.nonce);
        }

        bytes32 structHash = DVoteHashing.kycStructHash(DVoteConstants.KYC_TYPEHASH, approval);
        bytes32 digest = _hashTypedDataV4(structHash);

        if (!hasRole(KYC_SIGNER_ROLE, activeKycSigner)) revert DVoteErrors.InvalidSignature();
        if (!SignatureChecker.isValidSignatureNow(activeKycSigner, digest, signature)) {
            revert DVoteErrors.InvalidSignature();
        }

        DVoteTypes.VoterState storage voter = _voterStates[approval.electionId][approval.subjectWallet];
        voter.isKycApproved = true;
        voter.kycValidUntil = uint64(approval.expiry);
        voter.identityCommitment = approval.commitment;

        kycNonces[approval.subjectWallet] = expectedNonce + 1;

        emit DVoteEvents.KycApproved(
            approval.electionId,
            approval.subjectWallet,
            approval.commitment,
            activeKycSigner,
            approval.isAadhaarOnly,
            approval.reasonCodeHash
        );
    }

    function castVote(uint256 electionId, uint8 candidateIndex, bytes32 commitment) external override {
        DVoteTypes.Election storage election = _requireElection(electionId);
        if (election.status != DVoteTypes.ElectionStatus.VotingOpen) {
            revert DVoteErrors.InvalidElectionStatus(
                electionId,
                uint8(election.status),
                uint8(DVoteTypes.ElectionStatus.VotingOpen)
            );
        }

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < election.votingStart || nowTs >= election.votingEnd) {
            revert DVoteErrors.VoteWindowClosed(electionId, election.votingStart, election.votingEnd, nowTs);
        }

        DVoteTypes.VoterState storage voter = _voterStates[electionId][msg.sender];
        if (!voter.isKycApproved) revert DVoteErrors.NotKycApproved(electionId, msg.sender);
        if (voter.kycValidUntil < nowTs) revert DVoteErrors.KycExpired(electionId, msg.sender, voter.kycValidUntil);
        if (voter.hasVoted) revert DVoteErrors.WalletAlreadyVoted(electionId, msg.sender);
        if (voter.identityCommitment != commitment) {
            revert DVoteErrors.CommitmentMismatch(electionId, msg.sender, voter.identityCommitment, commitment);
        }
        if (commitmentUsed[electionId][commitment]) revert DVoteErrors.CommitmentAlreadyUsed(electionId, commitment);

        DVoteTypes.Candidate storage candidate = _candidates[electionId][candidateIndex];
        if (candidate.candidateId == bytes32(0)) revert DVoteErrors.CandidateNotFound(electionId, candidateIndex);
        if (!candidate.active) revert DVoteErrors.CandidateInactive(electionId, candidateIndex);

        voter.hasVoted = true;
        voter.votedAt = nowTs;
        commitmentUsed[electionId][commitment] = true;
        candidate.voteCount++;
        election.totalVotesCast++;

        emit DVoteEvents.VoteCast(
            electionId,
            candidateIndex,
            msg.sender,
            commitment,
            candidate.voteCount,
            election.totalVotesCast
        );
    }

    function reportAnomaly(
        uint256 electionId,
        DVoteTypes.AnomalyCode anomalyCode,
        bytes32 evidenceHash
    ) external override onlyRole(OBSERVER_ROLE) {
        _requireElection(electionId);
        emit DVoteEvents.ObserverAnomalyReported(electionId, msg.sender, anomalyCode, evidenceHash);
    }

    function rotateKycSigner(address oldSigner, address newSigner) external override onlyRole(ECI_ROLE) {
        if (oldSigner == address(0) || newSigner == address(0)) revert DVoteErrors.ZeroAddress();
        if (!hasRole(KYC_SIGNER_ROLE, oldSigner)) revert DVoteErrors.InvalidSignature();

        _revokeRole(KYC_SIGNER_ROLE, oldSigner);
        emit DVoteEvents.RoleRevokedDetailed(KYC_SIGNER_ROLE, oldSigner, msg.sender, uint64(block.timestamp));

        _grantRole(KYC_SIGNER_ROLE, newSigner);
        emit DVoteEvents.RoleGrantedDetailed(KYC_SIGNER_ROLE, newSigner, msg.sender, uint64(block.timestamp));

        activeKycSigner = newSigner;
        emit DVoteEvents.KycSignerRotated(oldSigner, newSigner, msg.sender);
    }

    function getElection(uint256 electionId) external view override returns (DVoteTypes.Election memory election) {
        election = _requireElection(electionId);
    }

    function getCandidate(
        uint256 electionId,
        uint8 candidateIndex
    ) external view override returns (DVoteTypes.Candidate memory candidate) {
        _requireElection(electionId);
        candidate = _candidates[electionId][candidateIndex];
    }

    function getVoterState(
        uint256 electionId,
        address wallet
    ) external view override returns (DVoteTypes.VoterState memory voterState) {
        _requireElection(electionId);
        voterState = _voterStates[electionId][wallet];
    }

    function _validateTieSeedSignature(uint256 electionId, bytes32 tieSeed, bytes calldata signature) internal view {
        if (tieSeed == bytes32(0)) revert DVoteErrors.InvalidSignature();

        bytes32 digest;
        assembly ("memory-safe") {
            let ptr := mload(0x40)

            // Packed bytes layout: address(this) (20) || "TIE_LOT" (7) || electionId (32) || tieSeed (32)
            mstore(ptr, shl(96, address()))
            mstore(add(ptr, 20), 0x5449455f4c4f5400000000000000000000000000000000000000000000000000)
            mstore(add(ptr, 27), electionId)
            mstore(add(ptr, 59), tieSeed)

            digest := keccak256(ptr, 91)
            mstore(0x40, add(ptr, 96))
        }
        if (!SignatureChecker.isValidSignatureNow(msg.sender, digest, signature)) {
            revert DVoteErrors.InvalidSignature();
        }
    }

    function _applyRerunRequired(
        uint256 electionId,
        DVoteTypes.Election storage election,
        uint64 finalizedAt
    ) internal {
        _setStatus(electionId, election, DVoteTypes.ElectionStatus.Finalized);
        election.rerunDeadline = finalizedAt + DVoteConstants.RERUN_CREATION_SLA;
        _setStatus(electionId, election, DVoteTypes.ElectionStatus.RerunRequired);

        emit DVoteEvents.ElectionRerunRequired(electionId, election.rerunDeadline);
    }

    function _highestNonNotaCandidate(
        uint256 electionId,
        DVoteTypes.Election storage election
    ) internal view returns (uint8 winnerIndex) {
        bool found;
        uint64 topVotes;

        for (uint8 index = 1; index <= election.candidateCount; index++) {
            DVoteTypes.Candidate storage candidate = _candidates[electionId][index];
            if (!candidate.active || candidate.candidateId == bytes32(0)) continue;

            if (!found || candidate.voteCount > topVotes) {
                found = true;
                topVotes = candidate.voteCount;
                winnerIndex = index;
            }
        }

        if (!found) revert DVoteErrors.NoActiveCandidates(electionId);
    }

    function _requireElection(uint256 electionId) internal view returns (DVoteTypes.Election storage election) {
        election = _elections[electionId];
        if (!election.exists) revert DVoteErrors.ElectionNotFound(electionId);
    }

    function _transition(
        uint256 electionId,
        DVoteTypes.ElectionStatus expectedStatus,
        DVoteTypes.ElectionStatus nextStatus
    ) internal {
        DVoteTypes.Election storage election = _requireElection(electionId);
        if (election.status != expectedStatus) {
            revert DVoteErrors.InvalidElectionStatus(electionId, uint8(election.status), uint8(expectedStatus));
        }

        _setStatus(electionId, election, nextStatus);
    }

    function _setStatus(
        uint256 electionId,
        DVoteTypes.Election storage election,
        DVoteTypes.ElectionStatus nextStatus
    ) internal {
        DVoteTypes.ElectionStatus prev = election.status;
        election.status = nextStatus;
        emit DVoteEvents.ElectionStatusChanged(electionId, prev, nextStatus, msg.sender);
    }

    function _grantRoleWithEvent(bytes32 role, address account) internal {
        _grantRole(role, account);
        emit DVoteEvents.RoleGrantedDetailed(role, account, msg.sender, uint64(block.timestamp));
    }
}
