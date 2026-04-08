// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteConstants} from "../../src/constants/DVoteConstants.sol";
import {DVoteErrors} from "../../src/lib/DVoteErrors.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerKycTest is DVoteTestBase {
    function test_ApproveKycWithValidSignatureSucceeds() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::voter"),
            0,
            block.timestamp + 1 days,
            false,
            keccak256("reason::standard")
        );

        bytes memory signature = _signKycApproval(approval, kycSignerPk);

        vm.prank(voter);
        manager.approveKycWithSig(approval, signature);

        DVoteTypes.VoterState memory voterState = manager.getVoterState(electionId, voter);
        assertTrue(voterState.isKycApproved);
        assertEq(voterState.identityCommitment, approval.commitment);
        assertEq(voterState.kycValidUntil, uint64(approval.expiry));
        assertEq(manager.kycNonces(voter), 1);
    }

    function test_ReplayWithSameNonceReverts() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::replay"),
            0,
            block.timestamp + 1 days,
            true,
            keccak256("reason::aadhaar-only")
        );

        bytes memory signature = _signKycApproval(approval, kycSignerPk);
        manager.approveKycWithSig(approval, signature);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.InvalidNonce.selector, 1, 0));
        manager.approveKycWithSig(approval, signature);
    }

    function test_ExpiredSignatureReverts() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::expired"),
            0,
            block.timestamp - 1,
            false,
            keccak256("reason::expired")
        );

        bytes memory signature = _signKycApproval(approval, kycSignerPk);

        vm.expectRevert(abi.encodeWithSelector(DVoteErrors.SignatureExpired.selector, approval.expiry, block.timestamp));
        manager.approveKycWithSig(approval, signature);
    }

    function test_InvalidSignerReverts() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");
        (, uint256 wrongSignerPk) = makeAddrAndKey("wrongSigner");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::bad-signer"),
            0,
            block.timestamp + 1 days,
            false,
            keccak256("reason::bad-signer")
        );

        bytes memory signature = _signKycApproval(approval, wrongSignerPk);

        vm.expectRevert(DVoteErrors.InvalidSignature.selector);
        manager.approveKycWithSig(approval, signature);
    }

    function test_ChainIdMismatchReverts() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::chainid-mismatch"),
            0,
            block.timestamp + 1 days,
            false,
            keccak256("reason::chainid")
        );

        bytes32 structHash = keccak256(
            abi.encode(
                DVoteConstants.KYC_TYPEHASH,
                approval.subjectWallet,
                approval.commitment,
                approval.electionId,
                approval.nonce,
                approval.expiry,
                approval.isAadhaarOnly,
                approval.reasonCodeHash
            )
        );

        bytes32 wrongDomainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(DVoteConstants.EIP712_NAME)),
                keccak256(bytes(DVoteConstants.EIP712_VERSION)),
                block.chainid + 1,
                address(manager)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", wrongDomainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(kycSignerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(DVoteErrors.InvalidSignature.selector);
        manager.approveKycWithSig(approval, signature);
    }

    function test_RotatingSignerInvalidatesOldSignerSignature() external {
        uint256 electionId = _createDraftElection();
        address voter = makeAddr("voter");
        (address nextSigner, uint256 nextSignerPk) = makeAddrAndKey("nextSigner");

        DVoteTypes.KycApproval memory approval = _defaultKycApproval(
            electionId,
            voter,
            keccak256("commitment::rotate"),
            0,
            block.timestamp + 1 days,
            false,
            keccak256("reason::rotate")
        );

        bytes memory oldSignature = _signKycApproval(approval, kycSignerPk);

        vm.prank(eci);
        manager.rotateKycSigner(kycSigner, nextSigner);

        vm.expectRevert(DVoteErrors.InvalidSignature.selector);
        manager.approveKycWithSig(approval, oldSignature);

        bytes memory newSignature = _signKycApproval(approval, nextSignerPk);
        manager.approveKycWithSig(approval, newSignature);
        assertEq(manager.kycNonces(voter), 1);
    }
}
