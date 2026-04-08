// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library DVoteConstants {
    uint8 internal constant MAX_CONTESTING_CANDIDATES = 15;
    uint8 internal constant MAX_RERUNS = 1;
    uint64 internal constant RERUN_CREATION_SLA = 7 days;

    bytes32 internal constant NOTA_CANDIDATE_ID = keccak256("D VOTE NOTA");

    string internal constant EIP712_NAME = "DVoteKycAttestation";
    string internal constant EIP712_VERSION = "1";

    bytes32 internal constant KYC_TYPEHASH = keccak256(
        "KycApproval(address subjectWallet,bytes32 commitment,uint256 electionId,uint256 nonce,uint256 expiry,bool isAadhaarOnly,bytes32 reasonCodeHash)"
    );
}
