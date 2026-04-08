// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {DVoteConstants} from "../../src/constants/DVoteConstants.sol";
import {DVoteManager} from "../../src/DVoteManager.sol";
import {DVoteTypes} from "../../src/lib/DVoteTypes.sol";

contract DVoteTestBase is Test {
    DVoteManager internal manager;

    address internal admin;
    address internal eci;
    uint256 internal eciPk;
    address internal sro;
    address internal ro;
    address internal observer;
    address internal kycSigner;
    address internal emergency;
    uint256 internal kycSignerPk;

    bytes32 internal constant DEFAULT_CONSTITUENCY_ID = keccak256("constituency::mumbai-north");

    function setUp() public virtual {
        admin = makeAddr("admin");
        (eci, eciPk) = makeAddrAndKey("eci");
        sro = makeAddr("sro");
        ro = makeAddr("ro");
        observer = makeAddr("observer");
        (kycSigner, kycSignerPk) = makeAddrAndKey("kycSigner");
        emergency = makeAddr("emergency");

        manager = new DVoteManager(admin, eci, sro, ro, observer, kycSigner, emergency);
    }

    function _createDraftElection() internal returns (uint256 electionId) {
        uint64 nowTs = uint64(block.timestamp);
        uint256 nextId = manager.nextElectionId();
        bytes32 electionSalt = keccak256(abi.encodePacked("salt::", nowTs, nextId));

        vm.prank(eci);
        electionId = manager.createElection(
            DEFAULT_CONSTITUENCY_ID,
            electionSalt,
            nowTs + 10,
            nowTs + 50,
            nowTs + 100,
            nowTs + 200,
            0
        );
    }

    function _openRegistration(uint256 electionId) internal {
        vm.prank(sro);
        manager.openRegistration(electionId);
    }

    function _openVoting(uint256 electionId) internal {
        vm.prank(eci);
        manager.openVoting(electionId);
    }

    function _defaultKycApproval(
        uint256 electionId,
        address subjectWallet,
        bytes32 commitment,
        uint256 nonce,
        uint256 expiry,
        bool isAadhaarOnly,
        bytes32 reasonCodeHash
    ) internal pure returns (DVoteTypes.KycApproval memory approval) {
        approval = DVoteTypes.KycApproval({
            subjectWallet: subjectWallet,
            commitment: commitment,
            electionId: electionId,
            nonce: nonce,
            expiry: expiry,
            isAadhaarOnly: isAadhaarOnly,
            reasonCodeHash: reasonCodeHash
        });
    }

    function _signKycApproval(
        DVoteTypes.KycApproval memory approval,
        uint256 signerPk
    ) internal view returns (bytes memory signature) {
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

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(DVoteConstants.EIP712_NAME)),
                keccak256(bytes(DVoteConstants.EIP712_VERSION)),
                block.chainid,
                address(manager)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        signature = abi.encodePacked(r, s, v);
    }

    function _signTieSeed(uint256 electionId, bytes32 tieSeed, uint256 signerPk) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked(address(manager), "TIE_LOT", electionId, tieSeed));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
