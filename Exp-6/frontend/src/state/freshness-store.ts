/**
 * DVote Frontend — Freshness Store (Zustand)
 *
 * Holds the backend-authoritative system freshness state polled from
 * GET /api/v1/system/freshness.
 *
 * The 3 freshness states (FEATURE_BACKEND freshness.ts contract):
 *   - "fresh"     → synced within 30s — all actions permitted
 *   - "stale"     → synced within 120s — warn only, actions still permitted
 *   - "degraded"  → beyond 120s or no sync — BLOCKS vote cast, KYC submit,
 *                    escalation execute (CDM-9)
 *
 * null = not yet fetched (hydrating after login)
 *
 * IMPORTANT: `degraded` is NOT cosmetic. It MUST gate sensitive actions.
 * The gate is applied via useSensitiveActionGate with a 5s debounce (CDM-9).
 *
 * Authority: FEATURE_FRONTEND §6.8, FEATURE_BACKEND §5.6, walkthrough Phase J
 */

import { create } from "zustand"

// ─── Freshness state type ─────────────────────────────────────────────────────

/**
 * Backend-authoritative freshness states.
 * Mirrors backend FreshnessState in lib/freshness.ts.
 */
export type FreshnessState = "fresh" | "stale" | "degraded"

/**
 * Mirrors backend FreshnessMeta response from GET /api/v1/system/freshness.
 * Wrapped inside the standard { ok, data, requestId } envelope.
 */
export interface FreshnessMeta {
  /** ISO-8601 timestamp of last chain sync. null if never synced. */
  lastSyncedAt: string | null
  /** Backend-recommended next poll interval in seconds (advisory only). */
  nextPollAfterSec: number
  /** Current freshness state — authoritative for gate decisions. */
  freshnessState: FreshnessState
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface FreshnessStoreState {
  /**
   * Current freshness state from backend.
   * null = not yet fetched (session just started).
   */
  freshnessState: FreshnessState | null

  /** Full freshness meta from last successful poll. null before first poll. */
  freshnessMeta: FreshnessMeta | null

  /** True while GET /api/v1/system/freshness is in-flight. */
  isFreshnessLoading: boolean

  /** Timestamp (Date.now ms) of last successful poll. */
  lastFreshnessPollAt: number | null
}

interface FreshnessStoreActions {
  /** Write the result of a successful freshness poll. */
  setFreshness: (meta: FreshnessMeta) => void
  /** Set loading flag. */
  setFreshnessLoading: (loading: boolean) => void
  /**
   * Clear freshness state on session clear.
   * Called by DisconnectWatcher or auth-store.clearSession.
   */
  clearFreshness: () => void
}

type FreshnessStore = FreshnessStoreState & FreshnessStoreActions

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useFreshnessStore = create<FreshnessStore>((set) => ({
  // Initial state — not fetched yet
  freshnessState: null,
  freshnessMeta: null,
  isFreshnessLoading: false,
  lastFreshnessPollAt: null,

  setFreshness: (meta) =>
    set({
      freshnessState: meta.freshnessState,
      freshnessMeta: meta,
      isFreshnessLoading: false,
      lastFreshnessPollAt: Date.now(),
    }),

  setFreshnessLoading: (loading) => set({ isFreshnessLoading: loading }),

  clearFreshness: () =>
    set({
      freshnessState: null,
      freshnessMeta: null,
      isFreshnessLoading: false,
      lastFreshnessPollAt: null,
    }),
}))

// ─── Stable imperative accessor ───────────────────────────────────────────────

/** Returns current freshness state without subscription. */
export const getFreshnessState = (): FreshnessState | null =>
  useFreshnessStore.getState().freshnessState
