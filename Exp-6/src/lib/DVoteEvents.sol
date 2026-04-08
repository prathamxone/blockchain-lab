// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteTypes} from "./DVoteTypes.sol";

library DVoteEvents {
    event RoleGrantedDetailed(bytes32 indexed role, address indexed account, address indexed sender, uint64 timestamp);
    event RoleRevokedDetailed(bytes32 indexed role, address indexed account, address indexed sender, uint64 timestamp);

    event ElectionCreated(uint256 indexed electionId, bytes32 indexed constituencyId, address indexed sender);
    event ElectionSaltPublished(uint256 indexed electionId, bytes32 electionSalt);
    event ElectionStatusChanged(
        uint256 indexed electionId,
        DVoteTypes.ElectionStatus previousStatus,
        DVoteTypes.ElectionStatus nextStatus,
        address indexed sender
    );

    event CandidateAdded(
        uint256 indexed electionId,
        uint8 indexed candidateIndex,
        bytes32 indexed candidateId,
        bytes32 nominationMetadataHash
    );

    event KycApproved(
        uint256 indexed electionId,
        address indexed wallet,
        bytes32 indexed commitment,
        address signer,
        bool isAadhaarOnly,
        bytes32 reasonCodeHash
    );

    event VoteCast(
        uint256 indexed electionId,
        uint8 indexed candidateIndex,
        address indexed wallet,
        bytes32 commitment,
        uint64 candidateVoteCountSnapshot,
        uint64 totalVotesCastSnapshot
    );

    event ElectionPaused(uint256 indexed electionId, address indexed sender, DVoteTypes.PauseReason pauseReason);
    event ElectionUnpaused(uint256 indexed electionId, address indexed sender);

    event ObserverAnomalyReported(
        uint256 indexed electionId,
        address indexed reporter,
        DVoteTypes.AnomalyCode anomalyCode,
        bytes32 evidenceHash
    );

    event ElectionFinalized(
        uint256 indexed electionId,
        uint8 winnerIndex,
        bool winnerIsNota,
        DVoteTypes.FinalizationOutcome finalizationOutcome,
        uint64 finalizedAt
    );

    event ElectionRerunRequired(uint256 indexed electionId, uint64 rerunDeadline);
    event RerunElectionCreated(uint256 indexed parentElectionId, uint256 indexed childElectionId);
    event KycSignerRotated(address indexed oldSigner, address indexed newSigner, address indexed rotatedBy);
}
