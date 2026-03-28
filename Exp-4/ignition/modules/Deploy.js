const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');

/**
 * Hardhat Ignition module for deploying the PaxtonToken ERC-20 contract.
 *
 * The deployer account (m.getAccount(0)) is passed as the `initialOwner`
 * constructor argument required by OpenZeppelin v5 Ownable.
 */
module.exports = buildModule('PaxtonTokenModule', (m) => {
  // The first signer becomes the initial owner of the token contract
  const deployer = m.getAccount(0);

  // Deploy PaxtonToken with the deployer as initialOwner
  const token = m.contract('PaxtonToken', [deployer]);

  return { token };
});
