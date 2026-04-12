/**
 * DVote Frontend — Election Lineage Page
 *
 * Parent-child rerun lineage view showing the full election chain,
 * SLA countdown, and rerun status.
 * Tab title: "DVote - Lineage"
 *
 * Features:
 * - Parent → Child election relationship chain
 * - SLA state (on-track / due-soon / breached) with countdown
 * - Superseded elections: all action controls hard-locked (CDM-14)
 *
 * Authority: walkthrough Phase O §3, FEATURE_FRONTEND §9.8
 * CDM-14: superseded election: must check status + lineage, not just status chip text
 */

import { useParams } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { StatusChip } from "@/components/ui/StatusChip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { fetchElectionLineage, fetchRerunStatus } from "./api"
import { formatDateShort, formatDateTime, formatCountdown } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { RerunStatus, ElectionStatus } from "./types"

// ─── SLA Badge ────────────────────────────────────────────────────────────────

function SlaBadge({ slaState, deadline }: { slaState: RerunStatus["slaState"]; deadline?: string }) {
  const countdown = deadline ? formatCountdown(deadline) : null

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          slaState === "on-track" && "bg-dvote-green-subtle text-dvote-green-dark",
          slaState === "due-soon" && "bg-dvote-saffron-subtle text-dvote-saffron-dark",
          slaState === "breached" && "bg-destructive/10 text-destructive border border-destructive/30",
        )}
      >
        {slaState === "on-track" && "On Track"}
        {slaState === "due-soon" && "Due Soon"}
        {slaState === "breached" && "SLA Breached"}
      </span>
      {countdown && slaState !== "breached" && (
        <span className="text-xs font-mono text-muted-foreground">⏱ {countdown}</span>
      )}
      {deadline && (
        <span className="text-xs text-muted-foreground">
          Due {formatDateShort(deadline)}
        </span>
      )}
    </div>
  )
}

// ─── Election Node ─────────────────────────────────────────────────────────────

interface ElectionNodeProps {
  electionId: string
  title: string
  status: ElectionStatus
  votingClosedAt?: string
  isRoot?: boolean
  isChild?: boolean
  onSelect: (electionId: string) => void
}

function ElectionNode({ electionId, title, status, votingClosedAt, isRoot, isChild, onSelect }: ElectionNodeProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Left connector */}
      <div className="flex flex-col items-center">
        {!isRoot && (
          <div className="w-4 border-l-2 border-t-2 border-border rounded-tl-lg h-4 -mb-px" />
        )}
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 flex-shrink-0",
            status === "Finalized" && "bg-dvote-green border-dvote-green",
            status === "Superseded" && "bg-muted border-muted-foreground",
            status === "VotingOpen" && "bg-primary border-primary animate-pulse",
            status === "VotingClosed" && "bg-dvote-saffron border-dvote-saffron",
            status === "Draft" && "bg-muted border-muted-foreground",
            status === "RegistrationOpen" && "bg-dvote-info border-dvote-info",
          )}
        />
        {!isChild && (
          <div className="w-0.5 h-full bg-border min-h-[3rem]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {isRoot && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Original Election
            </span>
          )}
          {isChild && (
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Rerun Election
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelect(electionId)}
          className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer text-left"
        >
          {title}
        </button>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusChip status={status} size="sm" />
          {votingClosedAt && (
            <span className="text-xs text-muted-foreground">
              Voting closed {formatDateTime(votingClosedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ElectionLineagePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (useParams as any)()
  const electionId = (params as { uelectionid: string }).uelectionid

  useDocumentTitle("DVote - Lineage")

  const { data: lineage, isLoading: lineageLoading } = useQuery({
    queryKey: ["election-lineage", electionId],
    queryFn: () => fetchElectionLineage(electionId),
    enabled: Boolean(electionId),
  })

  const { data: rerunStatus } = useQuery({
    queryKey: ["rerun-status", electionId],
    queryFn: () => fetchRerunStatus(electionId),
    enabled: Boolean(electionId) && Boolean(lineage?.child),
  })

  const handleSelectElection = (id: string) => {
    window.location.href = `/elections/${id}`
  }

  const handleBackToDetail = () => {
    window.location.href = `/elections/${electionId}`
  }

  if (lineageLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard variant="card" />
        <SkeletonCard variant="card" />
        <SkeletonCard variant="card" />
      </div>
    )
  }

  if (!lineage || (!lineage.parent && !lineage.child)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">No lineage available</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This election does not have any rerun history.
        </p>
        <button
          type="button"
          onClick={handleBackToDetail}
          className="text-primary underline hover:text-primary/80 bg-transparent border-none cursor-pointer"
        >
          Back to election detail
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBackToDetail}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to election detail
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Election Lineage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parent-child rerun relationship and SLA status.
        </p>
      </div>

      {/* SLA Status Card (if rerun is active) */}
      {rerunStatus && rerunStatus.isRerunRequired && (
        <Card className={cn(
          "border",
          rerunStatus.slaState === "on-track" && "border-dvote-green/30",
          rerunStatus.slaState === "due-soon" && "border-dvote-saffron/30",
          rerunStatus.slaState === "breached" && "border-destructive/30",
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Rerun SLA Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SlaBadge
              slaState={rerunStatus.slaState}
              deadline={rerunStatus.deadline}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Rerun count: {rerunStatus.rerunCount}
            </p>
            {rerunStatus.slaState === "due-soon" && (
              <p className="text-xs text-dvote-saffron-dark mt-1">
                The rerun deadline is approaching. ECI must execute the rerun soon.
              </p>
            )}
            {rerunStatus.slaState === "breached" && (
              <p className="text-xs text-destructive mt-1">
                SLA breach detected. Escalation may be required.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lineage Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Election Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-border" />

            {/* Parent election */}
            {lineage.parent && (
              <ElectionNode
                electionId={lineage.parent.electionId}
                title={lineage.parent.title}
                status={lineage.parent.status}
                votingClosedAt={lineage.parent.votingClosedAt}
                isRoot
                onSelect={handleSelectElection}
              />
            )}

            {/* Rerun trigger indicator */}
            {lineage.child && (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-4 border-l-2 border-t-2 border-dvote-saffron/50 rounded-tl-lg h-4 -mb-px" />
                  <div className="w-3 h-3 rounded-full border-2 border-dvote-saffron/50 bg-dvote-saffron-subtle flex-shrink-0" />
                  <div className="w-0.5 h-full bg-border min-h-[3rem]" />
                </div>
                <div className="flex-1 pb-6">
                  <span className="text-xs font-semibold text-dvote-saffron uppercase tracking-wide">
                    Rerun Triggered
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    NOTA or tie-breaker triggered a new election
                  </p>
                </div>
              </div>
            )}

            {/* Child election */}
            {lineage.child && (
              <ElectionNode
                electionId={lineage.child.electionId}
                title={lineage.child.title}
                status={lineage.child.status}
                isChild
                onSelect={handleSelectElection}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        {lineage.parent && (
          <Button variant="outline" size="sm" onClick={() => handleSelectElection(lineage.parent!.electionId)}>
            <StatusChip status={lineage.parent.status} size="sm" />
          </Button>
        )}
        {lineage.child && (
          <Button variant="outline" size="sm" onClick={() => handleSelectElection(lineage.child!.electionId)}>
            <StatusChip status={lineage.child.status} size="sm" />
          </Button>
        )}
      </div>
    </div>
  )
}
