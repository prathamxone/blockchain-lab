/**
 * DVote Frontend — useFreshness (System Freshness Polling Hook)
 *
 * Polls GET /api/v1/system/freshness on a visibility-aware cadence:
 *   - Document VISIBLE (active tab): every 15 000 ms (FRESHNESS_ACTIVE_TAB_MS)
 *   - Document HIDDEN (background tab): every 60 000 ms (FRESHNESS_BACKGROUND_TAB_MS)
 *   - visibilitychange → "visible": immediate re-fetch (focus refetch)
 *
 * Writes results to freshness-store for consumption by:
 *   - FreshnessBanner (visual layer)
 *   - useSensitiveActionGate (CDM-9 gate layer)
 *
 * Only polls when session is authenticated. On session clear: stops polling.
 *
 * CDM-9 compliance: The store state is the raw polled value.
 * useSensitiveActionGate applies the 5s debounce before gate decisions.
 *
 * Authority: FEATURE_FRONTEND §6.8, walkthrough Phase J, CDM-9
 */

import { useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/state/auth-store"
import { useFreshnessStore, type FreshnessMeta } from "@/state/freshness-store"
import { apiClient, ApiError } from "@/lib/api-client"
import {
  FRESHNESS_ACTIVE_TAB_MS,
  FRESHNESS_BACKGROUND_TAB_MS,
} from "@/config/polling"

// ─── useFreshness hook ────────────────────────────────────────────────────────

/**
 * System freshness polling hook.
 * Mount once in FreshnessWatcher (providers.tsx).
 * Must be inside authenticated provider scope.
 */
export function useFreshness(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setFreshness = useFreshnessStore((s) => s.setFreshness)
  const setFreshnessLoading = useFreshnessStore((s) => s.setFreshnessLoading)
  const clearFreshness = useFreshnessStore((s) => s.clearFreshness)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFetchingRef = useRef(false)

  // ── Core fetch ─────────────────────────────────────────────────────────────

  const fetchFreshness = useCallback(async () => {
    if (isFetchingRef.current) return // Prevent concurrent in-flight requests
    isFetchingRef.current = true
    setFreshnessLoading(true)

    try {
      const data = await apiClient.get<FreshnessMeta>("/system/freshness")
      setFreshness(data)
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) {
        // Session expired — freshness is moot; stop polling
        clearFreshness()
        return
      }
      // Network / server error: loading cleared but state preserved
      // to prevent flapping to null during transient errors
      useFreshnessStore.getState().setFreshnessLoading(false)
    } finally {
      isFetchingRef.current = false
    }
  }, [setFreshness, setFreshnessLoading, clearFreshness])

  // ── Helper: get interval for current tab visibility ────────────────────────

  const getInterval = useCallback((): number => {
    return document.hidden
      ? FRESHNESS_BACKGROUND_TAB_MS
      : FRESHNESS_ACTIVE_TAB_MS
  }, [])

  // ── Helper: start / restart polling interval ───────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      void fetchFreshness()
    }, getInterval())
  }, [fetchFreshness, getInterval])

  // ── Effect 1: Start/stop polling based on session ──────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      // Session cleared → stop polling + clear state
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearFreshness()
      return
    }

    // Session active → fetch immediately then start interval
    void fetchFreshness()
    startPolling()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps
  // fetchFreshness + startPolling are stable useCallback refs — excluded intentionally

  // ── Effect 2: Visibility change → adjust polling cadence ──────────────────
  // When tab becomes visible: fetch immediately + restart with active cadence.
  // When tab becomes hidden: restart with background cadence.

  useEffect(() => {
    if (!isAuthenticated) return

    const onVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch immediately on focus return
        void fetchFreshness()
      }
      // Restart interval with new cadence for current visibility
      startPolling()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [isAuthenticated, fetchFreshness, startPolling])
}
