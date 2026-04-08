// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library DVoteErrors {
    error ZeroAddress();
    error ElectionNotFound(uint256 electionId);
    error ElectionAlreadyExists(uint256 electionId);
    error InvalidSchedule();
    error InvalidElectionStatus(uint256 electionId, uint8 currentStatus, uint8 expectedStatus);
    error InvalidElectionStatusTransition(uint256 electionId, uint8 currentStatus, uint8 nextStatus);
    error ElectionSaltAlreadyUsed(bytes32 electionSalt);
    error ElectionSaltIsZero();

    error CandidateCapReached(uint256 electionId);
    error CandidateAlreadyRegistered(uint256 electionId, bytes32 candidateId);
    error CandidateDisallowedInRerun(uint256 electionId, bytes32 candidateId);
    error CandidateNotFound(uint256 electionId, uint8 candidateIndex);
    error CandidateInactive(uint256 electionId, uint8 candidateIndex);
    error NoActiveCandidates(uint256 electionId);

    error InvalidSignature();
    error SignatureExpired(uint256 expiry, uint256 currentTimestamp);
    error InvalidNonce(uint256 expectedNonce, uint256 providedNonce);
    error NotKycApproved(uint256 electionId, address wallet);
    error KycExpired(uint256 electionId, address wallet, uint64 validUntil);

    error VoteWindowClosed(uint256 electionId, uint64 votingStart, uint64 votingEnd, uint64 currentTimestamp);
    error WalletAlreadyVoted(uint256 electionId, address wallet);
    error CommitmentAlreadyUsed(uint256 electionId, bytes32 commitment);
    error CommitmentMismatch(uint256 electionId, address wallet, bytes32 approvedCommitment, bytes32 providedCommitment);

    error RerunCapExceeded(uint256 electionId, uint8 currentRerunCount);

    error NotImplemented();
}
