// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerLifecycleTest is DVoteTestBase {
    function test_CreateElectionRejectsInvalidSchedule() external {
        uint64 nowTs = uint64(block.timestamp);

        vm.expectRevert(DVoteErrors.InvalidSchedule.selector);
        vm.prank(eci);
        manager.createElection(
            DEFAULT_CONSTITUENCY_ID,
            keccak256("salt::invalid"),
            nowTs + 50,
            nowTs + 10,
            nowTs + 100,
            nowTs + 200,
            0
        );
    }

    function test_TransitionDraftToRegistrationOpen() external {
        uint256 electionId = _createDraftElection();

        _openRegistration(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        assertEq(uint8(election.status), uint8(DVoteTypes.ElectionStatus.RegistrationOpen));
    }

    function test_OpenVotingRequiresRegistrationOpen() external {
        uint256 electionId = _createDraftElection();

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.InvalidElectionStatus.selector,
                electionId,
                uint8(DVoteTypes.ElectionStatus.Draft),
                uint8(DVoteTypes.ElectionStatus.RegistrationOpen)
            )
        );
        vm.prank(eci);
        manager.openVoting(electionId);
    }

    function test_PauseAndUnpauseDoNotMutateVotingEnd() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        DVoteTypes.Election memory beforePause = manager.getElection(electionId);

        vm.prank(emergency);
        manager.pauseVoting(electionId, DVoteTypes.PauseReason.SecurityAnomaly);

        vm.warp(beforePause.votingEnd - 1);
        vm.prank(emergency);
        manager.unpauseVoting(electionId);

        DVoteTypes.Election memory afterUnpause = manager.getElection(electionId);
        assertEq(afterUnpause.votingEnd, beforePause.votingEnd);
        assertEq(uint8(afterUnpause.status), uint8(DVoteTypes.ElectionStatus.VotingOpen));
    }

    function test_UnpauseAtOrAfterVotingEndReverts() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        vm.prank(emergency);
        manager.pauseVoting(electionId, DVoteTypes.PauseReason.TechnicalMaintenance);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingEnd);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.VoteWindowClosed.selector,
                electionId,
                election.votingStart,
                election.votingEnd,
                election.votingEnd
            )
        );
        vm.prank(emergency);
        manager.unpauseVoting(electionId);
    }

    function test_CloseVotingBeforeEndReverts() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingEnd - 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.VoteWindowClosed.selector,
                electionId,
                election.votingStart,
                election.votingEnd,
                election.votingEnd - 1
            )
        );
        vm.prank(eci);
        manager.closeVoting(electionId);
    }

    function test_CloseVotingAtEndSucceeds() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingEnd);

        vm.prank(eci);
        manager.closeVoting(electionId);

        DVoteTypes.Election memory closed = manager.getElection(electionId);
        assertEq(uint8(closed.status), uint8(DVoteTypes.ElectionStatus.VotingClosed));
    }

    function test_AddCandidateAfterVotingOpenReverts() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.InvalidElectionStatusTransition.selector,
                electionId,
                uint8(DVoteTypes.ElectionStatus.VotingOpen),
                uint8(DVoteTypes.ElectionStatus.RegistrationOpen)
            )
        );
        vm.prank(ro);
        manager.addCandidate(
            electionId,
            keccak256("candidate::1"),
            "Candidate One",
            keccak256("nomination::1"),
            false
        );
    }

    function test_CastVoteAtVotingEndRevertsStrictNoGrace() external {
        uint256 electionId = _createDraftElection();
        _openRegistration(electionId);
        _openVoting(electionId);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingEnd);

        vm.expectRevert(
            abi.encodeWithSelector(
                DVoteErrors.VoteWindowClosed.selector,
                electionId,
                election.votingStart,
                election.votingEnd,
                election.votingEnd
            )
        );
        manager.castVote(electionId, 1, keccak256("commitment::at-end"));
    }
}
