// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerKycFuzzTest is DVoteTestBase {
    function testFuzz_NonceMismatchReverts(uint256 badNonce) external {
        badNonce = bound(badNonce, 1, type(uint128).max);

        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("fuzz::nonce"),
            badNonce,
            block.timestamp + 1 days,
            false,
            keccak256("reason::nonce")
        );

        bytes memory signature = _signKycApproval(approval, kycSignerPk);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.InvalidNonce.selector, 0, badNonce));
        manager.approveKycWithSig(approval, signature);
    }

    function testFuzz_ExpiredApprovalReverts(uint64 agoSeconds) external {
        agoSeconds = uint64(bound(agoSeconds, 1, 30 days));

        vm.warp(uint256(agoSeconds) + 1000);

        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");
        uint256 expiry = block.timestamp - agoSeconds;

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("fuzz::expired"),
            0,
            expiry,
            false,
            keccak256("reason::expired")
        );

        bytes memory signature = _signKycApproval(approval, kycSignerPk);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.SignatureExpired.selector, expiry, block.timestamp));
        manager.approveKycWithSig(approval, signature);
    }
}
