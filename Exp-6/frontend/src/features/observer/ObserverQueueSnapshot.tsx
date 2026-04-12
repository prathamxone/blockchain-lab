/**
 * DVote Frontend — ObserverQueueSnapshot (CDM-12)
 *
 * Aggregate-only status distribution widget for Observer role.
 * Displays KYC submission counts per status category (QUEUED,
 * UNDER_REVIEW, APPROVED, REJECTED, NEEDS_RESUBMISSION) for a
 * given election context.
 *
 * CRITICAL CDM-12 CONSTRAINT:
 *   This component renders ONLY aggregate counts.
 *   NO individual submission rows are shown.
 *   NO identity-linked data (submissionId, wallet, aadhaar, etc.) is rendered.
 *   maskObserverResponse() is applied to every API response before render.
 *
 * API: GET /observer/kyc/stats?electionId={id}
 *   Returns: { stats: { QUEUED: n, UNDER_REVIEW: n, APPROVED: n, REJECTED: n,
 *                        NEEDS_RESUBMISSION: n, total: n } }
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useEffect, useState } from "react"
import { Users2, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient, ApiError } from "@/lib/api-client"
import { maskObserverResponse } from "@/lib/format/observer-mask"

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Raw aggregate stats shape from backend.
 * CDM-12: Only aggregate counts — no identity-linked rows.
 */
interface ObserverKycStats {
  QUEUED?: number
  UNDER_REVIEW?: number
  APPROVED?: number
  REJECTED?: number
  NEEDS_RESUBMISSION?: number
  total?: number
}

interface ObserverStatsResponse {
  stats: ObserverKycStats
}

// ─── Stat card config ───────────────────────────────────────────────────────

const STAT_CARDS: Array<{
  key: keyof ObserverKycStats
  label: string
  className: string
}> = [
  {
    key: "QUEUED",
    label: "Queued",
    className: "bg-slate-50 border-slate-200 text-slate-700",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
    className: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "APPROVED",
    label: "Approved",
    className: "bg-green-50 border-green-200 text-green-700",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    className: "bg-red-50 border-red-200 text-red-700",
  },
  {
    key: "NEEDS_RESUBMISSION",
    label: "Resubmission Requested",
    className: "bg-amber-50 border-amber-200 text-amber-700",
  },
]

// ─── ObserverQueueSnapshot component ───────────────────────────────────────────

export interface ObserverQueueSnapshotProps {
  electionId: string | null
}

/**
 * Aggregate-only KYC stats widget for observer surfaces.
 * Strictly enforces CDM-12 — no identity-linked rows rendered.
 */
export function ObserverQueueSnapshot({ electionId }: ObserverQueueSnapshotProps) {
  const [stats, setStats] = useState<ObserverKycStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!electionId) {
      setStats(null)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const raw = await apiClient.get<ObserverStatsResponse>(
          `/observer/kyc/stats?electionId=${encodeURIComponent(electionId!)}`
        )

        if (cancelled) return

        // CDM-12: Apply defensive masking before storing — strips any leaked fields
        const safeResponse = maskObserverResponse(raw as unknown as Record<string, unknown>)
        const safeStats = (safeResponse as unknown as ObserverStatsResponse).stats ?? {}

        setStats(safeStats)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to load stats. Please try again."
        setError(message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [electionId])

  // ── No election context ─────────────────────────────────────────────────────

  if (!electionId) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center">
        <Users2 className="size-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Select an election to view queue statistics.
        </p>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-4 h-20" />
        ))}
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
        <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>{error}</p>
      </div>
    )
  }

  // ── Aggregate stat cards ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Total */}
      {stats && (
        <div className="text-sm text-muted-foreground">
          Total submissions:{" "}
          <span className="font-semibold text-foreground">{stats.total ?? "—"}</span>
        </div>
      )}

      {/* Status count grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={cn(
              "rounded-lg border px-4 py-3 flex flex-col gap-1",
              card.className
            )}
          >
            <span className="text-2xl font-bold tabular-nums">
              {stats?.[card.key] ?? 0}
            </span>
            <span className="text-xs font-medium opacity-80">{card.label}</span>
          </div>
        ))}
      </div>

      {/* CDM-12 integrity notice */}
      <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
        <RefreshCw className="size-3" aria-hidden="true" />
        Aggregate counts only — no individual identity data shown (CDM-12)
      </p>
    </div>
  )
}
