const { ethers } = require('hardhat');

/**
 * Post-deploy interaction script for PaxtonToken on Sepolia.
 *
 * Usage:
 *   npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_CONTRACT_ADDRESS>
 *
 * Queries token metadata (name, symbol, totalSupply), deployer balance,
 * and performs a test transfer to a second address.
 */

// ── Configuration ────────────────────────────────────────────────────────────
// Priority: CLI arg > env var > fallback constant
const FALLBACK_TOKEN_ADDRESS = '0xe9A6b9C4c8DfCBCbaa73977c4cCaa97717FD6F99';

function resolveTokenAddress() {
  // Hardhat forwards user arguments after `--`; scan argv for the first valid address.
  const cliAddress = process.argv.slice(2).find((arg) => ethers.isAddress(arg));
  const envAddress = process.env.PAXTON_TOKEN_ADDRESS;
  const candidate = cliAddress || envAddress || FALLBACK_TOKEN_ADDRESS;

  if (!ethers.isAddress(candidate)) {
    throw new Error(
      'Invalid token address. Provide a valid address as CLI arg or PAXTON_TOKEN_ADDRESS env var.'
    );
  }

  return candidate;
}

async function main() {
  const tokenAddress = resolveTokenAddress();

  // ── Get signers ──────────────────────────────────────────────────────────
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // On Sepolia (single signer), use a second address for transfer demo.
  // On local hardhat (multiple signers), use the second signer.
  const recipientAddress =
    signers.length > 1 ? signers[1].address : '0x000000000000000000000000000000000000dEaD'; // burn address for demo

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PaxtonToken (PXT) — Sepolia Interaction Script');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Deployer address :', deployer.address);
  console.log('Recipient address:', recipientAddress);
  console.log('Token address    :', tokenAddress);
  console.log();

  // ── Attach to deployed contract ──────────────────────────────────────────
  const token = await ethers.getContractAt('PaxtonToken', tokenAddress);

  // ── Query token metadata ─────────────────────────────────────────────────
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const totalSupply = await token.totalSupply();

  console.log('── Token Metadata ────────────────────────────────────────');
  console.log('  Name        :', name);
  console.log('  Symbol      :', symbol);
  console.log('  Decimals    :', decimals.toString());
  console.log('  Total Supply:', ethers.formatUnits(totalSupply, decimals), symbol);
  console.log();

  // ── Query balances ───────────────────────────────────────────────────────
  const deployerBalance = await token.balanceOf(deployer.address);
  const recipientBalance = await token.balanceOf(recipientAddress);

  console.log('── Balances ──────────────────────────────────────────────');
  console.log('  Deployer  :', ethers.formatUnits(deployerBalance, decimals), symbol);
  console.log('  Recipient :', ethers.formatUnits(recipientBalance, decimals), symbol);
  console.log();

  // ── Test transfer ────────────────────────────────────────────────────────
  const transferAmount = ethers.parseUnits('100', decimals);
  console.log('── Transfer ──────────────────────────────────────────────');
  console.log(
    '  Transferring',
    ethers.formatUnits(transferAmount, decimals),
    symbol,
    'to',
    recipientAddress,
    '...'
  );

  const tx = await token.transfer(recipientAddress, transferAmount);
  const receipt = await tx.wait();

  console.log('  Tx hash   :', receipt.hash);
  console.log('  Block #   :', receipt.blockNumber.toString());
  console.log('  Gas used  :', receipt.gasUsed.toString());
  console.log();

  // ── Post-transfer balances ───────────────────────────────────────────────
  const deployerBalanceAfter = await token.balanceOf(deployer.address);
  const recipientBalanceAfter = await token.balanceOf(recipientAddress);

  console.log('── Balances After Transfer ───────────────────────────────');
  console.log('  Deployer  :', ethers.formatUnits(deployerBalanceAfter, decimals), symbol);
  console.log('  Recipient :', ethers.formatUnits(recipientBalanceAfter, decimals), symbol);
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Interaction complete ✅');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
