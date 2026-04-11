/**
 * DVote Frontend — Wagmi + RainbowKit Configuration
 *
 * Configures the wagmi client with MetaMask, WalletConnect, Coinbase Wallet,
 * and Rainbow connectors targeting the Sepolia testnet (chainId 11155111).
 *
 * Key decisions:
 * - wagmi@2 pinned: RainbowKit v2 has no wagmi v3 support (GH #2626).
 * - getDefaultConfig() is the RainbowKit v2 API — replaces createConfig + getDefaultWallets.
 * - EOA-only: contract wallet (ERC-1271) login is explicitly NOT supported in MVP.
 *   (ERC-1271 is used only for Foundry KYC attestation scope, not frontend session login.)
 *
 * Authority: EXP-6_FRONTEND_PLAN §2.1 + FEATURE_FRONTEND §6.3 + walkthrough L-A1
 */

import { http } from "wagmi"
import { sepolia } from "wagmi/chains"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { env } from "./env"

export const wagmiConfig = getDefaultConfig({
  appName: "DVote — A Decentralized Serverless Voting System",
  projectId: env.walletConnectProjectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  // SSR: false — this is a client-only Vite SPA
  ssr: false,
})

// ─── Chain constants used in guard and auth logic ─────────────────────────────

export const TARGET_CHAIN_ID = sepolia.id // 11155111
export const TARGET_CHAIN_NAME = sepolia.name // "Sepolia"
