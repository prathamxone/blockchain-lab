// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract PostDeployCheckScript is Script {
    function run() external view {
        address managerAddress = vm.envAddress("DVOTE_MANAGER_ADDRESS");
        DVoteManager manager = DVoteManager(managerAddress);

        address admin = vm.envOr("DVOTE_ADMIN", address(0));
        address eci = vm.envOr("DVOTE_ECI", address(0));
        address sro = vm.envOr("DVOTE_SRO", address(0));
        address ro = vm.envOr("DVOTE_RO", address(0));
        address observer = vm.envOr("DVOTE_OBSERVER", address(0));
        address emergency = vm.envOr("DVOTE_EMERGENCY", address(0));

        console2.log("DVoteManager:", managerAddress);
        console2.log("Active KYC signer:", manager.activeKycSigner());

        if (admin != address(0)) {
            console2.log("admin has DEFAULT_ADMIN_ROLE:", manager.hasRole(manager.DEFAULT_ADMIN_ROLE(), admin));
        }
        if (eci != address(0)) {
            console2.log("eci has ECI_ROLE:", manager.hasRole(manager.ECI_ROLE(), eci));
        }
        if (sro != address(0)) {
            console2.log("sro has SRO_ROLE:", manager.hasRole(manager.SRO_ROLE(), sro));
        }
        if (ro != address(0)) {
            console2.log("ro has RO_ROLE:", manager.hasRole(manager.RO_ROLE(), ro));
        }
        if (observer != address(0)) {
            console2.log("observer has OBSERVER_ROLE:", manager.hasRole(manager.OBSERVER_ROLE(), observer));
        }
        if (emergency != address(0)) {
            console2.log("emergency has EMERGENCY_ROLE:", manager.hasRole(manager.EMERGENCY_ROLE(), emergency));
        }
    }
}
