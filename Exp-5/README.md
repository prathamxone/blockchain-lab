# Experiment 5 — Deployment of Chain Code in Hyperledger Fabric

## Aim

To write, package, install, and deploy a JavaScript chaincode in Hyperledger Fabric using the
official Fabric test network, and invoke transactions using the peer CLI and Node.js SDK.

## Lab Outcome Mapping

**LO5** — Write and deploy chain code in Hyperledger Fabric. *(L4)*

## Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 29.x.x | Run Hyperledger Fabric network nodes |
| Docker Compose | v2.x.x | Orchestrate multi-container Fabric network |
| Hyperledger Fabric | v2.5.x | Permissioned blockchain platform |
| Node.js | v20.x.x (nvm: `nvm use 20`) | Run Fabric JavaScript chaincode |
| fabric-contract-api | ^2.x.x | Chaincode development API |
| fabric-samples | — | Official Fabric test network scripts |

> **Note:** Hyperledger Fabric is a **permissioned blockchain** (not Ethereum-based).
> It uses peers, orderers, channels, and MSPs instead of public accounts/wallets.

## Project Structure

```
Exp-5/
├── chaincode/
│   └── javascript/
│       ├── package.json        # Chaincode npm manifest
│       ├── index.js            # Chaincode entry point
│       └── lib/
│           └── myAsset.js      # Asset management chaincode (8 functions)
├── screenshots/                # Output screenshots (saved after running the experiment)
├── .nvmrc                      # Node version pin (20 — mandatory for Fabric)
├── EXP-5_PLAN.md               # Implementation plan
├── EXP-5_DOC.md                # College evaluation file (written after experiment)
└── README.md                   # This file
```

> **External dependency**: `~/fabric-samples/` is installed outside this repository (see Prerequisites).

## Prerequisites

### 1. Verify Docker is Running

```bash
docker --version       # Docker version 29.x.x
docker compose version # Docker Compose v2.x.x
```

### 2. Install Hyperledger Fabric Samples

Install fabric-samples, Fabric binaries, and Docker images using the official script (DO NOT run inside this Exp-5 folder):

```bash
cd ~
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.15 docker samples binary
```

> **Note:** The old `curl -sSL https://bit.ly/2ysbOFE | bash -s` bootstrap URL is deprecated. Always use `install-fabric.sh` for new installs.

Add Fabric binaries to PATH:

```bash
export PATH=$HOME/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/fabric-samples/config/
```

### 3. Verify Fabric Binaries

```bash
peer version          # peer: 2.5.x
orderer version       # orderer: 2.5.x
```

## Steps to Run

### Step 1: Start the Fabric Test Network

```bash
cd ~/fabric-samples/test-network
./network.sh down     # Clean up any previous network
./network.sh up createChannel -c mychannel -ca
```

Expected output: `Channel 'mychannel' joined`

### Step 2: Copy Chaincode to a Fabric-accessible Location

```bash
# From the blockchain-lab project root:
mkdir -p ~/fabric-samples/chaincode/myasset/javascript
cp -r Exp-5/chaincode/javascript/. ~/fabric-samples/chaincode/myasset/javascript/

# Verify the copy
ls ~/fabric-samples/chaincode/myasset/javascript/
# Expected: index.js  lib  package.json
```

### Step 3: Install Chaincode Dependencies

```bash
cd ~/fabric-samples/chaincode/myasset/javascript
nvm use 20
npm install
```

### Step 4: Deploy (Package, Install, Approve, Commit) Chaincode

#### Option A — Recommended: Use `deployCC` shortcut (automated lifecycle)

```bash
cd ~/fabric-samples/test-network

./network.sh deployCC -ccn myasset \
  -ccp ../chaincode/myasset/javascript \
  -ccl javascript \
  -ccv 1.0 \
  -ccs 1
```

This single command handles the full lifecycle: packages, installs on both peers, approves for Org1 and Org2, and commits the chaincode definition to `mychannel`.

Expected output:
```
Committing chaincode definition myasset on channel 'mychannel'
... status:200
Chaincode definition committed on channel 'mychannel'
```

#### Option B — Manual lifecycle (for learning purposes)

```bash
cd ~/fabric-samples/test-network

# Set environment variables for Org1 peer
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Package the chaincode
peer lifecycle chaincode package myasset.tar.gz \
  --path ../chaincode/myasset/javascript \
  --lang node \
  --label myasset_1.0

# Install on Org1 peer
peer lifecycle chaincode install myasset.tar.gz

# Get the package ID and store it
export PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid myasset.tar.gz)
peer lifecycle chaincode queryinstalled

# Approve for Org1
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Switch to Org2 peer environment
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# Install on Org2 peer
peer lifecycle chaincode install myasset.tar.gz

# Approve for Org2
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Switch back to Org1 for commit (requires BOTH peer addresses)
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Commit chaincode definition (MUST include both Org1 and Org2 peer addresses)
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --sequence 1 \
  --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
```

> **Note:** The `commit` command **must** include `--peerAddresses` for **both** Org1 (port 7051) and Org2 (port 9051). Omitting Org2 causes an endorsement policy failure even if both organizations approved.

### Step 5: Invoke and Query Chaincode

> Make sure the Org1 TLS env vars are set before running peer commands (see Step 4 — Option B or re-export from the `deployCC` session).

```bash
# 1. Initialize the ledger with 6 sample assets
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${HOME}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${HOME}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  -c '{"function":"InitLedger","Args":[]}'

# 2. Query all assets (should return 6 assets)
peer chaincode query -C mychannel -n myasset \
  -c '{"Args":["GetAllAssets"]}'

# 3. Create a new asset
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${HOME}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${HOME}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  -c '{"function":"CreateAsset","Args":["asset7","purple","20","Pratham","1500"]}'

# 4. Read the new asset
peer chaincode query -C mychannel -n myasset \
  -c '{"Args":["ReadAsset","asset7"]}'
# Expected: {"AppraisedValue":1500,"Color":"purple","ID":"asset7","Owner":"Pratham","Size":20}

# 5. Transfer asset7 to a new owner
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${HOME}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${HOME}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  -c '{"function":"TransferAsset","Args":["asset7","Christopher"]}'

# 6. Confirm ownership transfer
peer chaincode query -C mychannel -n myasset \
  -c '{"Args":["ReadAsset","asset7"]}'
# Expected: "Owner":"Christopher"
```

### Step 6: Tear Down the Network

```bash
cd ~/fabric-samples/test-network
./network.sh down
```

## Expected Output

After `./network.sh up createChannel`:

```
Creating channel 'mychannel'.
Anchor peer set for org 'Org1MSP' on channel 'mychannel'
Anchor peer set for org 'Org2MSP' on channel 'mychannel'
Channel 'mychannel' joined
```

After `GetAllAssets` (post `InitLedger`):

```json
[
  {"AppraisedValue":300,"Color":"blue","ID":"asset1","Owner":"Tomoko","Size":5,"docType":"asset"},
  {"AppraisedValue":400,"Color":"red","ID":"asset2","Owner":"Brad","Size":5,"docType":"asset"},
  ...
]
```

After `ReadAsset asset7` (post `CreateAsset`):

```json
{"AppraisedValue":1500,"Color":"purple","ID":"asset7","Owner":"Pratham","Size":20}
```

After `ReadAsset asset7` (post `TransferAsset`):

```json
{"AppraisedValue":1500,"Color":"purple","ID":"asset7","Owner":"Christopher","Size":20}
```

## References

- Hyperledger Fabric Docs: https://hyperledger-fabric.readthedocs.io/
- fabric-samples: https://github.com/hyperledger/fabric-samples
- JavaScript Chaincode Tutorial: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4ade.html

---

*Blockchain Lab · IT Engineering SEM VIII · University of Mumbai · AY 2025-26*
