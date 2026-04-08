// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerVoteFuzzTest is DVoteTestBase {
    function testFuzz_InvalidCandidateIndexReverts(uint8 invalidIndex) external {
        invalidIndex = uint8(bound(invalidIndex, 2, 250));

        uint256 electionId = _createDraftElection();
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

        address voter = makeAddr("voter");
        bytes32 commitment = keccak256("fuzz::vote-candidate");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            commitment,
            0,
            block.timestamp + 1 days,
            false,
            keccak256("reason::approve")
        );
        bytes memory signature = _signKycApproval(approval, kycSignerPk);
        manager.approveKycWithSig(approval, signature);

        DVoteTypes.Election memory election = manager.getElection(electionId);
        vm.warp(election.votingStart);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.CandidateNotFound.selector, electionId, invalidIndex));
        vm.prank(voter);
        manager.castVote(electionId, invalidIndex, commitment);
    }
}
