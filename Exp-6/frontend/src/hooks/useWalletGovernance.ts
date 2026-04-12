/**
 * DVote Frontend — useWalletGovernance (Governance Status Polling Hook)
 *
 * Polls GET /api/v1/wallet/status:
 *   1. On initial mount (once the session is authenticated)
 *   2. On wagmi wallet account change (address switch triggers re-check)
 *
 * Writes results into the governance-store for consumption by:
 *   - WalletLockBanner (component-level visual gate)
 *   - Router beforeLoad guard (route-level hard gate)
 *   - AppShell (banner slot)
 *
 * Polling interval: 60 seconds when authenticated + no lock.
 * On lock state detected: stop background polling (user must act).
 * On session clear: stop polling and clear governance state.
 *
 * Security: governance state is NEVER derived from frontend claims.
 *           Sourced exclusively from backend-authenticated endpoint.
 *
 * Authority: FEATURE_FRONTEND §6.5–6.6, FEATURE_BACKEND §9.5,
 *            walkthrough Phase I §1
 */

import { useEffect, useRef, useCallback } from "react"
import { useAccount } from "wagmi"
import { useAuthStore } from "@/state/auth-store"
import { useGovernanceStore, type WalletGovernanceState } from "@/state/governance-store"
import { apiClient, ApiError } from "@/lib/api-client"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Background polling interval when no lock is active */
const POLL_INTERVAL_MS = 60 * 1000 // 60 seconds

// ─── Backend response shape ───────────────────────────────────────────────────

interface WalletStatusResponse {
  /**
   * Backend-authoritative governance state.
   * Maps 1:1 to WalletGovernanceState union in governance-store.ts.
   */
  governanceState: WalletGovernanceState
  /** Wallet address the governance check was performed for. */
  walletAddress: string
}

// ─── useWalletGovernance hook ─────────────────────────────────────────────────

/**
 * Wallet governance status polling hook.
 * Mount once in GovernanceWatcher (providers.tsx).
 */
export function useWalletGovernance(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { address: connectedAddress } = useAccount()

  const setGovernanceState = useGovernanceStore((s) => s.setGovernanceState)
  const setGovernanceLoading = useGovernanceStore((s) => s.setGovernanceLoading)
  const clearGovernanceState = useGovernanceStore((s) => s.clearGovernanceState)
  const governanceState = useGovernanceStore((s) => s.governanceState)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFetchingRef = useRef(false)

  // ── Core fetch function ───────────────────────────────────────────────────

  const fetchGovernanceStatus = useCallback(async () => {
    if (isFetchingRef.current) return // Prevent concurrent requests
    isFetchingRef.current = true
    setGovernanceLoading(true)

    try {
      const data = await apiClient.get<WalletStatusResponse>("/wallet/status")
      setGovernanceState(data.governanceState)
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) {
        // Session expired — governance state is moot; auth-store handles this
        clearGovernanceState()
        return
      }
      // Network or server error: preserve last known state (don't flap to null)
      // Loading flag cleared so UI doesn't show a spinner indefinitely
      useGovernanceStore.getState().setGovernanceLoading(false)
    } finally {
      isFetchingRef.current = false
    }
  }, [setGovernanceState, setGovernanceLoading, clearGovernanceState])

  // ── Effect 1: React to session changes ───────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      // Session cleared → stop polling + clear governance state
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      clearGovernanceState()
      return
    }

    // Session just became active → fetch immediately
    void fetchGovernanceStatus()

    // Background polling only when there is NO active lock
    // (once locked, user must act before any further automatic checks)
    if (governanceState === "none" || governanceState === null) {
      pollIntervalRef.current = setInterval(() => {
        void fetchGovernanceStatus()
      }, POLL_INTERVAL_MS)
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps
  // fetchGovernanceStatus is stable (useCallback) — not listed as dep to avoid restarting
  // the interval on every render; isAuthenticated is the only trigger.

  // ── Effect 2: React to wallet account change ─────────────────────────────
  // On wagmi account switch: re-check governance immediately.

  const prevAddressRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const prev = prevAddressRef.current
    prevAddressRef.current = connectedAddress

    // Only re-check if address CHANGED and session is still active
    if (prev !== undefined && prev !== connectedAddress && isAuthenticated) {
      // Cancel in-flight poll
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      // Fetch immediately for new address
      void fetchGovernanceStatus()
      // Restart interval
      pollIntervalRef.current = setInterval(() => {
        void fetchGovernanceStatus()
      }, POLL_INTERVAL_MS)
    }
  }, [connectedAddress, isAuthenticated, fetchGovernanceStatus])
}
