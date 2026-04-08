// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract BootstrapElectionScript is Script {
    function run() external returns (uint256 electionId) {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");
        address managerAddress = vm.envAddress("DVOTE_MANAGER_ADDRESS");

        DVoteManager manager = DVoteManager(managerAddress);

        bytes32 constituencyId = vm.envOr("DVOTE_CONSTITUENCY_ID", keccak256("constituency::default"));
        bytes32 electionSalt = vm.envOr("DVOTE_ELECTION_SALT", keccak256(abi.encodePacked(block.timestamp)));

        uint64 registrationStart = uint64(vm.envUint("DVOTE_REGISTRATION_START"));
        uint64 registrationEnd = uint64(vm.envUint("DVOTE_REGISTRATION_END"));
        uint64 votingStart = uint64(vm.envUint("DVOTE_VOTING_START"));
        uint64 votingEnd = uint64(vm.envUint("DVOTE_VOTING_END"));

        bytes32 candidateId = vm.envOr("DVOTE_CANDIDATE_ID", keccak256("candidate::one"));
        bytes32 nominationHash = vm.envOr("DVOTE_NOMINATION_HASH", keccak256("nomination::one"));
        string memory candidateName = vm.envOr("DVOTE_CANDIDATE_NAME", string("Candidate One"));
        bool addNota = vm.envOr("DVOTE_ADD_NOTA", true);

        vm.startBroadcast(operatorPk);

        electionId = manager.createElection(
            constituencyId,
            electionSalt,
            registrationStart,
            registrationEnd,
            votingStart,
            votingEnd,
            0
        );

        manager.addCandidate(electionId, candidateId, candidateName, nominationHash, false);

        if (addNota) {
            manager.addCandidate(electionId, bytes32(0), "NOTA", keccak256("nomination::nota"), true);
        }

        vm.stopBroadcast();

        console2.log("Election bootstrapped. electionId:", electionId);
    }
}
