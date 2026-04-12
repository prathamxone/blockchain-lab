/**
 * DVote Frontend — Role Constants and Backend Role Mapping
 *
 * Backend role set (FROZEN for MVP — BACKEND_HANDOFF_REPORT §5.4):
 *   ADMIN | ECI | SRO | RO | OBSERVER | VOTER | CANDIDATE
 *
 * Frontend DVoteRole (sidebar/guards):
 *   Owner | Observer | Voter | Candidate
 *
 * Mapping:
 *   ADMIN  → Owner  (full admin access)
 *   ECI    → Owner  (Election Commission of India — full admin access)
 *   SRO    → Owner  (State Returning Officer — admin access)
 *   RO     → Owner  (Returning Officer — admin access)
 *   OBSERVER → Observer
 *   VOTER  → Voter
 *   CANDIDATE → Candidate
 *
 * This mapping is maintained here as the single source of truth.
 * Never derive the mapping inline in components or guards.
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.4, FEATURE_FRONTEND §7
 */

import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Backend role strings (exact enum from GET /auth/me response) ─────────────

export type BackendRole =
  | "ADMIN"
  | "ECI"
  | "SRO"
  | "RO"
  | "OBSERVER"
  | "VOTER"
  | "CANDIDATE"

// ─── Backend → Frontend role mapping ─────────────────────────────────────────

const BACKEND_TO_FRONTEND_ROLE: Record<BackendRole, DVoteRole> = {
  ADMIN:     "Owner",
  ECI:       "Owner",
  SRO:       "Owner",
  RO:        "Owner",
  OBSERVER:  "Observer",
  VOTER:     "Voter",
  CANDIDATE: "Candidate",
}

/**
 * Map a backend role string to the frontend DVoteRole.
 * Returns null if the role string is unrecognized — caller must handle.
 *
 * NEVER infer role from JWT claims — only call with value from GET /auth/me body.
 */
export function mapBackendRole(backendRole: string): DVoteRole | null {
  return (BACKEND_TO_FRONTEND_ROLE as Record<string, DVoteRole>)[backendRole] ?? null
}

// ─── Frontend role labels (for display) ──────────────────────────────────────

export const ROLE_DISPLAY_LABELS: Record<DVoteRole, string> = {
  Owner:     "Election Authority",
  Observer:  "Observer",
  Voter:     "Voter",
  Candidate: "Candidate",
}

// ─── Target chain ID (Sepolia) ────────────────────────────────────────────────

/** EVM chain ID for Sepolia testnet — the ONLY supported chain for DVote MVP. */
export const TARGET_CHAIN_ID = 11155111 as const

/** Sepolia chain name for display. */
export const TARGET_CHAIN_NAME = "Sepolia" as const

// ─── Contract wallet connector type IDs ──────────────────────────────────────
// Wagmi connector types that indicate a smart-contract/ERC-1271 wallet.
// EOA-only policy (CDM-5 / BACKEND_HANDOFF_REPORT §9.2 rule 6).

export const CONTRACT_WALLET_CONNECTOR_TYPES = [
  "safe",       // Gnosis Safe (most common contract wallet)
  "coinbaseSmart", // Coinbase Smart Wallet
] as const

export type ContractWalletConnectorType = typeof CONTRACT_WALLET_CONNECTOR_TYPES[number]

/**
 * Returns true if the connector type indicates a contract wallet.
 * Contract wallets are NOT supported for login in MVP.
 */
export function isContractWalletConnector(connectorType: string | undefined): boolean {
  if (!connectorType) return false
  return (CONTRACT_WALLET_CONNECTOR_TYPES as readonly string[]).includes(connectorType)
}
