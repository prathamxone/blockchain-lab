/**
 * DVote Frontend — useInactivityTimer
 *
 * 30-minute idle timeout. When the user has been inactive for 30 minutes
 * without any interaction, the session is cleared and the user is redirected
 * to /login?returnTo=<current-path> (Policy L-B1).
 *
 * Activity events tracked:
 *   - pointermove / pointerdown   (mouse + touch)
 *   - keydown                     (keyboard)
 *   - scroll                      (passive)
 *   - touchstart                  (mobile)
 *   - visibilitychange            (tab refocus resets timer)
 *
 * Implementation notes:
 *   - Uses a single debounced activity timestamp (Date.now()) — not setInterval ticking
 *   - Checks expiry on a 1-minute polling interval (not per-event) to minimize overhead
 *   - Timer is paused while page is hidden (visibilitychange)
 *   - On timeout: clearSession() → redirect to /login?returnTo=<path>
 *
 * CDM-7 (Non-negotiable):
 *   After redirect-to-login, the returnTo param only restores the URL.
 *   The caller of this hook must NOT auto-submit any mutations after re-auth.
 *
 * This hook must only be mounted when the session is authenticated.
 * Wire it in AppShell.tsx which is rendered only for the /_authenticated route group.
 *
 * Authority: FEATURE_FRONTEND §6.4, walkthrough Phase H §2
 */

import { useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/state/auth-store"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Idle timeout duration: 30 minutes in milliseconds */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 min

/** Polling interval to check for timeout expiry: check every 60 seconds */
const CHECK_INTERVAL_MS = 60 * 1000 // 1 min

// ─── Activity event list ──────────────────────────────────────────────────────

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "visibilitychange",
] as const

// ─── useInactivityTimer hook ──────────────────────────────────────────────────

/**
 * 30-minute idle timeout hook.
 * Must be mounted only when user is authenticated (inside /_authenticated layout).
 * Clears session and redirects to /login?returnTo=<path> on timeout.
 */
export function useInactivityTimer(): void {
  const clearSession = useAuthStore((s) => s.clearSession)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Track the last activity timestamp in a ref (not state — no re-render needed)
  const lastActivityRef = useRef<number>(Date.now())

  /** Resets the inactivity timer to now. Called on every activity event. */
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    // Only run the timer when the user is authenticated
    if (!isAuthenticated) return

    // ── Register activity event listeners ──────────────────────────────────
    const options: AddEventListenerOptions = { passive: true }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, options)
    }

    // ── Polling interval: check if timeout has expired ─────────────────────
    const intervalId = setInterval(() => {
      // Pause while the page is hidden (user switched tabs)
      if (document.hidden) return

      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Timeout: clear session and redirect to re-auth with returnTo
        clearSession()

        const returnTo = encodeURIComponent(
          window.location.pathname + window.location.search,
        )
        // Hard redirect — we're above the router in some contexts,
        // and we need a full navigation to trigger route guards.
        window.location.replace(`/login?returnTo=${returnTo}`)
      }
    }, CHECK_INTERVAL_MS)

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      clearInterval(intervalId)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer, options)
      }
    }
  }, [isAuthenticated, clearSession, resetTimer])
}
