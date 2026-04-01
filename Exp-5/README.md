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
│           └── myAsset.js      # Asset management chaincode
├── test-network/               # Reference to Fabric test network (external)
├── .nvmrc                      # Node version (20 — for Fabric compatibility)
└── README.md                   # This file
```

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
export PATH=$PATH:$HOME/fabric-samples/bin
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
cp -r Exp-5/chaincode/javascript ~/fabric-samples/chaincode/myasset/javascript
```

### Step 3: Install Chaincode Dependencies

```bash
cd ~/fabric-samples/chaincode/myasset/javascript
nvm use 20
npm install
```

### Step 4: Deploy (Package, Install, Approve, Commit) Chaincode

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

# Get the package ID (copy from output)
peer lifecycle chaincode queryinstalled

# Approve and commit (use the PACKAGE_ID from above)
export PACKAGE_ID=<paste_package_id_here>

peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name myasset \
  --version 1.0 \
  --sequence 1 \
  --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
```

### Step 5: Invoke and Query Chaincode

```bash
# Invoke — create an asset
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel \
  -n myasset \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  -c '{"function":"CreateAsset","Args":["asset1","blue","5","Tom","1300"]}'

# Query — read the asset
peer chaincode query \
  -C mychannel \
  -n myasset \
  -c '{"Args":["ReadAsset","asset1"]}'
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

After query:

```json
{"AppraisedValue":1300,"Color":"blue","ID":"asset1","Owner":"Tom","Size":5}
```

## References

- Hyperledger Fabric Docs: https://hyperledger-fabric.readthedocs.io/
- fabric-samples: https://github.com/hyperledger/fabric-samples
- JavaScript Chaincode Tutorial: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4ade.html

---

*Blockchain Lab · IT Engineering SEM VIII · University of Mumbai · AY 2025-26*
