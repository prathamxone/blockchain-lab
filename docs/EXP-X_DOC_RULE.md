# EXP-X_DOC_RULE.md — Evaluation File Authoring Standard

> **Blockchain Lab · ITL801 · University of Mumbai · BE IT SEM VIII · AY 2025-26**
> Single source of truth for authoring all `Exp-*/EXP-*_DOC.md` evaluation files.

---

## Table of Contents

- [EXP-X\_DOC\_RULE.md — Evaluation File Authoring Standard](#exp-x_doc_rulemd--evaluation-file-authoring-standard)
  - [Table of Contents](#table-of-contents)
  - [1. Purpose \& Role of DOC Files](#1-purpose--role-of-doc-files)
  - [2. When to Create a DOC File](#2-when-to-create-a-doc-file)
  - [3. File Naming \& Location](#3-file-naming--location)
  - [4. Mandatory Section Order](#4-mandatory-section-order)
  - [5. AIM Section Rules](#5-aim-section-rules)
  - [6. THEORY Section Rules](#6-theory-section-rules)
    - [6.1 Content Requirements](#61-content-requirements)
    - [6.2 Accuracy Requirements](#62-accuracy-requirements)
    - [6.3 What Not to Include](#63-what-not-to-include)
    - [6.4 Template](#64-template)
  - [7. IMPLEMENTATION Section Rules](#7-implementation-section-rules)
    - [7.1 CODE Subsection](#71-code-subsection)
      - [Snippet Count](#snippet-count)
      - [Snippet Requirements](#snippet-requirements)
      - [Snippet Selection Order](#snippet-selection-order)
      - [Line Range Citation](#line-range-citation)
    - [7.2 OUTPUT Subsection](#72-output-subsection)
  - [8. LAB OUTCOMES Section Rules](#8-lab-outcomes-section-rules)
  - [9. CONCLUSION Section Rules](#9-conclusion-section-rules)
  - [10. Screenshot \& Figure Standards](#10-screenshot--figure-standards)
    - [10.1 Before Taking Screenshots](#101-before-taking-screenshots)
    - [10.2 Capture Method by Output Type](#102-capture-method-by-output-type)
    - [10.3 After Taking Screenshots](#103-after-taking-screenshots)
    - [10.4 Block Explorer Citations](#104-block-explorer-citations)
  - [11. Edge Cases \& Quality Gates](#11-edge-cases--quality-gates)
  - [12. Full DOC File Template](#12-full-doc-file-template)

---

## 1. Purpose & Role of DOC Files

Each experiment has exactly **one** evaluation file located at:

```
Exp-X/EXP-X_DOC.md
```

This file is the **college submission document** for the experiment. It is formatted for academic evaluation and must present the experiment's aim, theoretical background, implementation evidence (code + output), lab outcome mapping, and conclusion in a structured format that an examiner can assess.

**DOC files are written for humans (examiners, professors) — not for AI agents.** They should be clear, accurate, and evidence-backed. Every output section must contain real screenshots from the actual experiment execution.

---

## 2. When to Create a DOC File

> ⚠️ **Creating a stub/template DOC file is acceptable, but do NOT fill in sections with real content until ALL of the following are true:**

- [ ] The experiment is **fully functional** — all contracts compile and deploy without errors.
- [ ] At least one **successful local deployment** has been executed and verified.
- [ ] For testnet experiments (Exp-3, Exp-4): at least one confirmed **on-chain transaction** exists.
- [ ] **Screenshots** for every required output are saved in `Exp-X/screenshots/`.
- [ ] The experiment `README.md` accurately reflects the run steps.
- [ ] **Web search has been performed** to verify current tool versions, dates, and technical accuracy of THEORY content (mandatory — see §6).

Writing the DOC file before the experiment is functional will produce inaccurate outputs and fabricated screenshots. This is a violation of academic integrity standards.

---

## 3. File Naming & Location

| File | Location | Naming Rule |
|------|----------|-------------|
| Evaluation file | `Exp-X/EXP-X_DOC.md` | `EXP-` + experiment number + `_DOC.md` (uppercase) |
| Screenshots | `Exp-X/screenshots/` | `fig-X.Y-descriptive-name.png` (kebab-case, no spaces) |

**Examples**:

```
Exp-1/EXP-1_DOC.md
Exp-1/screenshots/fig-1.1-ganache-accounts.png
Exp-1/screenshots/fig-1.2-truffle-migrate-output.png
Exp-1/screenshots/fig-1.2.1-contract-deployment-detail.png
```

---

## 4. Mandatory Section Order

Every `EXP-X_DOC.md` file must contain these five sections in this exact order. No section may be omitted.

```
1. AIM
2. THEORY
3. IMPLEMENTATION
   3a. CODE
   3b. OUTPUT
4. LAB OUTCOMES
5. CONCLUSION
```

---

## 5. AIM Section Rules

**Template**:

```markdown
## AIM

To <exact experiment name from `docs/BLOCKCHAIN_LAB_MANUAL.md`>.
```

**Rules**:
- Copy the aim **verbatim** from `docs/BLOCKCHAIN_LAB_MANUAL.md` experiment list — do not rephrase.
- The AIM is a single sentence beginning with `To`.
- No bullet points, no additional context.

---

## 6. THEORY Section Rules

The THEORY section provides the academic background for the technology stack used in the experiment.

### 6.1 Content Requirements

- **Length**: 250–300 words minimum. Do not exceed 400 words.
- **Format**: Bullet points and short statements only — **no prose paragraphs**.
- **Structure**: Definition → Origin/History → Key Concepts → How it is used in this experiment.
- **Mandatory elements**:
  - Definition of the primary technology with the year it was introduced/released.
  - Current stable version of each tool used (as of the current date — verify via web search).
  - Brief mechanism explanation (how it works at a high level).

### 6.2 Accuracy Requirements

> ⚠️ **Mandatory**: Perform a web search before writing the THEORY section to verify:
> - The current stable version of every tool mentioned.
> - That the tool is still actively maintained (not deprecated or archived).
> - That no major breaking changes or CVEs have been issued recently.
> - Correct founding year, organization, and technology description.

Tools to verify for each experiment:

| Experiment | Tools to Verify |
|-----------|----------------|
| Exp-1 | Truffle Suite (version), Ganache (version), Ethereum (current spec) |
| Exp-2 | Solidity (current version), smart contract definition, chaincode |
| Exp-3 | Hardhat (version), Sepolia testnet, Web3.js / ethers.js (version) |
| Exp-4 | ERC-20 standard (EIP-20), OpenZeppelin Contracts (version), MetaMask (version) |
| Exp-5 | Hyperledger Fabric (version), chaincode, Go/Node.js chaincode API |
| Exp-6 | Foundry (version), DApp architecture, relevant EIPs/standards |

### 6.3 What Not to Include

- ❌ Prose paragraphs (examiners read bullet points)
- ❌ Unverified version numbers (always cross-check with web search)
- ❌ References to deprecated networks (Ropsten, Rinkeby, Goerli)
- ❌ Personal opinions or speculative statements
- ❌ Code blocks in THEORY (code belongs in IMPLEMENTATION: CODE)

### 6.4 Template

```markdown
## THEORY

**<Primary Technology Name>**:
- <Definition — what it is, year introduced, by whom / which organization>
- <Current version as of February 2026: vX.Y.Z>
- <Core mechanism — how it works in 1–2 bullet points>
- <Key feature relevant to this experiment>

**<Secondary Technology/Concept>**:
- <Definition>
- <Current version or specification if applicable>
- <How it relates to this experiment>

**Key Concepts**:
- **<Term>**: <one-line definition>
- **<Term>**: <one-line definition>
- **<Term>**: <one-line definition>
```

---

## 7. IMPLEMENTATION Section Rules

The IMPLEMENTATION section is divided into two mandatory subsections: **CODE** and **OUTPUT**.

```markdown
## IMPLEMENTATION

### CODE
...

### OUTPUT
...
```

---

### 7.1 CODE Subsection

#### Snippet Count

| Minimum | Maximum |
|---------|---------|
| 3 snippets | 8 snippets |

#### Snippet Requirements

Each snippet **must** include:

1. **Filename header** — relative path from `Exp-X/` root as a bold label or comment.
2. **Language tag** — in the fenced code block opening (e.g., ` ```solidity `).
3. **Functional excerpt** — only the code that demonstrates a meaningful function, not the entire file.
4. **SPDX-License-Identifier** must be visible in any Solidity file's first snippet.

#### Snippet Selection Order

Arrange snippets in the **logical execution sequence** of the experiment:

```
1. Contract definition (Solidity — shows struct/state/events)
2. Core contract function (Solidity — the key function being demonstrated)
3. Migration / deploy script (JavaScript — Truffle migration or Hardhat deploy)
4. Test file (JavaScript — key test case proving contract function)
5. Config block (JS — relevant network in hardhat.config.js or truffle-config.js)
6. Interaction script / console output (optional — Web3.js or ethers.js call)
```

#### Line Range Citation

If a snippet is extracted from a large file (> 50 lines), cite the line range:

````markdown
**`contracts/SimpleStorage.sol`** (lines 1–22):
```solidity
// SPDX-License-Identifier: MIT
...
```
````

#### Template

````markdown
### CODE

**`contracts/SimpleStorage.sol`**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract SimpleStorage {
    uint256 public storedData;
    event DataStored(uint256 indexed value);

    function set(uint256 x) public { ... }
    function get() public view returns (uint256) { ... }
}
```

**`migrations/1_deploy_simple_storage.js`**:
```javascript
const SimpleStorage = artifacts.require("SimpleStorage");
module.exports = function (deployer) {
    deployer.deploy(SimpleStorage);
};
```
````

---

### 7.2 OUTPUT Subsection

The OUTPUT subsection documents **real evidence** that the experiment was executed successfully. Every screenshot must be authentic — no placeholder images, no screenshots from other students' machines.

#### Required Tool for Screenshots

| Output Type | Capture Method |
|------------|---------------|
| Browser UI (MetaMask, Remix IDE, Etherscan, DApp frontend) | **Chrome browser** — use Chrome DevTools MCP server for browser automation and screenshot capture in automated contexts |
| Terminal output (Truffle migrate, forge test, peer invoke) | **Manual screenshot** by the user — terminal output cannot be automated reliably |
| Ganache GUI | Manual screenshot by the user |
| VS Code output panel | Manual screenshot by the user |

> 💡 **For AI Agent screenshot capture**: Use the Chrome browser / Chrome DevTools MCP server for all web-based automation, UI testing, and screenshot capture. Navigate to the target URL, interact with the UI elements, and capture screenshots programmatically.

> 📌 **For terminal output**: The user must take a manual screenshot of the terminal showing the complete output. Alternatively, paste the raw terminal output in a fenced code block (` ```ansi ` or ` ```text `) within the OUTPUT section.

#### Figure Naming Convention

Every screenshot must be cited in the DOC file with a figure label:

| Pattern | When to Use |
|---------|-------------|
| `Fig X.Y — <Description>` | Main screenshot (Y is sequential integer) |
| `Fig X.Y.Z — <Description>` | Sub-screenshot / detail of Fig X.Y (Z is sub-integer) |

Where **X** = experiment number (1–6), **Y** = main figure sequence number, **Z** = sub-figure number.

**Examples**:
- `Fig 1.1 — Ganache GUI showing 10 test accounts with 100 ETH each`
- `Fig 1.2 — Truffle migrate output showing contract deployment to development network`
- `Fig 1.2.1 — Contract address highlighted in Truffle migrate output`
- `Fig 3.3 — Etherscan Sepolia showing confirmed contract deployment transaction`

#### Screenshot Filename Convention

Screenshots on disk must follow this naming pattern (matches the figure label):

```
fig-X.Y-brief-description.png
fig-X.Y.Z-brief-description.png
```

**Examples**:
```
fig-1.1-ganache-accounts.png
fig-1.2-truffle-migrate.png
fig-1.2.1-truffle-migrate-contract-address.png
fig-3.3-etherscan-sepolia-tx.png
```

**Rules**: kebab-case, all lowercase, no spaces, no special characters except hyphens.

#### Minimum Required Screenshots per Experiment Type

| Experiment Type | Required Screenshots |
|----------------|---------------------|
| **Local blockchain** (Exp-1, Exp-2) | (1) Terminal: compile output, (2) Ganache GUI: accounts/transactions, (3) Terminal: deploy/migrate output |
| **Testnet deploy** (Exp-3) | (1) Terminal: deploy output with tx hash, (2) Etherscan/Blockscout: tx confirmation page, (3) MetaMask: correct network + balance |
| **ERC-20 / MetaMask** (Exp-4) | (1) Terminal: compile + deploy, (2) MetaMask: token import + balance, (3) Remix or Etherscan: contract interaction |
| **Hyperledger Fabric** (Exp-5) | (1) Terminal: `peer chaincode install`, (2) Terminal: `peer chaincode invoke`, (3) Terminal: `peer chaincode query` response |
| **Mini Project DApp** (Exp-6) | (1) Terminal: `forge build` or `npx hardhat compile`, (2) Terminal: deploy script output, (3) MetaMask/Browser: DApp UI interaction |

#### Sensitive Information Redaction Rules

> ⚠️ **Security**: Before including any screenshot in a DOC file, review it for sensitive information.

| Data Type | Rule |
|-----------|------|
| Private key (hex string) | **Must be cropped/blurred** — never visible in any screenshot |
| Wallet mnemonic phrase (seed phrase) | **Must be cropped/blurred** — never visible |
| Full wallet address (0x...) in MetaMask | Redact if it matches a real wallet you use — test accounts are acceptable |
| API keys (Alchemy, Infura, Etherscan) in terminal | **Must be cropped** — crop the terminal output before screenshotting |
| `.env` file contents visible in VS Code | **Do not screenshot** VS Code with `.env` open |

#### Screenshot Quality Standards

| Standard | Requirement |
|---------|------------|
| **Resolution** | Minimum 1280 × 720 pixels |
| **Browser zoom** | 100% (default) — do not zoom in/out before capturing |
| **Terminal font size** | ≥ 14px — ensure output is legible without zooming |
| **Chrome version** | Must be visible in screenshots of Remix or Etherscan (check against Remix header or browser `chrome://version`) |
| **MetaMask network** | The active network name must be visible in all MetaMask screenshots — confirm correct network before capturing |
| **Remix IDE version** | The Remix version badge (bottom-left of Remix IDE) must be visible in any Remix screenshot |
| **Timestamp** | Not required, but if system clock is visible, ensure it shows a plausible date |
| **Complete output** | Terminal screenshots must show the **full command + full output** — not truncated; scroll to capture everything if necessary |

#### OUTPUT Template

```markdown
### OUTPUT

**Fig 1.1 — Ganache GUI: 10 test accounts with 100 ETH each**

![Fig 1.1 Ganache accounts](screenshots/fig-1.1-ganache-accounts.png)

---

**Fig 1.2 — Truffle migrate: contract deployed to development network**

![Fig 1.2 Truffle migrate](screenshots/fig-1.2-truffle-migrate.png)

*Transaction hash: `0x...` | Block: X | Gas used: Y*

---

**Fig 1.3 — Hardhat test suite: all tests passing**

![Fig 1.3 Hardhat test](screenshots/fig-1.3-hardhat-test.png)
```

> 📌 Include a caption under each screenshot (italic text) citing the transaction hash, block number, or relevant data that appears in the output. This helps examiners verify authenticity.

---

## 8. LAB OUTCOMES Section Rules

**Template**:

```markdown
## LAB OUTCOMES

**LOX** — <Exact LO text from `docs/BLOCKCHAIN_LAB_MANUAL.md`>
```

**Rules**:
- Include **only the single LO** mapped to this experiment per `docs/BLOCKCHAIN_LAB_MANUAL.md`.
- Copy the LO text from the manual, allowing canonical brand capitalization (e.g., "MetaMask" instead of "Metamask") — do not paraphrase or combine multiple LOs.
- Do not include Bloom's taxonomy levels in this section — the AIM section implicitly covers scope.
- The LO mapping per experiment is:

| Experiment | Lab Outcome |
|-----------|------------|
| Exp-1 | LO1 — Develop and test smart contract on local Blockchain |
| Exp-2 | LO2 — Develop and test smart contract on Ethereum test networks |
| Exp-3 | LO3 — Write and deploy smart contract using Remix IDE and MetaMask |
| Exp-4 | LO4 — Design and develop Cryptocurrency |
| Exp-5 | LO5 — Write and deploy chain code in Hyperledger Fabric |
| Exp-6 | LO6 — Develop and test a Full-fledged DApp using Ethereum/Hyperledger |

---

## 9. CONCLUSION Section Rules

**Template**:

```markdown
## CONCLUSION

We have successfully <action: implemented / deployed / designed> <what was built/demonstrated> using <primary tools>. This experiment demonstrated <key concept or learning from the experiment, 1 sentence>. Through this experiment, Lab Outcome <LOX> — <LO text> — was achieved.
```

**Rules**:
- **Exactly 2–3 sentences**. No more, no less.
- **Mandatory opener**: begin with `We have successfully` — no alternative phrasing.
- **No bullet points** in the CONCLUSION.
- **No lengthy prose** or repetition of theory — the conclusion is a closing statement.
- Mention: the experiment number implicitly (through reference to the work done), the primary tool used, and the LO achieved.
- Spell-check before submitting — the CONCLUSION is the most-read section by examiners.

**Bad example** ❌:
> We've completed this experiment. We learned a lot about blockchain.

**Good example** ✅:
> We have successfully developed and deployed a `SimpleStorage` smart contract on a local Ethereum blockchain using Truffle v5 and Ganache v7. This experiment demonstrated the complete lifecycle of smart contract development — from writing Solidity code to migrating and interacting with a deployed contract on a local network. Through this experiment, Lab Outcome LO1 — Develop and test smart contract on local Blockchain — was achieved.

---

## 10. Screenshot & Figure Standards

This section consolidates all screenshot rules as a quick reference checklist for the developer/author.

### 10.1 Before Taking Screenshots

- [ ] Experiment is fully functional (all phases complete, tests pass)
- [ ] MetaMask is connected to the **correct network** (network name visible)
- [ ] Browser zoom is at **100%**
- [ ] Terminal font size is **≥ 14px**
- [ ] No sensitive data (private keys, API keys, mnemonics) visible on screen
- [ ] If using Remix IDE: Remix version badge is visible
- [ ] Chrome browser is the active browser for all web screenshots

### 10.2 Capture Method by Output Type

| Output | Method |
|--------|--------|
| Remix IDE | Chrome browser / Chrome DevTools MCP |
| MetaMask popup / wallet | Chrome browser / Chrome DevTools MCP |
| Etherscan / Blockscout | Chrome browser / Chrome DevTools MCP |
| DApp frontend (HTML/React) | Chrome browser / Chrome DevTools MCP |
| Terminal (Truffle, Hardhat, Forge, Peer CLI) | Manual screenshot by user |
| Ganache GUI | Manual screenshot by user |
| VS Code output panel | Manual screenshot by user |

### 10.3 After Taking Screenshots

- [ ] File named as `fig-X.Y-description.png` (kebab-case, no spaces)
- [ ] Saved in `Exp-X/screenshots/` directory
- [ ] Reviewed for sensitive data — redacted if present
- [ ] Resolution ≥ 1280 × 720
- [ ] Cited in DOC file as `Fig X.Y — <Description>` with correct experiment number

### 10.4 Block Explorer Citations

For any testnet deployment screenshot:
- The Etherscan/Blockscout URL must be cited in the caption below the screenshot.
- The **transaction hash** must be visible in the screenshot.
- The **contract address** must be visible (on the contract page).
- The **verification badge** (green checkmark on Etherscan) should be included if contract is verified.

---

## 11. Edge Cases & Quality Gates

The following edge cases must be handled before the DOC file is considered complete:

| # | Edge Case | Rule |
|---|-----------|------|
| 1 | **MetaMask shows "Pending" transaction** | Do not screenshot pending transactions. Wait for confirmation (1–3 blocks on local). If stuck, reset MetaMask nonce (Settings → Advanced → Reset Account) and re-run. |
| 2 | **Etherscan verification not yet propagated** | Wait 2–3 minutes after tx confirmation before screenshotting Etherscan. Unverified contracts show warning — note this in caption if intentional. |
| 3 | **Terminal output truncated** | If terminal output is longer than one screen, capture multiple screenshots (Fig X.Y, Fig X.Y.1, etc.) or use scroll terminal and paste raw output in a code block. |
| 4 | **Tool version different from THEORY** | If the actual installed version differs from THEORY section, update THEORY to match the actual version used. Version inconsistency is a deduction point. |
| 5 | **Web3.js / ethers.js script output** | Console output must show at minimum: tx hash, block number, and the event emitted (if applicable). |
| 6 | **Foundry `forge test` output** | Show per-test-function PASS/FAIL breakdown — not just the final summary. Use `forge test -vvv` for verbose output. |
| 7 | **HLF `peer chaincode invoke` response** | The `peer chaincode invoke` and `peer chaincode query` terminal outputs are both mandatory screenshots. Show complete JSON response. |
| 8 | **Screenshot taken on different machine** | Screenshots must be from the developer's own machine where the experiment was run. Cross-machine screenshots will show different file paths and may misrepresent the actual execution environment. |
| 9 | **Old screenshots from a previous run** | If the contract was redeployed (e.g., after a bug fix), retake all screenshots. Addresses from old deployments will not match code in the CODE section. |
| 10 | **Remix IDE version** | Remix IDE auto-updates. The version badge (bottom-left) must be visible. If Remix UI changed significantly from the screenshots, note the date of capture in the caption. |

---

## 12. Full DOC File Template

Copy this template exactly when creating a new `EXP-X_DOC.md` file. Replace all `<placeholders>`.

```markdown
# Exp-X: <Experiment Name from BLOCKCHAIN_LAB_MANUAL.md>

---

## AIM

To <exact aim text from BLOCKCHAIN_LAB_MANUAL.md>.

---

## THEORY

**<Primary Technology>**:
- <Definition — what it is, year introduced, organization>
- <Current version as of 2026: vX.Y.Z — verified via web search>
- <Core mechanism — 1–2 bullet points>
- <Relevance to this experiment>

**<Secondary Technology / Concept>**:
- <Definition>
- <Version / specification>
- <Relevance>

**Key Concepts**:
- **<Term>**: <one-line definition>
- **<Term>**: <one-line definition>
- **<Term>**: <one-line definition>

---

## IMPLEMENTATION

### CODE

**`contracts/<ContractName>.sol`**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.X;
// ... functional excerpt ...
```

**`<path/to/script.js>`**:
```javascript
// ... functional excerpt ...
```

<!-- Add 1–6 more snippets as needed. Min 3, Max 8 total. -->

---

### OUTPUT

**Fig X.1 — <Description>**

![Fig X.1 <Alt text>](screenshots/fig-X.1-<name>.png)

*<Caption: transaction hash, tool version, or other relevant detail>*

---

**Fig X.2 — <Description>**

![Fig X.2 <Alt text>](screenshots/fig-X.2-<name>.png)

*<Caption>*

<!-- Add screenshots until all required outputs are documented. -->

---

## LAB OUTCOMES

**LOX** — <Exact LO text from docs/BLOCKCHAIN_LAB_MANUAL.md>

---

## CONCLUSION

We have successfully <action> <what was built> using <tools>. <One sentence describing key learning>. Through this experiment, Lab Outcome LOX — <LO text> — was achieved.
```

---

*Maintained by [Pratham Diwadkar](https://github.com/prathamxone) — INFT, Atharva College of Engineering*
*This document governs all `Exp-*/EXP-*_DOC.md` evaluation files in the Blockchain Lab repository.*

