// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DVoteManager} from "../src/DVoteManager.sol";

contract RotateKycSignerScript is Script {
    function run() external {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");
        address managerAddress = vm.envAddress("DVOTE_MANAGER_ADDRESS");

        address oldSigner = vm.envAddress("DVOTE_OLD_KYC_SIGNER");
        address newSigner = vm.envAddress("DVOTE_NEW_KYC_SIGNER");

        DVoteManager manager = DVoteManager(managerAddress);

        vm.startBroadcast(operatorPk);
        manager.rotateKycSigner(oldSigner, newSigner);
        vm.stopBroadcast();

        console2.log("KYC signer rotated to:", newSigner);
    }
}
