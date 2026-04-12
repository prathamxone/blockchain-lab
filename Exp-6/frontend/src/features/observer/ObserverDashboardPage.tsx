/**
 * DVote Frontend — ObserverDashboardPage
 *
 * Observer role home page at /observer.
 * Displays aggregate-only views of KYC queue statistics.
 * No identity-linked rows are ever rendered (CDM-12).
 *
 * UI:
 *   - Tab title: "DVote - Observer Dashboard"
 *   - Election context selector (reads ?electionId from URL or shows picker)
 *   - ObserverQueueSnapshot: aggregate counts per KYC status
 *   - Link to /observer/anomalies for anomaly list
 *   - Role guard: non-Observer gets access denied card
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useSearch } from "@tanstack/react-router"
import { ShieldOff, ChevronRight } from "lucide-react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useAuthStore } from "@/state/auth-store"
import { ObserverQueueSnapshot } from "./ObserverQueueSnapshot"

// ─── ObserverDashboardPage ─────────────────────────────────────────────────────

export function ObserverDashboardPage() {
  useDocumentTitle("DVote - Observer Dashboard")

  const role = useAuthStore((s) => s.role)

  const search = useSearch({ strict: false }) as { electionId?: string }
  const electionId = search?.electionId ?? null

  // ── Role guard ────────────────────────────────────────────────────────────────

  if (!role) return null

  if (role !== "Observer") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <ShieldOff className="size-10 text-destructive mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page is only accessible to the Observer role.
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 px-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Observer Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregate KYC submission statistics and system health — read-only view.
        </p>
      </div>

      {/* Election context indicator */}
      {electionId ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Election Context</p>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {electionId}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            No election context. Navigate from an election page to view contextual statistics.
            Showing global aggregate view below.
          </p>
        </div>
      )}

      {/* KYC Queue Snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">KYC Queue Statistics</h2>
          <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
            CDM-12 · Aggregate only
          </span>
        </div>
        <ObserverQueueSnapshot electionId={electionId} />
      </section>

      {/* Anomaly reports link */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Anomaly Reports</h2>
        <a
          id="observer-anomalies-link"
          href={`/observer/anomalies${electionId ? `?electionId=${electionId}` : ""}`}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors group"
        >
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
              View Anomaly Reports
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregate-only anomaly detection · No identity data
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </a>
      </section>
    </div>
  )
}
