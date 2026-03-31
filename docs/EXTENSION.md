# VS Code Extensions — Web3 Development Profile

> **Profile:** `Web3` (dedicated VS Code profile — separate from Default)
> **University of Mumbai · IT Engineering SEM VIII · AY 2025-26**

This file lists all recommended VS Code extensions for the `Web3` profile. Extensions are grouped
by category and tagged by priority:

| Tag | Meaning |
|-----|---------|
| 🔴 **Essential** | Must install — core functionality depends on it |
| 🟡 **Recommended** | Strongly advised for quality development experience |
| 🟢 **Optional** | Useful but not required for lab experiments |

> **How to install:** Open VS Code Command Palette (`Ctrl + Shift + P`) and run:
> `Extensions: Install Extensions` — then search by the Extension ID listed below.

---

## Table of Contents

1. [Solidity & Smart Contract Extensions](#1-solidity--smart-contract-extensions)
2. [Ethereum & Web3 Tooling](#2-ethereum--web3-tooling)
3. [Code Quality & Formatting](#3-code-quality--formatting)
4. [Git & Version Control](#4-git--version-control)
5. [Remote Development (Windows + WSL)](#5-remote-development-windows--wsl)
6. [Utilities & Productivity](#6-utilities--productivity)
7. [Themes & UI](#7-themes--ui)
8. [Quick Install Commands](#8-quick-install-commands)

---

## 1. Solidity & Smart Contract Extensions

> ⚠️ **Conflict Warning:** `NomicFoundation.hardhat-solidity` and `JuanBlanco.solidity` **conflict**
> when both are enabled. They both provide Solidity language services. Install **both but enable
> only one** at a time. For Hardhat and Foundry projects, prefer `NomicFoundation.hardhat-solidity`.
> For standalone Remix-style development or older coursework, `JuanBlanco.solidity` may be preferred.

---

### 1.1 Hardhat for Visual Studio Code

| Property | Details |
|----------|---------|
| **Extension ID** | `NomicFoundation.hardhat-solidity` |
| **Priority** | 🔴 Essential |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity |
| **Publisher** | Nomic Foundation (official Hardhat team) |

**What it provides:**

- Full **Solidity Language Server (LSP)** support — syntax highlighting, error highlighting,
  autocompletion, go-to-definition, find all references, hover documentation
- **Inline diagnostics** with direct links to the Solidity compiler error
- **Code actions** — quick fixes, import resolvers
- **Hardhat-aware** — reads `hardhat.config.js` or `hardhat.config.ts` for compiler version and
  remappings automatically
- **Foundry-compatible** — also works as the Solidity LSP for Foundry projects (via `foundry.toml`)
- Supports **multi-file projects** with remappings and libraries

**Usage notes:**

- Disable `JuanBlanco.solidity` when this extension is active
- No configuration required for Hardhat projects — it auto-detects the project root
- For Foundry: add `remappings` to `foundry.toml` and the extension will respect them

---

### 1.2 Solidity (Juan Blanco)

| Property | Details |
|----------|---------|
| **Extension ID** | `JuanBlanco.solidity` |
| **Priority** | 🟡 Recommended (alternative to 1.1) |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity |
| **Publisher** | Juan Blanco |

**What it provides:**

- Syntax highlighting, snippets, and compilation for Solidity
- Press `F5` to compile the current contract
- Press `Ctrl + F5` to compile all contracts
- Code completion, go-to-definition, hover info
- Support for **Nethereum** (C# Web3 library) code generation
- Integration with `solc` and `solcjs`

**Usage notes:**

- Widely used in the Solidity community and older tutorials
- The University of Mumbai lab manual may reference this extension
- Disable `NomicFoundation.hardhat-solidity` when this extension is active
- For modern Hardhat / Foundry projects, prefer Extension 1.1

**Compiler version setting** (in VS Code settings):

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.21+commit.d9974bed"
}
```

---

### 1.3 Solidity Visual Developer (formerly Solidity Visual Auditor)

| Property | Details |
|----------|---------|
| **Extension ID** | `tintinweb.solidity-visual-auditor` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor |
| **Publisher** | tintinweb |

**What it provides:**

- **Security-aware** syntax highlighting — marks `payable`, `public`, `external`, `delegatecall`,
  and other security-sensitive keywords with distinct colours
- **UML class diagrams** and **call graphs** generated from Solidity source code
- **Function signature** panel for quick navigation
- In-editor **security annotations** and auditing helpers
- **GraphViz** and **Mermaid** diagram export

**Usage notes:**

- Extremely useful for understanding contract architecture during experiments
- The colour highlighting helps visually identify access modifiers and security-sensitive functions

---

### 1.4 Ethereum Developer Tools (EthOver)

| Property | Details |
|----------|---------|
| **Extension ID** | `tintinweb.vscode-ethover` |
| **Priority** | 🟢 Optional |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-ethover |
| **Publisher** | tintinweb |

**What it provides:**

- Hover over any Ethereum **address** in your code to see:
  - Account type (EOA / Contract)
  - Balance
  - Transaction count
- Supports inline Ethereum address and ABI decoding
- Works with both mainnet and local networks (configurable RPC)

---

### 1.5 Truffle for VS Code

| Property | Details |
|----------|---------|
| **Extension ID** | `trufflesuite.truffle-vscode` |
| **Priority** | 🟡 Recommended (for Truffle experiments) |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=trufflesuite.truffle-vscode |
| **Publisher** | Truffle Suite (Consensys) — Archived |

**What it provides:**

- Right-click → **Build Contracts**, **Deploy Contracts** from Explorer
- Integrated **Truffle Debugger** inside VS Code
- **Network management** (switch between test networks)
- Ganache integration
- Ganache transaction **event viewer** inside editor

**Usage notes:**

> ⚠️ This extension is **archived** (Truffle Suite was sunset in 2024) and may no longer receive
> updates. It remains functional for coursework experiments. For new projects, use Hardhat tooling.

---

---

## 2. Ethereum & Web3 Tooling

### 2.1 DotENV

| Property | Details |
|----------|---------|
| **Extension ID** | `mikestead.dotenv` |
| **Priority** | 🔴 Essential |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=mikestead.dotenv |

**What it provides:**

- Syntax highlighting for `.env` files
- Prevents accidental display of secret values in certain themes

**Usage notes:**

- All Hardhat and Truffle projects using private keys or API keys (Alchemy, Infura) require `.env`
  files. This extension makes them readable and correctly highlighted.
- Pair with `.gitignore` rule `*.env` to prevent accidental commits.

---

### 2.2 REST Client

| Property | Details |
|----------|---------|
| **Extension ID** | `humao.rest-client` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=humao.rest-client |

**What it provides:**

- Send HTTP requests directly from `.http` or `.rest` files in VS Code
- View formatted JSON responses inline
- Useful for testing JSON-RPC calls directly against a local Ethereum node

**Example — query Hardhat node balance directly:**

```http
POST http://127.0.0.1:8545
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_getBalance",
  "params": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "latest"],
  "id": 1
}
```

---

### 2.3 YAML

| Property | Details |
|----------|---------|
| **Extension ID** | `redhat.vscode-yaml` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml |

**What it provides:**

- Schema validation and autocompletion for YAML files
- Useful for GitHub Actions CI/CD workflows (`.github/workflows/*.yml`)
- Also helpful for configuration files in some Web3 projects

---

## 3. Code Quality & Formatting

### 3.1 Prettier — Code Formatter

| Property | Details |
|----------|---------|
| **Extension ID** | `esbenp.prettier-vscode` |
| **Priority** | 🔴 Essential |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode |

**What it provides:**

- Automatic code formatting for JavaScript, TypeScript, JSON, Markdown, and more
- Supported in Hardhat deployment scripts and test files (`*.js`, `*.ts`)
- With `prettier-plugin-solidity`, also formats `.sol` files

**Setup — add Solidity formatting support:**

```bash
npm install --save-dev prettier prettier-plugin-solidity
```

Create `.prettierrc` in the project root:

```json
{
  "plugins": ["prettier-plugin-solidity"],
  "overrides": [
    {
      "files": "*.sol",
      "options": {
        "printWidth": 120,
        "tabWidth": 4,
        "useTabs": false,
        "singleQuote": false,
        "bracketSpacing": true,
        "explicitTypes": "always"
      }
    }
  ]
}
```

Enable format on save in VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

### 3.2 ESLint

| Property | Details |
|----------|---------|
| **Extension ID** | `dbaeumer.vscode-eslint` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint |

**What it provides:**

- Real-time JavaScript / TypeScript linting in the editor
- Highlights errors and warnings from ESLint directly in code
- Essential for Hardhat test scripts and deployment scripts

---

### 3.3 Error Lens

| Property | Details |
|----------|---------|
| **Extension ID** | `usernamehw.errorlens` |
| **Priority** | 🔴 Essential |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens |

**What it provides:**

- Displays errors and warnings from **all diagnostic sources** (ESLint, TypeScript, Solidity LSP)
  **inline on the same line** as the code — no need to hover
- Makes Solidity compilation errors visible instantly while writing contracts

---

## 4. Git & Version Control

### 4.1 GitLens — Git Supercharged

| Property | Details |
|----------|---------|
| **Extension ID** | `eamodio.gitlens` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens |

**What it provides:**

- **Git blame** annotation on every line — shows who last changed it and when
- Commit history in the editor sidebar
- File annotations and heatmaps
- Branch comparison and commit search

> The free tier of GitLens covers all essential features for this lab.

---

### 4.2 Git Graph

| Property | Details |
|----------|---------|
| **Extension ID** | `mhutchie.git-graph` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph |

**What it provides:**

- Visual **branch graph** of your git history (like `gitk` or GitKraken, built into VS Code)
- Click on any commit to view diff, cherry-pick, rebase, or create a branch from it
- Useful for managing experiment branches and reviewing changes before pushing

---

## 5. Remote Development (Windows + WSL)

### 5.1 Remote - WSL

| Property | Details |
|----------|---------|
| **Extension ID** | `ms-vscode-remote.remote-wsl` |
| **Priority** | 🔴 Essential (Windows users) / 🟢 Optional (Linux/macOS) |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl |
| **Publisher** | Microsoft |

**What it provides:**

- Opens VS Code **fully connected to WSL2** — the editor runs on Windows but all terminals,
  file system access, and language servers run inside WSL
- Foundry, Linux-only tools, and WSL-installed Node.js all work seamlessly
- Integrated terminal opens in bash/zsh inside WSL

**How to use:**

1. Install the extension in VS Code (Windows)
2. Open Command Palette (`Ctrl + Shift + P`) → `Remote-WSL: New WSL Window`
3. Or: from within WSL terminal, run `code .` to open the current folder in VS Code via Remote-WSL

> This is the **recommended way to work with Foundry** on Windows — open your project folder
> inside WSL through this extension so all Foundry CLI tools are available.

---

## 6. Utilities & Productivity

### 6.1 Code Runner

| Property | Details |
|----------|---------|
| **Extension ID** | `formulahendry.code-runner` |
| **Priority** | 🟢 Optional |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=formulahendry.code-runner |

**What it provides:**

- Run code snippets for JavaScript, Python, and many other languages directly from VS Code
- Useful for quickly testing JavaScript snippets for ethers.js interactions

---

### 6.2 Markdown All in One

| Property | Details |
|----------|---------|
| **Extension ID** | `yzhang.markdown-all-in-one` |
| **Priority** | 🟡 Recommended |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one |

**What it provides:**

- Keyboard shortcuts for Markdown formatting
- Auto-generate and update **Table of Contents**
- Auto-preview on save
- List continuation when pressing Enter
- Useful for maintaining `docs/` files in this repository

---

## 7. Themes & UI

### 7.1 Material Icon Theme

| Property | Details |
|----------|---------|
| **Extension ID** | `PKief.material-icon-theme` |
| **Priority** | 🟢 Optional |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme |

**What it provides:**

- Distinct, colour-coded file icons for `.sol` (Solidity), `.json`, `.env`, `.toml`, `.md`, and all
  common file types
- Makes the Explorer panel much easier to scan across a Web3 project with many file types

---

## 8. Quick Install Commands

You can install all essential and recommended extensions at once from the terminal.

### 🪟 PowerShell (Windows)

```powershell
$extensions = @(
  "NomicFoundation.hardhat-solidity",
  "JuanBlanco.solidity",
  "tintinweb.solidity-visual-auditor",
  "tintinweb.vscode-ethover",
  "trufflesuite.truffle-vscode",
  "mikestead.dotenv",
  "humao.rest-client",
  "redhat.vscode-yaml",
  "esbenp.prettier-vscode",
  "dbaeumer.vscode-eslint",
  "usernamehw.errorlens",
  "eamodio.gitlens",
  "mhutchie.git-graph",
  "ms-vscode-remote.remote-wsl",
  "formulahendry.code-runner",
  "yzhang.markdown-all-in-one",
  "PKief.material-icon-theme"
)
foreach ($ext in $extensions) {
  code --install-extension $ext --profile "Web3"
}
```

### 🐧 Bash (WSL / Linux)

```bash
extensions=(
  "NomicFoundation.hardhat-solidity"
  "JuanBlanco.solidity"
  "tintinweb.solidity-visual-auditor"
  "tintinweb.vscode-ethover"
  "trufflesuite.truffle-vscode"
  "mikestead.dotenv"
  "humao.rest-client"
  "redhat.vscode-yaml"
  "esbenp.prettier-vscode"
  "dbaeumer.vscode-eslint"
  "usernamehw.errorlens"
  "eamodio.gitlens"
  "mhutchie.git-graph"
  "ms-vscode-remote.remote-wsl"
  "formulahendry.code-runner"
  "yzhang.markdown-all-in-one"
  "PKief.material-icon-theme"
)
for ext in "${extensions[@]}"; do
  code --install-extension "$ext" --profile "Web3"
done
```

> **Note:** The `--profile "Web3"` flag installs each extension directly into the `Web3` VS Code
> profile, keeping it isolated from your Default profile. If your profile has a different name,
> update the flag accordingly.

---

*Last updated: February 2026 | Repository: https://github.com/prathamxone/blockchain-lab*
