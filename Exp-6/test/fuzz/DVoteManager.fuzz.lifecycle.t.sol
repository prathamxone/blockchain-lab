// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerLifecycleFuzzTest is DVoteTestBase {
    function testFuzz_CreateElectionWithValidSchedule(
        uint64 regGap,
        uint64 votingGap,
        uint64 votingWindow
    ) external {
        regGap = uint64(bound(regGap, 1, 100));
        votingGap = uint64(bound(votingGap, 1, 100));
        votingWindow = uint64(bound(votingWindow, 1, 100));

        uint64 nowTs = uint64(block.timestamp);
        uint64 registrationStart = nowTs + 10;
        uint64 registrationEnd = registrationStart + regGap;
        uint64 votingStart = registrationEnd + votingGap;
        uint64 votingEnd = votingStart + votingWindow;

        vm.prank(eci);
        uint256 electionId = manager.createElection(
            DEFAULT_CONSTITUENCY_ID,
            keccak256(abi.encodePacked("fuzz::schedule", regGap, votingGap, votingWindow)),
            registrationStart,
            registrationEnd,
            votingStart,
            votingEnd,
            0
        );

        DVoteTypes.Election memory election = manager.getElection(electionId);
        assertEq(uint8(election.status), uint8(DVoteTypes.ElectionStatus.Draft));
        assertEq(election.registrationStart, registrationStart);
        assertEq(election.votingEnd, votingEnd);
    }

    function testFuzz_CreateElectionRejectsBrokenSchedule(uint64 tsA, uint64 tsB) external {
        tsA = uint64(bound(tsA, 1, 100));
        tsB = uint64(bound(tsB, 1, 100));

        uint64 nowTs = uint64(block.timestamp);
        uint64 registrationStart = nowTs + 10;
        uint64 registrationEnd = registrationStart + tsA;
        uint64 votingStart = registrationEnd;
        uint64 votingEnd = votingStart + tsB;

        vm.expectRevert(DVoteErrors.InvalidSchedule.selector);
        vm.prank(eci);
        manager.createElection(
            DEFAULT_CONSTITUENCY_ID,
            keccak256(abi.encodePacked("fuzz::bad-schedule", tsA, tsB)),
            registrationStart,
            registrationEnd,
            votingStart,
            votingEnd,
            0
        );
    }
}
