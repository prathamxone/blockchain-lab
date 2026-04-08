// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DVoteTypes} from "./DVoteTypes.sol";

library DVoteHashing {
    function identityCommitment(string memory identityDocumentCanonical, bytes32 electionSalt) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(identityDocumentCanonical, electionSalt));
    }

    function kycStructHash(bytes32 kycTypeHash, DVoteTypes.KycApproval memory approval) internal pure returns (bytes32) {
        bytes32 result;
        assembly ("memory-safe") {
            let ptr := mload(0x40)

            mstore(ptr, kycTypeHash)
            mstore(add(ptr, 0x20), mload(approval))
            mstore(add(ptr, 0x40), mload(add(approval, 0x20)))
            mstore(add(ptr, 0x60), mload(add(approval, 0x40)))
            mstore(add(ptr, 0x80), mload(add(approval, 0x60)))
            mstore(add(ptr, 0xa0), mload(add(approval, 0x80)))
            mstore(add(ptr, 0xc0), mload(add(approval, 0xa0)))
            mstore(add(ptr, 0xe0), mload(add(approval, 0xc0)))

            result := keccak256(ptr, 0x100)
            mstore(0x40, add(ptr, 0x100))
        }
        return result;
    }
}
