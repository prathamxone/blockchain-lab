// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerInvariantTest is DVoteTestBase {
    uint256 internal electionId;
    bytes32 internal commitmentOne;
    bytes32 internal commitmentTwo;

    function setUp() public override {
        super.setUp();

        electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.prank(ro);
        manager.addCandidate(
            electionId,
            keccak256("candidate::one"),
            "Candidate One",
            keccak256("nomination::one"),
            false
        );

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        commitmentOne = keccak256("invariant::c1");
        commitmentTwo = keccak256("invariant::c2");

        _approveAndCast(makeAddr("invVoter1"), commitmentOne);
        _approveAndCast(makeAddr("invVoter2"), commitmentTwo);
    }

    function invariant_TotalVotesEqualsCandidateVoteSum() external view {
        DVoteTypes.Candidate memory candidateOne = manager.getCandidate(electionId, 1);
        DVoteTypes.Election memory election = manager.getElection(electionId);

        assertEq(uint256(candidateOne.voteCount), uint256(election.totalVotesCast));
    }

    function invariant_UsedCommitmentsNeverReset() external view {
        assertTrue(manager.commitmentUsed(electionId, commitmentOne));
        assertTrue(manager.commitmentUsed(electionId, commitmentTwo));
    }

    function _approveAndCast(address voter, bytes32 commitment) internal {
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

        vm.prank(voter);
        manager.castVote(electionId, 1, commitment);
    }
}
