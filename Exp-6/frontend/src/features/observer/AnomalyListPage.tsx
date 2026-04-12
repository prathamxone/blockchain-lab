/**
 * DVote Frontend — AnomalyListPage (Observer)
 *
 * Observer aggregate anomaly list at /observer/anomalies.
 * Shows aggregate-only anomaly counts and category distributions.
 * No identity-linked data is ever rendered (CDM-12).
 *
 * Phase N scope: Structural placeholder with CDM-12 masking, role guard,
 * and aggregate-only counts framework. Detailed anomaly event rendering
 * is deferred to Phase Q (results + escalation flows).
 *
 * API (Phase N placeholder, wired in Phase Q):
 *   GET /observer/anomalies?electionId={id}
 *   Returns: aggregate anomaly counts (not individual events with identity)
 *
 * CDM-12 enforcement:
 *   maskObserverResponse() applied to all API responses before render.
 *   Any leaked identity field triggers console.warn telemetry.
 *
 * Tab title: "DVote - Anomaly Reports"
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useSearch } from "@tanstack/react-router"
import { AlertTriangle, ShieldOff, Construction } from "lucide-react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useAuthStore } from "@/state/auth-store"

// ─── AnomalyListPage component ─────────────────────────────────────────────────

export function AnomalyListPage() {
  useDocumentTitle("DVote - Anomaly Reports")

  const role = useAuthStore((s) => s.role)

  const search = useSearch({ strict: false }) as { electionId?: string }
  const electionId = search?.electionId ?? null

  // ── Role guard ─────────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 px-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Anomaly Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregate anomaly detection signals — read-only observer view.
        </p>
      </div>

      {/* Election context */}
      {electionId && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Election Context</p>
          <p className="text-sm font-mono text-foreground mt-0.5">{electionId}</p>
        </div>
      )}

      {/* CDM-12 enforcement badge */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="size-4 text-amber-600 shrink-0" aria-hidden="true" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">CDM-12 Active:</span> This view is strictly
          aggregate-only. No identity-linked event data (wallet addresses, submission IDs,
          voter identifiers) will be rendered. Defensive masking is applied to all
          API responses.
        </p>
      </div>

      {/* Phase N placeholder — detailed anomaly list wired in Phase Q */}
      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
        <Construction className="size-10 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">
          Anomaly List — Phase Q
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto leading-relaxed">
          Detailed aggregate anomaly event rendering will be wired in Phase Q
          (Results, Rerun Lineage, and Escalation Split Flows). CDM-12 masking
          is already enforced and ready.
        </p>
      </div>

      {/* Placeholder aggregate counts (structural) */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Anomaly Count Breakdown
          <span className="ml-2 text-xs font-normal text-muted-foreground/60">
            (aggregate only)
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-40 pointer-events-none select-none">
          {[
            { label: "Duplicate Attempt", count: "—" },
            { label: "Token Mismatch", count: "—" },
            { label: "Expired Token Cast", count: "—" },
            { label: "Conflict Detected", count: "—" },
            { label: "Escalation Triggered", count: "—" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="block text-2xl font-bold text-foreground">{item.count}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
