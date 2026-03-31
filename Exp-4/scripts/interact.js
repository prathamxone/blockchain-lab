const { ethers } = require('hardhat');

/**
 * Post-deploy interaction script for PaxtonToken on Sepolia.
 *
 * Usage (address is required — no fallback):
 *   Option A (CLI):  npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_ADDRESS>
 *   Option B (env):  PAXTON_TOKEN_ADDRESS=<TOKEN_ADDRESS> npx hardhat run scripts/interact.js --network sepolia
 *
 * By default the script is read-only (metadata + balance queries).
 * Pass --transfer to execute a live 100 PXT transfer (opt-in, with balance check).
 *   npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_ADDRESS> --transfer
 */

// ── Configuration ────────────────────────────────────────────────────────────
// Priority: CLI arg > PAXTON_TOKEN_ADDRESS env var
// No fallback — an explicit address is always required to prevent accidental
// interactions with the wrong contract instance.

function resolveTokenAddress() {
  // Hardhat forwards user arguments after `--`; scan argv for the first valid address.
  const cliAddress = process.argv.slice(2).find((arg) => ethers.isAddress(arg));
  const envAddress = process.env.PAXTON_TOKEN_ADDRESS;
  const candidate = cliAddress || envAddress;

  if (!candidate || !ethers.isAddress(candidate)) {
    throw new Error(
      'Token address is required.\n' +
        '  Option A (CLI):  npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_ADDRESS>\n' +
        '  Option B (env):  PAXTON_TOKEN_ADDRESS=<TOKEN_ADDRESS> npx hardhat run scripts/interact.js --network sepolia'
    );
  }

  return candidate;
}

async function main() {
  const tokenAddress = resolveTokenAddress();

  // ── Get signers ──────────────────────────────────────────────────────────
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // On Sepolia (single signer), fall back to the deployer address to avoid burning tokens.
  // On local hardhat (multiple signers), use the second signer.
  const recipientAddress =
    signers.length > 1 ? signers[1].address : deployer.address;

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

  // ── Optional transfer (opt-in via --transfer flag) ───────────────────────
  // Pass --transfer on the CLI to execute a live token transfer.
  // Without the flag, the script is read-only and safe to run repeatedly.
  const doTransfer = process.argv.includes('--transfer');
  const transferAmount = ethers.parseUnits('100', decimals);

  console.log('── Transfer ──────────────────────────────────────────────');
  if (!doTransfer) {
    console.log('  (Skipped — pass --transfer flag to execute a live transfer)');
    console.log();
  } else {
    // Balance check: ensure deployer has enough tokens before sending
    if (deployerBalance < transferAmount) {
      console.log(
        '  ⚠ Insufficient balance for transfer:',
        ethers.formatUnits(deployerBalance, decimals),
        symbol,
        '< 100',
        symbol
      );
      console.log('  (Transfer skipped)');
      console.log();
    } else {
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

      // ── Post-transfer balances ─────────────────────────────────────────
      const deployerBalanceAfter = await token.balanceOf(deployer.address);
      const recipientBalanceAfter = await token.balanceOf(recipientAddress);

      console.log('── Balances After Transfer ───────────────────────────────');
      console.log('  Deployer  :', ethers.formatUnits(deployerBalanceAfter, decimals), symbol);
      console.log('  Recipient :', ethers.formatUnits(recipientBalanceAfter, decimals), symbol);
      console.log();
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Interaction complete ✅');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
