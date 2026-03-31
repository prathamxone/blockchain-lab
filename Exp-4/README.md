# Experiment 4 — Design and Develop Blockchain Program using MetaMask

## Aim

To design and develop a custom cryptocurrency (ERC-20 token) smart contract using Solidity and
OpenZeppelin, deploy it to the Ethereum Sepolia testnet via MetaMask and Remix IDE, and interact
with the token from a MetaMask wallet.

## Lab Outcome Mapping

**LO4** — Design and develop Cryptocurrency. *(L4)*

## Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v22.x.x | JavaScript runtime |
| Hardhat | v2.28.x | Compile, test, deploy |
| Solidity | ^0.8.21 | ERC-20 smart contract language |
| OpenZeppelin | ^5.x.x | Battle-tested ERC-20 base contract |
| MetaMask | — | Wallet provider for Remix (Injected Provider) |
| Remix IDE | — | Browser-based contract deployment |
| Etherscan (Sepolia) | — | Token contract verification |

## Project Structure

```
Exp-4/
├── contracts/
│   └── PaxtonToken.sol     # ERC-20 Paxton (PXT) token contract
├── ignition/
│   └── modules/
│       └── Deploy.js       # Hardhat Ignition deployment module
├── scripts/
│   └── interact.js         # Post-deploy interaction script (ethers.js)
├── test/
│   └── PaxtonToken.test.js # Mocha/Chai test suite (15 tests)
├── screenshots/            # Output screenshots for EXP-4_DOC.md
├── .env                    # Secrets (NOT committed)
├── .env.example            # Template for .env
├── .nvmrc                  # Node version (22)
├── .prettierrc             # Code formatter config
├── hardhat.config.js       # Hardhat config (includes Sepolia)
├── truffle-config.js       # Legacy local config (not used in Exp-4 flow)
└── package.json            # npm manifest
```

## Steps to Run

### Prerequisites

1. `.env` file with `PRIVATE_KEY`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`
2. MetaMask wallet with Sepolia test ETH (from a faucet)
3. Remix IDE open: https://remix.ethereum.org

### 1. Compile and Test Locally

```bash
cd Exp-4
nvm use 22
npm install
npx hardhat compile
npx hardhat test
```

### 2. Deploy to Sepolia Testnet

```bash
npx hardhat ignition deploy ./ignition/modules/Deploy.js --network sepolia
```

### 3. Verify on Etherscan

```bash
npx hardhat verify --network sepolia <TOKEN_CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

### 4. Run Interaction Script

An explicit token address is always required (no fallback). By default the script is **read-only**
(metadata + balances). Pass `--transfer` to execute a live 100 PXT transfer.

```bash
# Option A: pass token address directly (recommended)
npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_CONTRACT_ADDRESS>

# Option B: use env variable
PAXTON_TOKEN_ADDRESS=<TOKEN_CONTRACT_ADDRESS> npx hardhat run scripts/interact.js --network sepolia

# To also execute a live transfer (opt-in):
npx hardhat run scripts/interact.js --network sepolia -- <TOKEN_CONTRACT_ADDRESS> --transfer
```

### 5. Add Token to MetaMask

1. In MetaMask → Import tokens → Paste the contract address
2. Token symbol (PXT) and decimals (18) auto-populate from the contract
3. Your token balance (1,000,000 PXT) should appear

### 6. Deploy via Remix + MetaMask (Alternative)

1. ```bash
   remixd -s ./contracts --remix-ide https://remix.ethereum.org
   ```
2. Open Remix → Connect to Localhost → open `PaxtonToken.sol`
3. Compile → Deploy with **Injected Provider - MetaMask** (switch to Sepolia)
4. Confirm transaction in MetaMask

## Expected Output

After deployment:

```
Deployed Addresses
==================
PaxtonTokenModule#PaxtonToken - 0x<TOKEN_ADDRESS>
```

After adding to MetaMask:
- Token **PXT** appears in your MetaMask wallet
- Balance shows **1,000,000 PXT**
- Verified contract visible at: https://sepolia.etherscan.io/address/0x<TOKEN_ADDRESS>

## Notes

- `decimals()` returns 18 by default in OpenZeppelin ERC-20.
- Use `ethers.parseUnits("100", 18)` in tests to represent 100 tokens.
- The `mint()` function is owner-gated — only the deployer can mint additional tokens.
- The `burn()` function is public — any holder can burn their own tokens.
- Never deploy a token with real monetary value as a lab exercise.

---

*Blockchain Lab · IT Engineering SEM VIII · University of Mumbai · AY 2025-26*
