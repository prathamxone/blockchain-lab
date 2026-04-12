/**
 * DVote Frontend — useTokenRefresh (Proactive Silent Refresh)
 *
 * Proactively refreshes the access token 60 seconds BEFORE it expires,
 * so authenticated API calls never hit an unnecessary 401.
 *
 * Also serves as the 401 interceptor callback:
 *   wireUnauthorizedHandler() is called once from this hook to register
 *   a refresh-on-401 handler with the api-client.
 *
 * Refresh strategy:
 *   1. On mount, read the accessToken expiry from getAccessTokenExpiresAt().
 *   2. Schedule a timeout to fire REFRESH_BEFORE_EXPIRY_S seconds before expiry.
 *   3. On fire: call POST /auth/refresh → update token in store → reschedule.
 *   4. On 401 from any API call: api-client fires wireUnauthorizedHandler callback
 *      → attempt one refresh → if fail: clearSession + redirect to login.
 *
 * Safety bounds:
 *   - Max 3 consecutive refresh failures before giving up and forcing re-login.
 *   - Prevents infinite loops on revoked refresh token families.
 *   - No refresh attempted when page is hidden (visibilitychange guard).
 *
 * CSRF:
 *   POST /auth/refresh requires x-csrf-token header.
 *   api-client.ts already handles this automatically for mutations.
 *
 * Authority: FEATURE_FRONTEND §6.3, walkthrough Phase H §3, BACKEND_HANDOFF_REPORT §5.1
 */

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/state/auth-store"
import { apiClient, wireUnauthorizedHandler } from "@/lib/api-client"
import {
  getAccessTokenExpiresAt,
  setAccessTokenExpiresAt,
} from "@/hooks/useSession"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Refresh this many seconds before access token expires */
const REFRESH_BEFORE_EXPIRY_S = 60

/** Maximum consecutive refresh failures before forcing re-login */
const MAX_REFRESH_FAILURES = 3

// ─── Backend refresh response shape ──────────────────────────────────────────

interface RefreshResponse {
  accessToken: string
  expiresIn: number // seconds
}

// ─── useTokenRefresh hook ─────────────────────────────────────────────────────

/**
 * Proactive silent refresh + 401 intercept handler.
 * Mount once in SessionHydrator (providers.tsx) after session is live.
 */
export function useTokenRefresh(): void {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const clearSession = useAuthStore((s) => s.clearSession)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Count consecutive refresh failures to guard against infinite loops
  const failureCountRef = useRef(0)

  // Reference to the scheduled timeout so we can cancel on unmount
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Core refresh function (also used by 401 handler) ──────────────────────

  const attemptRefresh = useRef(async (): Promise<void> => {
    // Safety: if page is hidden, skip proactive refresh (saves battery/network)
    // 401-triggered refreshes will still happen even if hidden.
    if (document.hidden) return

    try {
      const data = await apiClient.post<RefreshResponse>(
        "/auth/refresh",
        undefined,
        { skipAuth: true },
      )

      // Update in-memory access token
      setAccessToken(data.accessToken)

      // Update expiry tracker for next scheduled refresh
      const newExpiresAtMs = Date.now() + data.expiresIn * 1000
      setAccessTokenExpiresAt(newExpiresAtMs)

      // Reset failure counter on success
      failureCountRef.current = 0

      // Schedule next proactive refresh
      scheduleNextRefresh.current()
    } catch {
      failureCountRef.current += 1

      if (failureCountRef.current >= MAX_REFRESH_FAILURES) {
        // All refresh attempts exhausted → force re-login
        clearSession()
        const returnTo = encodeURIComponent(
          window.location.pathname + window.location.search,
        )
        window.location.replace(`/login?returnTo=${returnTo}`)
      }
      // Otherwise let next schedule attempt try again (transient network error)
    }
  })

  // ── Schedule next proactive refresh ──────────────────────────────────────

  const scheduleNextRefresh = useRef(() => {
    // Cancel any existing scheduled refresh
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const expiresAt = getAccessTokenExpiresAt()
    if (!expiresAt) return // No expiry info — skip scheduling

    const msUntilRefresh = expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_S * 1000

    if (msUntilRefresh <= 0) {
      // Already within the pre-refresh window — refresh immediately
      void attemptRefresh.current()
      return
    }

    timeoutRef.current = setTimeout(() => {
      void attemptRefresh.current()
    }, msUntilRefresh)
  })

  // ── Wire 401 interceptor in api-client ────────────────────────────────────
  // This registers the refresh callback once at mount time.
  // api-client fires it when any API call returns 401 UNAUTHORIZED.

  useEffect(() => {
    wireUnauthorizedHandler(async () => {
      // Reset failure count for 401-triggered refresh (separate retry budget)
      failureCountRef.current = 0
      await attemptRefresh.current()
    })

    // Cleanup on unmount: deregister handler (no-op wire)
    return () => {
      wireUnauthorizedHandler(async () => {})
    }
  }, [])

  // ── Schedule proactive refresh when authenticated ─────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      // Cancel scheduled refresh when session is cleared
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    scheduleNextRefresh.current()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isAuthenticated])
}
