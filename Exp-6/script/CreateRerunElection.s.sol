// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract CreateRerunElectionScript is Script {
    function run() external returns (uint256 childElectionId) {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");
        address managerAddress = vm.envAddress("DVOTE_MANAGER_ADDRESS");

        uint256 parentElectionId = vm.envUint("DVOTE_PARENT_ELECTION_ID");
        bytes32 electionSalt = vm.envOr("DVOTE_CHILD_ELECTION_SALT", keccak256(abi.encodePacked(block.timestamp)));

        uint64 registrationStart = uint64(vm.envUint("DVOTE_CHILD_REGISTRATION_START"));
        uint64 registrationEnd = uint64(vm.envUint("DVOTE_CHILD_REGISTRATION_END"));
        uint64 votingStart = uint64(vm.envUint("DVOTE_CHILD_VOTING_START"));
        uint64 votingEnd = uint64(vm.envUint("DVOTE_CHILD_VOTING_END"));

        DVoteManager manager = DVoteManager(managerAddress);

        vm.startBroadcast(operatorPk);
        childElectionId = manager.createRerunElection(
            parentElectionId,
            electionSalt,
            registrationStart,
            registrationEnd,
            votingStart,
            votingEnd
        );
        vm.stopBroadcast();

        console2.log("Rerun child election created:", childElectionId);
    }
}
