/**
 * DVote Frontend — Polling Cadence Constants
 *
 * Central configuration for all backend polling intervals.
 * Applies to: useFreshness, useWalletGovernance, any future polling hooks.
 *
 * Cadence policy (FEATURE_FRONTEND §6.8, walkthrough Phase J):
 *   - ACTIVE_TAB:    15 000 ms (15s)   — document.visibilityState === "visible"
 *   - BACKGROUND_TAB: 60 000 ms (60s)  — document.visibilityState === "hidden"
 *   - FOCUS_REFETCH:  immediate on visibilitychange → "visible" (debounced)
 *
 * CDM-9 Freshness Flicker Policy:
 *   - FRESHNESS_DEBOUNCE_MS: 5 000 ms (5s)
 *   - Freshness gate changes are NOT applied until the new state
 *     has been stable for 5s. Prevents rapid gate flapping during
 *     intermittent connectivity transitions.
 *
 * Authority: FEATURE_FRONTEND §6.8, EXP-6_FRONTEND_PLAN §Phase 10 CDM-9
 */

// ─── Freshness polling cadence ────────────────────────────────────────────────

/** Poll GET /api/v1/system/freshness when the document tab is visible. */
export const FRESHNESS_ACTIVE_TAB_MS = 15_000

/** Poll GET /api/v1/system/freshness when the document tab is hidden. */
export const FRESHNESS_BACKGROUND_TAB_MS = 60_000

/**
 * Debounce window for freshness-driven sensitive action gating.
 * A gate change (fresh → degraded or degraded → fresh) is not applied
 * until the new state has been stable for this many milliseconds.
 * Prevents gate flapping during intermittent connectivity transitions (CDM-9).
 */
export const FRESHNESS_GATE_DEBOUNCE_MS = 5_000

// ─── Governance polling cadence ───────────────────────────────────────────────

/** Poll GET /api/v1/wallet/status when no governance lock is active. */
export const GOVERNANCE_POLL_INTERVAL_MS = 60_000

// ─── Session polling cadence ──────────────────────────────────────────────────

/** Proactive access token refresh — trigger this many seconds before expiry. */
export const TOKEN_REFRESH_BEFORE_EXPIRY_S = 60

/** Inactivity timeout for session auto-clear (30 minutes in ms). */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1_000
