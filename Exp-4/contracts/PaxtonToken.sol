// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaxtonToken
 * @notice ERC-20 token "Paxton" (PXT) with owner-gated minting and public burn.
 * @dev    Deployed on Sepolia testnet for Exp-4 (LO4 — Design and develop Cryptocurrency).
 *         - Initial supply : 1,000,000 PXT (minted to deployer)
 *         - Decimals       : 18 (ERC-20 default)
 *         - Mint           : onlyOwner — mint additional tokens post-deploy
 *         - Burn           : public — any holder can burn their own tokens
 */
contract PaxtonToken is ERC20, Ownable {
    /**
     * @notice Constructs the PaxtonToken and mints the initial supply to the deployer.
     * @param initialOwner Address that will own the contract (OZ v5 requirement).
     */
    constructor(address initialOwner) ERC20("Paxton", "PXT") Ownable(initialOwner) {
        // Mint 1,000,000 PXT to the deployer (msg.sender)
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Mints new tokens to the specified address. Only callable by the owner.
     * @param to    Recipient address.
     * @param amount Number of tokens to mint (in wei units).
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burns (destroys) tokens from the caller's balance.
     * @param amount Number of tokens to burn (in wei units).
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
