// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerFinalizeTest is DVoteTestBase {
    function test_FinalizeCandidateWinnerSetsFinalized() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.startPrank(ro);
        manager.addCandidate(electionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a"), false);
        manager.addCandidate(electionId, keccak256("cand::b"), "Candidate B", keccak256("meta::b"), false);
        vm.stopPrank();

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        _approveAndCast(electionId, makeAddr("v1"), 1, keccak256("commit::1"));
        _approveAndCast(electionId, makeAddr("v2"), 1, keccak256("commit::2"));
        _approveAndCast(electionId, makeAddr("v3"), 2, keccak256("commit::3"));

        vm.warp(election.votingEnd);
        vm.prank(eci);
        manager.closeVoting(electionId);

        vm.prank(eci);
        manager.finalizeElection(electionId, bytes32(0), "");

        DVoteTypes.Election memory finalized = manager.getElection(electionId);
        assertEq(uint8(finalized.status), uint8(DVoteTypes.ElectionStatus.Finalized));
        assertEq(finalized.winnerIndex, 1);
        assertTrue(!finalized.winnerIsNota);
    }

    function test_FinalizeNotaTopInBaseElectionTriggersRerunRequired() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.startPrank(ro);
        manager.addCandidate(electionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a"), false);
        manager.addCandidate(electionId, bytes32(0), "NOTA", keccak256("meta::nota"), true);
        vm.stopPrank();

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        _approveAndCast(electionId, makeAddr("v1"), 0, keccak256("nota::1"));
        _approveAndCast(electionId, makeAddr("v2"), 0, keccak256("nota::2"));
        _approveAndCast(electionId, makeAddr("v3"), 1, keccak256("cand::1"));

        vm.warp(election.votingEnd);
        vm.prank(eci);
        manager.closeVoting(electionId);

        vm.prank(eci);
        manager.finalizeElection(electionId, bytes32(0), "");

        DVoteTypes.Election memory finalized = manager.getElection(electionId);
        assertEq(uint8(finalized.status), uint8(DVoteTypes.ElectionStatus.RerunRequired));
        assertTrue(finalized.winnerIsNota);
        assertEq(finalized.winnerIndex, 0);
        assertTrue(finalized.rerunDeadline > finalized.finalizedAt);
    }

    function test_CreateRerunSupersedesParentAndDisallowsParentCandidates() external {
        uint256 parentElectionId = _createBaseElectionThatRequiresRerun();

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(eci);
        uint256 childElectionId = manager.createRerunElection(
            parentElectionId,
            keccak256("salt::rerun"),
            nowTs + 10,
            nowTs + 20,
            nowTs + 30,
            nowTs + 40
        );

        DVoteTypes.Election memory parent = manager.getElection(parentElectionId);
        DVoteTypes.Election memory child = manager.getElection(childElectionId);

        assertEq(uint8(parent.status), uint8(DVoteTypes.ElectionStatus.Superseded));
        assertEq(parent.childElectionId, childElectionId);
        assertEq(child.parentElectionId, parentElectionId);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.CandidateDisallowedInRerun.selector,
                childElectionId,
                keccak256("cand::a")
            )
        );
        vm.prank(ro);
        manager.addCandidate(childElectionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a2"), false);
    }

    function test_TieLotRequiresEciSeedSignatureAndSelectsDeterministicWinner() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.startPrank(ro);
        manager.addCandidate(electionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a"), false);
        manager.addCandidate(electionId, keccak256("cand::b"), "Candidate B", keccak256("meta::b"), false);
        vm.stopPrank();

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        _approveAndCast(electionId, makeAddr("v1"), 1, keccak256("tie::1"));
        _approveAndCast(electionId, makeAddr("v2"), 2, keccak256("tie::2"));

        vm.warp(election.votingEnd);
        vm.prank(eci);
        manager.closeVoting(electionId);

        bytes32 tieSeed = keccak256("seed::tie");
        bytes memory signature = _signTieSeed(electionId, tieSeed, eciPk);

        vm.prank(eci);
        manager.finalizeElection(electionId, tieSeed, signature);

        uint8 expected = uint8(1 + (uint256(keccak256(abi.encodePacked(tieSeed, electionId, uint8(2)))) % 2));
        DVoteTypes.Election memory finalized = manager.getElection(electionId);
        assertEq(uint8(finalized.status), uint8(DVoteTypes.ElectionStatus.Finalized));
        assertEq(finalized.winnerIndex, expected);
        assertTrue(!finalized.winnerIsNota);
    }

    function test_TieLotInvalidSignatureReverts() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.startPrank(ro);
        manager.addCandidate(electionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a"), false);
        manager.addCandidate(electionId, keccak256("cand::b"), "Candidate B", keccak256("meta::b"), false);
        vm.stopPrank();

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        _approveAndCast(electionId, makeAddr("v1"), 1, keccak256("tie::1"));
        _approveAndCast(electionId, makeAddr("v2"), 2, keccak256("tie::2"));

        vm.warp(election.votingEnd);
        vm.prank(eci);
        manager.closeVoting(electionId);

        (, uint256 wrongPk) = makeAddrAndKey("wrongSigner");
        bytes32 tieSeed = keccak256("seed::bad-signature");
        bytes memory badSignature = _signTieSeed(electionId, tieSeed, wrongPk);

        vm.expectRevert(DVoteErrors.InvalidSignature.selector);
        vm.prank(eci);
        manager.finalizeElection(electionId, tieSeed, badSignature);
    }

    function test_RerunNotaTopFallsBackToHighestNonNotaCandidate() external {
        uint256 parentElectionId = _createBaseElectionThatRequiresRerun();

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(eci);
        uint256 childElectionId = manager.createRerunElection(
            parentElectionId,
            keccak256("salt::child"),
            nowTs + 10,
            nowTs + 20,
            nowTs + 30,
            nowTs + 40
        );

        vm.startPrank(ro);
        manager.addCandidate(childElectionId, keccak256("cand::new"), "Candidate New", keccak256("meta::new"), false);
        manager.addCandidate(childElectionId, bytes32(0), "NOTA", keccak256("meta::nota-child"), true);
        vm.stopPrank();

        _openRegistration(childElectionId);
        _openVoting(childElectionId);

        DVoteTypes.Election memory child = manager.getElection(childElectionId);
        vm.warp(child.votingStart);

        _approveAndCast(childElectionId, makeAddr("v1"), 0, keccak256("child::nota1"));
        _approveAndCast(childElectionId, makeAddr("v2"), 0, keccak256("child::nota2"));
        _approveAndCast(childElectionId, makeAddr("v3"), 1, keccak256("child::cand1"));

        vm.warp(child.votingEnd);
        vm.prank(eci);
        manager.closeVoting(childElectionId);

        vm.prank(eci);
        manager.finalizeElection(childElectionId, bytes32(0), "");

        DVoteTypes.Election memory finalized = manager.getElection(childElectionId);
        assertEq(uint8(finalized.status), uint8(DVoteTypes.ElectionStatus.Finalized));
        assertEq(finalized.winnerIndex, 1);
        assertTrue(!finalized.winnerIsNota);
    }

    function _createBaseElectionThatRequiresRerun() internal returns (uint256 electionId) {
        electionId = _createDraftElection();
        _openRegistration(electionId);

        vm.startPrank(ro);
        manager.addCandidate(electionId, keccak256("cand::a"), "Candidate A", keccak256("meta::a"), false);
        manager.addCandidate(electionId, bytes32(0), "NOTA", keccak256("meta::nota"), true);
        vm.stopPrank();

        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        _approveAndCast(electionId, makeAddr("v1"), 0, keccak256("nota::1"));
        _approveAndCast(electionId, makeAddr("v2"), 0, keccak256("nota::2"));
        _approveAndCast(electionId, makeAddr("v3"), 1, keccak256("cand::1"));

        vm.warp(election.votingEnd);
        vm.prank(eci);
        manager.closeVoting(electionId);

        vm.prank(eci);
        manager.finalizeElection(electionId, bytes32(0), "");
    }

    function _approveAndCast(uint256 electionId, address voter, uint8 candidateIndex, bytes32 commitment) internal {
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
        manager.castVote(electionId, candidateIndex, commitment);
    }
}
