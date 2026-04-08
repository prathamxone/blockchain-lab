// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract DeployDVoteScript is Script {
    function run() external returns (DVoteManager manager) {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        address admin = vm.envOr("DVOTE_ADMIN", deployer);
        address eci = vm.envOr("DVOTE_ECI", deployer);
        address sro = vm.envOr("DVOTE_SRO", deployer);
        address ro = vm.envOr("DVOTE_RO", deployer);
        address observer = vm.envOr("DVOTE_OBSERVER", deployer);
        address kycSigner = vm.envOr("DVOTE_KYC_SIGNER", deployer);
        address emergency = vm.envOr("DVOTE_EMERGENCY", deployer);

        vm.startBroadcast(deployerPk);
        manager = new DVoteManager(admin, eci, sro, ro, observer, kycSigner, emergency);
        vm.stopBroadcast();

        console2.log("DVoteManager deployed at:", address(manager));
        console2.log("Admin:", admin);
        console2.log("ECI:", eci);
        console2.log("SRO:", sro);
        console2.log("RO:", ro);
        console2.log("Observer:", observer);
        console2.log("KYC Signer:", kycSigner);
        console2.log("Emergency:", emergency);
    }
}
