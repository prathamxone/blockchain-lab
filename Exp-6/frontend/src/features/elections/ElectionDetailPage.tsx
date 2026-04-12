/**
 * DVote Frontend — Election Detail Page
 *
 * Full election detail surface with lifecycle timeline, candidate listing,
 * voting window countdown, and rerun lineage snapshot.
 * Tab title: "DVote - Election Detail"
 *
 * Features:
 * - Lifecycle timeline (draft → registration → voting → closed → finalized)
 * - Candidate list with NOTA pseudo-candidate treatment
 * - Voting window countdown (visible when VotingOpen)
 * - Superseded elections: all action controls hard-locked (CDM-14)
 * - Rerun lineage snapshot (parent/child pointers)
 * - Freshness badge from API
 *
 * Authority: walkthrough Phase O §2, FEATURE_FRONTEND §9.2, BACKEND_HANDOFF_REPORT §7.4
 * CDM-14: superseded elections must check status + lineage, not just status chip text
 */

import { useParams } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { StatusChip } from "@/components/ui/StatusChip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { Separator } from "@/components/ui/separator"
import { fetchElectionDetail, fetchElectionLineage } from "./api"
import { formatDateShort, formatDateTime, formatCountdown } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { ElectionCandidate, ElectionStatus } from "./types"

// ─── Lifecycle Timeline ────────────────────────────────────────────────────────

const LIFECYCLE_STEPS: { status: ElectionStatus; label: string }[] = [
  { status: "Draft",             label: "Draft" },
  { status: "RegistrationOpen",  label: "Registration Open" },
  { status: "VotingOpen",        label: "Voting Open" },
  { status: "VotingClosed",      label: "Voting Closed" },
  { status: "Finalized",         label: "Finalized" },
]

interface LifecycleTimelineProps {
  currentStatus: ElectionStatus
  votingStartsAt?: string
  votingEndsAt?: string
  finalizedAt?: string
  onNavigateToElections: () => void
}

function LifecycleTimeline({
  currentStatus,
  votingStartsAt,
  votingEndsAt,
  finalizedAt,
  onNavigateToElections,
}: LifecycleTimelineProps) {
  const statusOrder: ElectionStatus[] = [
    "Draft",
    "RegistrationOpen",
    "VotingOpen",
    "VotingClosed",
    "Finalized",
  ]
  const currentIdx = statusOrder.indexOf(currentStatus)
  const isSuperseded = currentStatus === "Superseded"

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        Election Lifecycle
      </h3>
      <ol className="flex items-center" aria-label="Election lifecycle progress">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx
          const isCurrent = idx === currentIdx && !isSuperseded
          const isSupersededStep = isSuperseded && step.status === "Finalized"

          return (
            <li key={step.status} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    isCompleted && "bg-dvote-green text-white border-dvote-green",
                    isCurrent && !isSuperseded && "bg-primary text-primary-foreground border-primary",
                    isSupersededStep && "bg-muted text-muted-foreground border-muted line-through",
                    !isCompleted && !isCurrent && !isSupersededStep && "bg-muted text-muted-foreground border-border",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : idx + 1}
                </div>
                <span className={cn(
                  "text-xs mt-1.5 text-center max-w-[5rem]",
                  isCompleted && "text-dvote-green font-medium",
                  isCurrent && !isSuperseded && "text-primary font-medium",
                  isSupersededStep && "text-muted-foreground line-through",
                  !isCompleted && !isCurrent && !isSupersededStep && "text-muted-foreground",
                )}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1",
                    idx < currentIdx ? "bg-dvote-green" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Superseded banner */}
      {isSuperseded && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>This election has been superseded by a rerun.</strong> Voting and sensitive
          actions are locked.{" "}
          <button
            type="button"
            onClick={onNavigateToElections}
            className="underline hover:text-amber-900 bg-transparent border-none p-0 cursor-pointer"
          >
            Browse the active election
          </button>
          .
        </div>
      )}

      {/* Key dates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        {votingStartsAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Voting starts:</span>{" "}
            <span className="font-medium text-foreground">{formatDateTime(votingStartsAt)}</span>
          </div>
        )}
        {votingEndsAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Voting ends:</span>{" "}
            <span className="font-medium text-foreground">{formatDateTime(votingEndsAt)}</span>
          </div>
        )}
        {finalizedAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Finalized:</span>{" "}
            <span className="font-medium text-foreground">{formatDateTime(finalizedAt)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Voting Countdown ─────────────────────────────────────────────────────────

function VotingCountdown({ votingEndsAt }: { votingEndsAt?: string }) {
  if (!votingEndsAt) return null

  const countdown = formatCountdown(votingEndsAt)
  if (!countdown) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
        Voting has closed.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dvote-green/30 bg-dvote-green-subtle p-4 text-center">
      <p className="text-sm text-muted-foreground mb-1">Voting closes in</p>
      <p className="text-3xl font-mono font-bold text-dvote-green-dark tracking-wider">
        {countdown}
      </p>
    </div>
  )
}

// ─── Candidate List ───────────────────────────────────────────────────────────

interface CandidateListProps {
  candidates: ElectionCandidate[]
  notaEnabled: boolean
  contestingCandidateCap?: number
}

function CandidateList({
  candidates,
  notaEnabled,
  contestingCandidateCap,
}: CandidateListProps) {
  const regularCandidates = candidates.filter((c) => !c.isNota)
  const notaCandidate = candidates.find((c) => c.isNota)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Candidates
        </h3>
        {contestingCandidateCap !== undefined && (
          <span className="text-xs text-muted-foreground">
            Max contesting: {contestingCandidateCap}
          </span>
        )}
      </div>

      {/* Regular candidates */}
      {regularCandidates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No candidates registered.</p>
      ) : (
        <div className="space-y-2">
          {regularCandidates.map((candidate) => (
            <div
              key={candidate.candidateId}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3",
                candidate.isWithdrawn || candidate.registrationStatus === "Withdrawn"
                  ? "opacity-50 line-through"
                  : "border-border hover:border-primary/30",
              )}
            >
              <div>
                <span className="font-medium text-foreground">{candidate.name}</span>
                {candidate.partyAffiliation && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({candidate.partyAffiliation})
                  </span>
                )}
              </div>
              <StatusChip
                status={
                  candidate.registrationStatus === "Registered"
                    ? "Approved"
                    : candidate.registrationStatus === "Withdrawn"
                      ? "Rejected"
                      : candidate.registrationStatus === "Rejected"
                        ? "Rejected"
                        : "neutral"
                }
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* NOTA pseudo-candidate */}
      {notaEnabled && notaCandidate && (
        <>
          <Separator className="my-3" />
          <div className="flex items-center justify-between rounded-lg border border-dvote-saffron/30 bg-dvote-saffron-subtle p-3">
            <div>
              <span className="font-semibold text-dvote-saffron-dark">None of the Above (NOTA)</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Voter chooses None of the Above — no candidate is elected if NOTA wins majority
              </p>
            </div>
            <span className="text-xs font-medium text-dvote-saffron-dark bg-dvote-saffron/20 px-2 py-1 rounded">
              NOTA
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Lineage Snapshot ─────────────────────────────────────────────────────────

interface LineageSnapshotProps {
  electionId: string
  onNavigateToLineage: (electionId: string) => void
}

function LineageSnapshot({ electionId, onNavigateToLineage }: LineageSnapshotProps) {
  const { data: lineage } = useQuery({
    queryKey: ["election-lineage", electionId],
    queryFn: () => fetchElectionLineage(electionId),
  })

  if (!lineage || (!lineage.parent && !lineage.child)) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        Rerun Lineage
      </h3>
      <div className="space-y-2">
        {lineage.parent && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Parent election:</span>{" "}
              <button
                type="button"
                onClick={() => onNavigateToLineage(lineage.parent!.electionId)}
                className="font-medium text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                {lineage.parent.title}
              </button>
            </div>
            <StatusChip status={lineage.parent.status} size="sm" />
          </div>
        )}
        {lineage.child && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Rerun election:</span>{" "}
              <button
                type="button"
                onClick={() => onNavigateToLineage(lineage.child!.electionId)}
                className="font-medium text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                {lineage.child.title}
              </button>
            </div>
            <StatusChip status={lineage.child.status} size="sm" />
          </div>
        )}
      </div>
      {lineage.rerunStatus && (
        <div className="text-xs text-muted-foreground">
          SLA:{" "}
          <span
            className={cn(
              "font-medium",
              lineage.rerunStatus.slaState === "on-track" && "text-dvote-green",
              lineage.rerunStatus.slaState === "due-soon" && "text-dvote-saffron",
              lineage.rerunStatus.slaState === "breached" && "text-destructive",
            )}
          >
            {lineage.rerunStatus.slaState}
          </span>
          {lineage.rerunStatus.deadline && (
            <> — due {formatDateShort(lineage.rerunStatus.deadline)}</>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <SkeletonCard variant="stat" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
        </div>
        <SkeletonCard variant="card" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ElectionDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (useParams as any)()
  const electionId = (params as { uelectionid: string }).uelectionid

  useDocumentTitle("DVote - Election Detail")

  const {
    data: election,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["election", electionId],
    queryFn: () => fetchElectionDetail(electionId),
    enabled: Boolean(electionId),
  })

  const handleNavigateToElections = () => {
    window.location.href = "/elections"
  }

  const handleNavigateToLineage = (id: string) => {
    window.location.href = `/elections/${id}/lineage`
  }

  if (isLoading) return <DetailSkeleton />

  if (error || !election) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Failed to load election</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          type="button"
          onClick={handleNavigateToElections}
          className="text-primary underline hover:text-primary/80 bg-transparent border-none cursor-pointer"
        >
          Back to elections
        </button>
      </div>
    )
  }

  const isSuperseded = election.status === "Superseded" || election.isSuperseded

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={handleNavigateToElections}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to elections
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{election.title}</h1>
            <StatusChip status={election.status} />
            {election.freshnessState && election.freshnessState !== "fresh" && (
              <StatusChip
                status={election.freshnessState === "degraded" ? "error" : "warning"}
                label={`Freshness: ${election.freshnessState}`}
                size="sm"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {election.constituency}, {election.state}
          </p>
          {election.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              {election.description}
            </p>
          )}
        </div>
      </div>

      {/* Voting countdown (only when voting is open) */}
      {election.status === "VotingOpen" && (
        <VotingCountdown votingEndsAt={election.votingEndsAt} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifecycle timeline */}
          <Card>
            <CardContent className="p-6">
              <LifecycleTimeline
                currentStatus={election.status}
                votingStartsAt={election.votingStartsAt}
                votingEndsAt={election.votingEndsAt}
                finalizedAt={election.finalizedAt}
                onNavigateToElections={handleNavigateToElections}
              />
            </CardContent>
          </Card>

          {/* Candidate list */}
          <Card>
            <CardContent className="p-6">
              <CandidateList
                candidates={election.candidates}
                notaEnabled={election.notaEnabled}
                contestingCandidateCap={election.contestingCandidateCap}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Election stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Election Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Candidates</span>
                <span className="font-medium">{election.candidateCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NOTA</span>
                <span className="font-medium">{election.notaEnabled ? "Enabled" : "Disabled"}</span>
              </div>
              {election.voterCount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered Voters</span>
                  <span className="font-medium">{election.voterCount.toLocaleString()}</span>
                </div>
              )}
              {election.contestingCandidateCap !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contesting Cap</span>
                  <span className="font-medium">{election.contestingCandidateCap}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lineage snapshot */}
          <Card>
            <CardContent className="p-6">
              <LineageSnapshot
                electionId={electionId}
                onNavigateToLineage={handleNavigateToLineage}
              />
            </CardContent>
          </Card>

          {/* Actions — hard-locked for superseded elections */}
          {isSuperseded ? (
            <Card className="border-amber-500/30">
              <CardContent className="p-6">
                <p className="text-sm text-amber-700 font-medium mb-3">
                  Voting is locked for this election.
                </p>
                {election.childElectionId && (
                  <Button
                    className="w-full"
                    onClick={() =>
                      window.location.href = `/elections/${election.childElectionId}`
                    }
                  >
                    View Active Rerun Election
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : election.status === "VotingOpen" ? (
            <Card className="border-dvote-green/30">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Voting is currently open for this election.
                </p>
                <Button
                  className="w-full bg-dvote-green hover:bg-dvote-green/90 text-white"
                  onClick={() => window.location.href = "/vote"}
                >
                  Cast Vote
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Lineage full page link */}
          {(election.parentElectionId || election.childElectionId) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = `/elections/${electionId}/lineage`}
            >
              View Full Lineage
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
