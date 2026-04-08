// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract FinalizeElectionScript is Script {
    function run() external {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");
        address managerAddress = vm.envAddress("DVOTE_MANAGER_ADDRESS");
        uint256 electionId = vm.envUint("DVOTE_ELECTION_ID");

        bytes32 tieSeed = vm.envOr("DVOTE_TIE_SEED", bytes32(0));
        string memory tieSignatureHex = vm.envOr("DVOTE_TIE_SIGNATURE_HEX", string(""));
        bool closeBeforeFinalize = vm.envOr("DVOTE_CLOSE_BEFORE_FINALIZE", false);

        bytes memory tieSignature = bytes("");
        if (bytes(tieSignatureHex).length > 0) {
            tieSignature = vm.parseBytes(tieSignatureHex);
        }

        DVoteManager manager = DVoteManager(managerAddress);

        vm.startBroadcast(operatorPk);

        if (closeBeforeFinalize) {
            manager.closeVoting(electionId);
        }

        manager.finalizeElection(electionId, tieSeed, tieSignature);

        vm.stopBroadcast();

        console2.log("Finalize executed for electionId:", electionId);
    }
}
