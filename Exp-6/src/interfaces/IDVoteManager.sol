// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteTypes} from "../lib/DVoteTypes.sol";

interface IDVoteManager {
    function createElection(
        bytes32 constituencyId,
        bytes32 electionSalt,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 votingStart,
        uint64 votingEnd,
        uint256 parentElectionId
    ) external returns (uint256 electionId);

    function openRegistration(uint256 electionId) external;

    function openVoting(uint256 electionId) external;

    function pauseVoting(uint256 electionId, DVoteTypes.PauseReason reason) external;

    function unpauseVoting(uint256 electionId) external;

    function closeVoting(uint256 electionId) external;

    function finalizeElection(uint256 electionId, bytes32 tieSeed, bytes calldata tieSeedSignature) external;

    function createRerunElection(
        uint256 parentElectionId,
        bytes32 electionSalt,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 votingStart,
        uint64 votingEnd
    ) external returns (uint256 childElectionId);

    function addCandidate(
        uint256 electionId,
        bytes32 candidateId,
        string calldata displayName,
        bytes32 nominationMetadataHash,
        bool isNota
    ) external;

    function approveKycWithSig(DVoteTypes.KycApproval calldata approval, bytes calldata signature) external;

    function castVote(uint256 electionId, uint8 candidateIndex, bytes32 commitment) external;

    function reportAnomaly(uint256 electionId, DVoteTypes.AnomalyCode anomalyCode, bytes32 evidenceHash) external;

    function rotateKycSigner(address oldSigner, address newSigner) external;

    function getElection(uint256 electionId) external view returns (DVoteTypes.Election memory election);

    function getCandidate(uint256 electionId, uint8 candidateIndex) external view returns (DVoteTypes.Candidate memory candidate);

    function getVoterState(uint256 electionId, address wallet) external view returns (DVoteTypes.VoterState memory voterState);
}
