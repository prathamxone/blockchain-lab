// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library DVoteTypes {
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

    struct Election {
        uint256 electionId;
        bytes32 constituencyId;
        bytes32 electionSalt;
        uint256 parentElectionId;
        uint256 childElectionId;
        uint64 registrationStart;
        uint64 registrationEnd;
        uint64 votingStart;
        uint64 votingEnd;
        uint64 rerunDeadline;
        uint64 createdAt;
        ElectionStatus status;
        uint8 candidateCount;
        uint8 rerunCount;
        uint8 winnerIndex;
        bool winnerIsNota;
        uint64 totalVotesCast;
        uint64 finalizedAt;
        bool exists;
    }

    struct Candidate {
        bytes32 candidateId;
        string displayName;
        bytes32 nominationMetadataHash;
        uint64 voteCount;
        uint64 registeredAt;
        bool isNota;
        bool active;
    }

    struct VoterState {
        bool isKycApproved;
        bool hasVoted;
        uint64 votedAt;
        uint64 kycValidUntil;
        bytes32 identityCommitment;
    }

    struct KycApproval {
        address subjectWallet;
        bytes32 commitment;
        uint256 electionId;
        uint256 nonce;
        uint256 expiry;
        bool isAadhaarOnly;
        bytes32 reasonCodeHash;
    }
}
