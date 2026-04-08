// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerVoteTest is DVoteTestBase {
    function test_CastVoteHappyPathUpdatesStateAndTallies() external {
        (uint256 electionId, uint8 candidateIndex) = _setupElectionWithCandidate();
        DVoteTypes.Election memory electionBefore = manager.getElection(electionId);

        address voter = makeAddr("voter");
        bytes32 commitment = keccak256("commitment::happy-path");
        _approveVoterKyc(electionId, voter, commitment);

        vm.warp(electionBefore.votingStart);

        vm.prank(voter);
        manager.castVote(electionId, candidateIndex, commitment);

        DVoteTypes.VoterState memory voterState = manager.getVoterState(electionId, voter);
        DVoteTypes.Candidate memory candidate = manager.getCandidate(electionId, candidateIndex);
        DVoteTypes.Election memory electionAfter = manager.getElection(electionId);

        assertTrue(voterState.hasVoted);
        assertEq(voterState.votedAt, electionBefore.votingStart);
        assertEq(candidate.voteCount, 1);
        assertEq(electionAfter.totalVotesCast, 1);
        assertTrue(manager.commitmentUsed(electionId, commitment));
    }

    function test_CannotVoteTwiceFromSameWallet() external {
        (uint256 electionId, uint8 candidateIndex) = _setupElectionWithCandidate();
        DVoteTypes.Election memory election = manager.getElection(electionId);

        address voter = makeAddr("voter");
        bytes32 commitment = keccak256("commitment::double-vote");
        _approveVoterKyc(electionId, voter, commitment);

        vm.warp(election.votingStart);

        vm.prank(voter);
        manager.castVote(electionId, candidateIndex, commitment);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.WalletAlreadyVoted.selector, electionId, voter));
        vm.prank(voter);
        manager.castVote(electionId, candidateIndex, keccak256("commitment::second"));
    }

    function test_CannotReuseCommitmentAcrossWalletsInSameElection() external {
        (uint256 electionId, uint8 candidateIndex) = _setupElectionWithCandidate();
        DVoteTypes.Election memory election = manager.getElection(electionId);

        address voterOne = makeAddr("voterOne");
        address voterTwo = makeAddr("voterTwo");
        bytes32 sharedCommitment = keccak256("commitment::shared");

        _approveVoterKyc(electionId, voterOne, sharedCommitment);
        _approveVoterKyc(electionId, voterTwo, sharedCommitment);

        vm.warp(election.votingStart);

        vm.prank(voterOne);
        manager.castVote(electionId, candidateIndex, sharedCommitment);

        vm.expectRevert(
            abi.encodeWithSelector(DVoteErrors.CommitmentAlreadyUsed.selector, electionId, sharedCommitment)
        );
        vm.prank(voterTwo);
        manager.castVote(electionId, candidateIndex, sharedCommitment);
    }

    function test_CastVoteRejectsCommitmentMismatchAgainstKycApproval() external {
        (uint256 electionId, uint8 candidateIndex) = _setupElectionWithCandidate();
        DVoteTypes.Election memory election = manager.getElection(electionId);

        address voter = makeAddr("voter");
        bytes32 approvedCommitment = keccak256("commitment::approved");
        bytes32 providedCommitment = keccak256("commitment::provided");

        _approveVoterKyc(electionId, voter, approvedCommitment);

        vm.warp(election.votingStart);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.CommitmentMismatch.selector,
                electionId,
                voter,
                approvedCommitment,
                providedCommitment
            )
        );
        vm.prank(voter);
        manager.castVote(electionId, candidateIndex, providedCommitment);
    }

    function test_CastVoteRequiresKycApproval() external {
        (uint256 electionId, uint8 candidateIndex) = _setupElectionWithCandidate();
        DVoteTypes.Election memory election = manager.getElection(electionId);

        address voter = makeAddr("voter");

        vm.warp(election.votingStart);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.NotKycApproved.selector, electionId, voter));
        vm.prank(voter);
        manager.castVote(electionId, candidateIndex, keccak256("commitment::no-kyc"));
    }

    function test_CastVoteRejectsUnknownCandidateIndex() external {
        (uint256 electionId, ) = _setupElectionWithCandidate();
        DVoteTypes.Election memory election = manager.getElection(electionId);

        address voter = makeAddr("voter");
        bytes32 commitment = keccak256("commitment::bad-candidate");
        _approveVoterKyc(electionId, voter, commitment);

        vm.warp(election.votingStart);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.CandidateNotFound.selector, electionId, 9));
        vm.prank(voter);
        manager.castVote(electionId, 9, commitment);
    }

    function _setupElectionWithCandidate() internal returns (uint256 electionId, uint8 candidateIndex) {
        electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.prank(ro);
        manager.addCandidate(
            electionId,
            keccak256("candidate::one"),
            "Candidate One",
            keccak256("nomination::candidate-one"),
            false
        );

        _openVoting(electionId);

        candidateIndex = 1;
    }

    function _approveVoterKyc(uint256 electionId, address voter, bytes32 commitment) internal {
        uint256 nonce = manager.kycNonces(voter);
        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            commitment,
            nonce,
            block.timestamp + 1 days,
            false,
            keccak256("reason::approve")
        );
        bytes memory signature = _signKycApproval(approval, kycSignerPk);

        manager.approveKycWithSig(approval, signature);
    }
}
