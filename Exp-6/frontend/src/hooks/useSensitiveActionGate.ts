/**
 * DVote Frontend — useSensitiveActionGate (CDM-9 Freshness Gate)
 *
 * Returns { isBlocked, reason } for freshness-sensitive actions:
 *   - Vote cast
 *   - KYC submission
 *   - Escalation execution
 *
 * CDM-9 Freshness Flicker Policy:
 *   A 5-second debounce prevents gates from flapping during intermittent
 *   connectivity transitions. The gate remains "restrictive" (blocked) until
 *   the NEW state has been stable for FRESHNESS_GATE_DEBOUNCE_MS continuously.
 *
 * Gate logic:
 *   - null (not yet fetched)  → isBlocked = false  (benefit of doubt during hydration)
 *   - "fresh"                 → isBlocked = false
 *   - "stale"                 → isBlocked = false  (advisory only, banner shown)
 *   - "degraded"              → isBlocked = true   (with debounce — stays blocked
 *                               until "fresh" or "stale" is stable for 5s)
 *
 * Usage:
 *   const { isBlocked, reason } = useSensitiveActionGate()
 *   <Button disabled={isBlocked} title={isBlocked ? reason : undefined}>
 *     Cast Vote
 *   </Button>
 *
 * Authority: FEATURE_FRONTEND §6.8, walkthrough Phase J, CDM-9
 */

import { useState, useEffect, useRef } from "react"
import { useFreshnessStore } from "@/state/freshness-store"
import { FRESHNESS_GATE_DEBOUNCE_MS } from "@/config/polling"

// ─── Gate result ──────────────────────────────────────────────────────────────

export interface SensitiveActionGateResult {
  /**
   * When true: disable the sensitive action button/submit.
   * Represents a STABLE degraded state (debounce has elapsed).
   */
  isBlocked: boolean

  /**
   * Human-readable reason to show in a tooltip or ARIA description
   * when isBlocked is true.
   */
  reason: string
}

const GATE_UNBLOCKED: SensitiveActionGateResult = {
  isBlocked: false,
  reason: "",
}

const GATE_BLOCKED: SensitiveActionGateResult = {
  isBlocked: true,
  reason:
    "System sync is degraded. Vote cast, KYC submit, and escalation " +
    "execute are temporarily disabled to protect data integrity. " +
    "Please wait for the system to resync (check the status banner).",
}

// ─── useSensitiveActionGate hook ──────────────────────────────────────────────

/**
 * Returns the debounced gate state for freshness-sensitive actions (CDM-9).
 * The gate is "open" (isBlocked=false) during initial hydration (null state)
 * so action buttons are not flash-disabled on app startup before first poll.
 *
 * Once the first poll completes:
 *   - fresh / stale → gate open (no block)
 *   - degraded      → gate applies after 5s of stable degraded state
 *   - recovery      → gate lifts after 5s of stable non-degraded state
 */
export function useSensitiveActionGate(): SensitiveActionGateResult {
  const freshnessState = useFreshnessStore((s) => s.freshnessState)

  // "Stable" gate — only changes after FRESHNESS_GATE_DEBOUNCE_MS of new state
  const [stable, setStable] = useState<SensitiveActionGateResult>(GATE_UNBLOCKED)

  // Track the debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending debounce for the previous state
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Compute the "raw" gate result for the current freshness state
    const rawGate: SensitiveActionGateResult =
      freshnessState === "degraded" ? GATE_BLOCKED : GATE_UNBLOCKED

    if (rawGate.isBlocked === stable.isBlocked) {
      // State did not change — no debounce needed, no flicker
      return
    }

    // State changed — apply AFTER 5s of stability (CDM-9 flicker prevention)
    debounceRef.current = setTimeout(() => {
      setStable(rawGate)
    }, FRESHNESS_GATE_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshnessState])
  // stable excluded from deps — we compare .isBlocked against it without depending on the object

  return stable
}
