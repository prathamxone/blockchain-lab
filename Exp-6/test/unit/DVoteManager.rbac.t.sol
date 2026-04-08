// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {DVoteTestBase} from "../helpers/DVoteTestBase.sol";

contract DVoteManagerRbacTest is DVoteTestBase {
    function test_InitialRoleAssignments() external view {
        assertTrue(manager.hasRole(manager.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(manager.hasRole(manager.ECI_ROLE(), eci));
        assertTrue(manager.hasRole(manager.SRO_ROLE(), sro));
        assertTrue(manager.hasRole(manager.RO_ROLE(), ro));
        assertTrue(manager.hasRole(manager.OBSERVER_ROLE(), observer));
        assertTrue(manager.hasRole(manager.KYC_SIGNER_ROLE(), kycSigner));
        assertTrue(manager.hasRole(manager.EMERGENCY_ROLE(), emergency));
    }

    function test_AdminCanGrantAndRevokeEmergencyRole() external {
        address responder = makeAddr("responder");
        bytes32 emergencyRole = manager.EMERGENCY_ROLE();

        vm.prank(admin);
        manager.grantRole(emergencyRole, responder);
        assertTrue(manager.hasRole(emergencyRole, responder));

        vm.prank(admin);
        manager.revokeRole(emergencyRole, responder);
        assertTrue(!manager.hasRole(emergencyRole, responder));
    }

    function test_NonAdminCannotGrantRole() external {
        address outsider = makeAddr("outsider");
        address responder = makeAddr("responder");
        bytes32 adminRole = manager.DEFAULT_ADMIN_ROLE();
        bytes32 emergencyRole = manager.EMERGENCY_ROLE();

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, adminRole)
        );

        vm.prank(outsider);
        manager.grantRole(emergencyRole, responder);
    }

    function test_EciCanRotateKycSigner() external {
        address nextSigner = makeAddr("nextSigner");

        vm.prank(eci);
        manager.rotateKycSigner(kycSigner, nextSigner);

        assertEq(manager.activeKycSigner(), nextSigner);
        assertTrue(!manager.hasRole(manager.KYC_SIGNER_ROLE(), kycSigner));
        assertTrue(manager.hasRole(manager.KYC_SIGNER_ROLE(), nextSigner));
    }

    function test_NonEciCannotRotateKycSigner() external {
        address nextSigner = makeAddr("nextSigner");

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, ro, manager.ECI_ROLE())
        );

        vm.prank(ro);
        manager.rotateKycSigner(kycSigner, nextSigner);
    }

    function test_ObserverCannotOpenRegistration() external {
        uint256 electionId = _createDraftElection();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                observer,
                manager.SRO_ROLE()
            )
        );

        vm.prank(observer);
        manager.openRegistration(electionId);
    }
}
