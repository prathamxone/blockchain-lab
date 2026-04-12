/**
 * DVote Frontend — Wallet Governance Store (Zustand)
 *
 * Holds the backend-authenticated wallet governance lock state for the
 * currently authenticated session.
 *
 * Authority: FEATURE_BACKEND §9.5, FEATURE_FRONTEND §6.5–6.6, walkthrough Phase I
 *
 * The 4 governance states (backend-authoritative — NEVER inferred from frontend):
 *   - WalletMismatchLocked              → hard lock; full route block required
 *   - WalletSwitchPendingApproval       → limited shell; pending admin decision
 *   - WalletSwitchApprovedAwaitingOnChainRebind → wait for on-chain rebind
 *   - WalletSwitchRejected              → rejection; retry/support path
 *
 * Polling: useWalletGovernance (Phase I) calls GET /api/v1/wallet/status on mount
 * and on wagmi account change, writing results here.
 *
 * null = not yet fetched (or session cleared)
 * "none" = active session, no governance lock (happy path)
 *
 * SECURITY: governance state must NEVER be read from JWT claims.
 *           Always sourced from GET /api/v1/wallet/status response.
 */

import { create } from "zustand"

// ─── Governance state type ────────────────────────────────────────────────────

/**
 * Backend-authoritative governance lock states.
 * Mirrors FEATURE_BACKEND §9.5 and FEATURE_FRONTEND §6.6.
 */
export type WalletGovernanceState =
  | "none"                                   // No governance lock — happy path
  | "WalletMismatchLocked"                   // Hard lock; full route block
  | "WalletSwitchPendingApproval"            // Admin decision pending
  | "WalletSwitchApprovedAwaitingOnChainRebind" // Waiting for on-chain rebind
  | "WalletSwitchRejected"                   // Rejected; retry/support path

/**
 * True when governance state is any hard/soft lock variant.
 * Used by router beforeLoad guard to decide redirect.
 */
export const GOVERNANCE_LOCKED_STATES: WalletGovernanceState[] = [
  "WalletMismatchLocked",
  "WalletSwitchPendingApproval",
  "WalletSwitchApprovedAwaitingOnChainRebind",
  "WalletSwitchRejected",
]

export function isGovernanceLocked(state: WalletGovernanceState | null): boolean {
  if (state === null) return false
  return GOVERNANCE_LOCKED_STATES.includes(state)
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface GovernanceStoreState {
  /**
   * Current wallet governance state.
   * null  = not yet fetched (hydrating)
   * "none" = no lock (happy path)
   */
  governanceState: WalletGovernanceState | null

  /**
   * True while GET /api/v1/wallet/status is in-flight.
   * Used to show skeletons vs. lock banners vs. no-lock content.
   */
  isGovernanceLoading: boolean

  /**
   * Last successful poll timestamp (Date.now ms).
   * null before first successful poll.
   */
  lastCheckedAt: number | null
}

interface GovernanceStoreActions {
  /** Set the governance state after a successful poll. */
  setGovernanceState: (state: WalletGovernanceState) => void
  /** Set loading flag (true = poll in progress). */
  setGovernanceLoading: (loading: boolean) => void
  /**
   * Clear governance state on session clear.
   * Called by auth-store.clearSession or wallet disconnect.
   */
  clearGovernanceState: () => void
}

type GovernanceStore = GovernanceStoreState & GovernanceStoreActions

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useGovernanceStore = create<GovernanceStore>((set) => ({
  // Initial state — not fetched yet
  governanceState: null,
  isGovernanceLoading: false,
  lastCheckedAt: null,

  setGovernanceState: (state) =>
    set({
      governanceState: state,
      isGovernanceLoading: false,
      lastCheckedAt: Date.now(),
    }),

  setGovernanceLoading: (loading) => set({ isGovernanceLoading: loading }),

  clearGovernanceState: () =>
    set({
      governanceState: null,
      isGovernanceLoading: false,
      lastCheckedAt: null,
    }),
}))

// ─── Stable selectors ─────────────────────────────────────────────────────────

/** Returns current governance state without reactivity subscription. */
export const getGovernanceState = (): WalletGovernanceState | null =>
  useGovernanceStore.getState().governanceState
