/**
 * DVote Frontend — OwnerQueuePage (Admin KYC Review Queue)
 *
 * Owner-only page at /admin/kyc-queue that renders the KYC submission
 * review queue for a given election context.
 *
 * Features:
 *   - Reads electionId from URL search params (required context).
 *   - Cursor-first pagination via usePaginatedList hook with offset fallback.
 *   - Status filter via URL search params (synced with validateKycQueueSearch).
 *   - Density toggle: compact (dense) / default card layout.
 *   - KycDecisionModal for focused decision capture.
 *   - Role guard: redirects any non-Owner to their home page.
 *
 * Calling convention for GET /owner/kyc/queue:
 *   GET /owner/kyc/queue?electionId={id}&status={filter}&limit=20&offset=0
 *   Returns: { items: KycQueueItem[], pagination: { limit, offset } }
 *
 * Note: electionId is REQUIRED. Without it, the page shows a contextual
 * advisory to navigate from an election page.
 *
 * Tab title: "DVote - KYC Review Queue"
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useState, useCallback, useMemo } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { Users, LayoutList, Rows, Sliders, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useAuthStore } from "@/state/auth-store"
import { usePaginatedList } from "@/hooks/usePaginatedList"
import { KycReviewCard, type KycQueueItem } from "./KycReviewCard"
import { KycDecisionModal } from "./KycDecisionModal"
import type { KycStatusFilter } from "@/lib/url-state"

// ─── Status filter tabs ─────────────────────────────────────────────────────

const STATUS_TABS: Array<{ value: KycStatusFilter | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "UnderReview", label: "Under Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "ResubmissionRequired", label: "Resubmit" },
]

// Map frontend filter tab values to backend KycStatus values
const STATUS_FILTER_MAP: Record<KycStatusFilter, string> = {
  Pending: "QUEUED",
  UnderReview: "UNDER_REVIEW",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  ResubmissionRequired: "NEEDS_RESUBMISSION",
}


// ─── OwnerQueuePage component ─────────────────────────────────────────────────

/**
 * Admin KYC review queue — Owner role only.
 */
export function OwnerQueuePage() {
  useDocumentTitle("DVote - KYC Review Queue")

  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()

  // Read URL search params
  const search = useSearch({ strict: false }) as {
    electionId?: string
    status?: KycStatusFilter
    page?: number
    limit?: number
  }
  const electionId = search?.electionId ?? null
  const activeStatusFilter: KycStatusFilter | "all" = search?.status ?? "all"

  // Density toggle state
  const [isDense, setIsDense] = useState(false)

  // Decision modal state
  const [modalItem, setModalItem] = useState<KycQueueItem | null>(null)

  // ── Build static query params for usePaginatedList ──────────────────────────

  const queueParams = useMemo(() => {
    if (!electionId) return null
    const params: Record<string, string> = { electionId }
    if (activeStatusFilter !== "all") {
      params.status = STATUS_FILTER_MAP[activeStatusFilter as KycStatusFilter]
    }
    return params
  }, [electionId, activeStatusFilter])

  // ── Paginated data fetch ─────────────────────────────────────────────────────

  const {
    items: queueItems,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset: refetchQueue,
  } = usePaginatedList<KycQueueItem>(
    "/owner/kyc/queue",
    {
      limit: 20,
      params: queueParams ?? {},
    }
  )

  // ── Decision success handler ──────────────────────────────────────────────────

  const handleDecisionSuccess = useCallback(
    () => {
      setModalItem(null)
      // Refetch from page 1 to reflect updated state
      refetchQueue()
    },
    [refetchQueue]
  )

  // ── Status filter handler ─────────────────────────────────────────────────────

  const handleStatusFilter = useCallback(
    (status: KycStatusFilter | "all") => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          status: status === "all" ? undefined : status,
          page: 1,
        }),
      } as Parameters<typeof navigate>[0])
    },
    [navigate]
  )

  // ── Role guard ───────────────────────────────────────────────────────────────

  if (!role) return null
  if (role !== "Owner") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="size-10 text-destructive mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page is only accessible to the Owner role.
        </p>
      </div>
    )
  }

  // ── No election context ───────────────────────────────────────────────────────

  if (!electionId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-foreground">KYC Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Navigate from an election page to load the review queue for a specific
          election context. The queue requires an <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">electionId</code> parameter.
        </p>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KYC Review Queue</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Election: {electionId.slice(0, 16)}…
          </p>
        </div>

        {/* Toolbar: density toggle + refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            id="queue-density-toggle"
            variant="ghost"
            size="sm"
            title={isDense ? "Switch to default layout" : "Switch to compact layout"}
            onClick={() => setIsDense((v) => !v)}
          >
            {isDense ? (
              <Rows className="size-4" aria-hidden="true" />
            ) : (
              <LayoutList className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            id="queue-refresh"
            variant="ghost"
            size="sm"
            title="Refresh queue"
            onClick={() => refetchQueue()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Queue status filter">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`queue-filter-${tab.value}`}
            role="tab"
            aria-selected={activeStatusFilter === tab.value}
            onClick={() => handleStatusFilter(tab.value as KycStatusFilter | "all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeStatusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && queueItems.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border bg-card px-4 py-4 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted/60" />
              </div>
              <div className="h-3 w-48 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && queueItems.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
          <Sliders className="size-8 text-muted-foreground/40 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No submissions in queue.</p>
          {activeStatusFilter !== "all" && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try clearing the status filter to see all submissions.
            </p>
          )}
        </div>
      )}

      {/* Queue cards */}
      {queueItems.length > 0 && (
        <div className="space-y-3">
          {queueItems.map((item) => (
            <KycReviewCard
              key={item.queueId}
              item={item}
              dense={isDense}
              onDecisionSuccess={handleDecisionSuccess}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <Button
            id="queue-load-more"
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {isLoading && queueItems.length > 0 && (
        <div className="flex justify-center py-2">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      {/* Decision modal */}
      {modalItem && (
        <KycDecisionModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onDecisionSuccess={handleDecisionSuccess}
        />
      )}
    </div>
  )
}
