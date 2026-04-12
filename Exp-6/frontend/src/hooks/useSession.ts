/**
 * DVote Frontend — useSession (Startup Hydration Hook)
 *
 * Restores an existing session on app startup by attempting:
 *   1. POST /auth/refresh (uses HttpOnly refresh cookie automatically via credentials:include)
 *      → If ok: receives new accessToken + sets it in store
 *   2. GET /auth/me (with the new accessToken)
 *      → If ok: resolves role/walletAddress → calls setSession
 *      → If fail: calls clearSession (no valid session)
 *   3. Always calls setHydrated() so router guards unblock.
 *
 * SECURITY:
 *   - Access token NEVER persisted to localStorage/sessionStorage (L-B1)
 *   - Refresh cookie is HttpOnly — browser sends it automatically; we never read it
 *   - If refresh fails (cookie expired / server rejects), session stays null → login required
 *
 * CDM-7 (Non-negotiable):
 *   - After re-auth restore, ONLY the URL (returnTo) is restored.
 *   - NEVER auto-submit pending KYC or vote mutations.
 *   - Explicit user re-confirmation required before sensitive actions.
 *
 * This hook is called once from SessionHydrator in providers.tsx.
 * It is NOT a polling hook — startup only. Token refresh polling = useTokenRefresh.
 *
 * Authority: FEATURE_FRONTEND §6.3, walkthrough Phase H §1
 */

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/state/auth-store"
import { apiClient } from "@/lib/api-client"
import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Backend response shapes ──────────────────────────────────────────────────

interface RefreshResponse {
  /** New access token returned by POST /auth/refresh */
  accessToken: string
  /**
   * Seconds until the NEW access token expires.
   * Used by useTokenRefresh to schedule proactive refresh.
   * Stored in module-level ref for cross-hook access.
   */
  expiresIn: number
}

interface AuthMeResponse {
  walletAddress: string
  role: DVoteRole
  sessionId: string
}

// ─── Module-level expiry tracker ─────────────────────────────────────────────
// Shared with useTokenRefresh so it knows when to schedule next refresh.
// Uses Date.now()-based absolute timestamp, not relative seconds.

let _accessTokenExpiresAt: number | null = null

/** Returns the absolute timestamp (ms) when current access token expires. */
export function getAccessTokenExpiresAt(): number | null {
  return _accessTokenExpiresAt
}

/** Updates the expiry timestamp. Called after every successful refresh. */
export function setAccessTokenExpiresAt(expiresAtMs: number): void {
  _accessTokenExpiresAt = expiresAtMs
}

// ─── useSession hook ──────────────────────────────────────────────────────────

/**
 * Startup session hydration.
 * Mount once inside SessionHydrator (providers.tsx).
 * Sets isHydrated = true regardless of outcome so router guards unblock.
 */
export function useSession(): void {
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)
  const setHydrated = useAuthStore((s) => s.setHydrated)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  // Guard against double-run in StrictMode dev (React mounts twice in strict mode)
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Already hydrated (e.g., Strict Mode second mount) — skip
    if (hasRunRef.current || isHydrated) return
    hasRunRef.current = true

    async function hydrate() {
      try {
        // Step 1: Attempt silent token refresh using HttpOnly refresh cookie
        // credentials: "include" is set globally in api-client, cookie sent automatically.
        // skipAuth: true — no Bearer token yet (we're restoring the session)
        const refreshData = await apiClient.post<RefreshResponse>(
          "/auth/refresh",
          undefined,
          { skipAuth: true },
        )

        // Store expiry so useTokenRefresh can schedule next proactive refresh
        if (refreshData.expiresIn) {
          const expiresAtMs = Date.now() + refreshData.expiresIn * 1000
          setAccessTokenExpiresAt(expiresAtMs)
        }

        // Temporarily wire the new access token so the next call can authenticate
        // We use a local variable here — setSession below is the canonical store write.
        const newAccessToken = refreshData.accessToken

        // Step 2: Resolve role and session metadata
        const meData = await apiClient.get<AuthMeResponse>("/auth/me", {
          headers: { Authorization: `Bearer ${newAccessToken}` },
          skipAuth: true, // We pass token manually to avoid stale store state
        })

        // Step 3: Commit session to in-memory store
        setSession({
          accessToken: newAccessToken,
          sessionId: meData.sessionId,
          role: meData.role,
          walletAddress: meData.walletAddress,
        })
      } catch {
        // Refresh failed (cookie expired, family revoked, network error, etc.)
        // Clear any stale state and let user log in again.
        clearSession()
        _accessTokenExpiresAt = null
      } finally {
        // Always unblock router guards — hydration is complete regardless of outcome
        setHydrated()
      }
    }

    void hydrate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Deps intentionally empty — this runs once on mount only.
  // Store actions are stable Zustand references (don't change between renders).
}
