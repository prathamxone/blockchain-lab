/**
 * DVote Frontend — Result Detail Page
 *
 * Full result surface for a finalized election.
 * Renders finalization outcome using EXACT backend enum values.
 * Tab title: "DVote - Election Result"
 *
 * Features:
 * - Winner display with tri-color accent
 * - Finalization outcome badge (exact enum: CandidateWon, NotaTriggeredRerun, TieLotCandidateWon, TieLotNotaTriggeredRerun)
 * - Vote tallies and percentages for all candidates
 * - NOTA treatment as separate pseudo-candidate
 * - Superseded elections: all action controls hard-locked (CDM-14)
 * - Rerun lineage link when applicable
 *
 * Authority: walkthrough Phase Q §2, FEATURE_FRONTEND §9.7, BACKEND_HANDOFF_REPORT §7.2
 * CDM-14: superseded elections must check status + lineage, not just status chip text
 * CDM-15: escalation ticket form must be immutable after submit
 */

import { useParams, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { FreshnessBanner } from "@/components/ui/FreshnessBanner"
import { Separator } from "@/components/ui/separator"
import { fetchResultDetail } from "./api"
import { formatDateTime } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { FinalizationOutcome } from "@/features/elections/types"
import type { CandidateResult } from "./api"

// ─── Finalization Outcome Label Map ────────────────────────────────────────────
// EXACT backend enum values — no inference per BACKEND_HANDOFF_REPORT §7.2

const OUTCOME_LABELS: Record<FinalizationOutcome, { label: string; description: string }> = {
  CandidateWon: {
    label: "Candidate Won",
    description: "A candidate won with a majority of votes.",
  },
  NotaTriggeredRerun: {
    label: "NOTA Triggered Rerun",
    description: "NOTA received the most votes. A rerun election has been triggered.",
  },
  TieLotCandidateWon: {
    label: "Tie-Breaker: Candidate Won",
    description: "A tie was resolved in favor of a contesting candidate.",
  },
  TieLotNotaTriggeredRerun: {
    label: "Tie-Breaker: NOTA Rerun",
    description: "A tie was resolved in favor of NOTA. A rerun election has been triggered.",
  },
}

// ─── Outcome Badge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: FinalizationOutcome }) {
  const info = OUTCOME_LABELS[outcome] ?? { label: outcome, description: "" }

  const isNotaOutcome = outcome === "NotaTriggeredRerun" || outcome === "TieLotNotaTriggeredRerun"

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isNotaOutcome
          ? "bg-dvote-saffron-subtle border-dvote-saffron/30"
          : "bg-dvote-green-subtle border-dvote-green/30",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-lg font-bold",
            isNotaOutcome ? "text-dvote-saffron-dark" : "text-dvote-green-dark",
          )}
        >
          {info.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{info.description}</p>
    </div>
  )
}

// ─── Candidate Vote Row ────────────────────────────────────────────────────────

interface CandidateVoteRowProps {
  candidate: CandidateResult
  totalVotes: number
}

function CandidateVoteRow({ candidate, totalVotes }: CandidateVoteRowProps) {
  const voteShare = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : "0.0"
  const barWidth = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border",
        candidate.isWinner && !candidate.isNota && "border-dvote-green/40 bg-dvote-green-subtle/30",
        candidate.isNota && "border-border bg-muted/30",
      )}
    >
      {/* Vote bar background */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {candidate.isWinner && !candidate.isNota && (
              <span className="inline-flex items-center rounded-full bg-dvote-green px-2 py-0.5 text-xs font-bold text-white">
                Winner
              </span>
            )}
            <span className={cn("font-semibold", candidate.isNota && "text-muted-foreground")}>
              {candidate.isNota ? "None of The Above (NOTA)" : candidate.name}
            </span>
            {candidate.partyAffiliation && !candidate.isNota && (
              <span className="text-sm text-muted-foreground">{candidate.partyAffiliation}</span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-semibold">{candidate.voteCount.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">votes</span>
            <span className="text-muted-foreground ml-2">({voteShare}%)</span>
          </div>
        </div>

        {/* Vote share bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              candidate.isWinner && !candidate.isNota && "bg-dvote-green",
              candidate.isNota && "bg-muted-foreground/50",
              !candidate.isWinner && !candidate.isNota && "bg-primary/60",
            )}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ResultDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (useParams as any)()
  const navigate = useNavigate()
  const electionId = (params as { uelectionid: string }).uelectionid

  useDocumentTitle("DVote - Election Result")

  const { data: result, isLoading } = useQuery({
    queryKey: ["result-detail", electionId],
    queryFn: () => fetchResultDetail(electionId),
    enabled: Boolean(electionId),
  })

  const handleGoToLineage = () => {
    navigate({ to: "/elections/$uelectionid/lineage", params: { uelectionid: electionId } })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-64" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Result not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/results", search: { page: 1, limit: 25 } })} className="mt-4">
          Back to Results
        </Button>
      </div>
    )
  }

  const { winner, candidates } = result

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/results", search: { page: 1, limit: 25 } })}>
          ← Back to Results
        </Button>
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{result.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {result.constituency}, {result.state}
        </p>
      </div>

      {/* Freshness banner */}
      {result.freshnessState && (
        <FreshnessBanner freshnessState={result.freshnessState} />
      )}

      {/* Outcome badge */}
      <OutcomeBadge outcome={result.finalizationOutcome} />

      {/* Election metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Election Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voting Period</span>
            <span>
              {formatDateTime(result.votingStartsAt)} — {formatDateTime(result.votingEndsAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voting Closed</span>
            <span>{formatDateTime(result.votingClosedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finalized</span>
            <span>{formatDateTime(result.finalizedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Votes Cast</span>
            <span className="font-semibold">{result.totalVotesCast.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Winner card */}
      {!winner.isNota && (
        <Card className="border-dvote-green/40 bg-dvote-green-subtle/20">
          <CardHeader>
            <CardTitle className="text-base text-dvote-green-dark">Winner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-dvote-green flex items-center justify-center">
                <span className="text-xl font-bold text-white">W</span>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{winner.name}</p>
                {winner.partyAffiliation && (
                  <p className="text-sm text-muted-foreground">{winner.partyAffiliation}</p>
                )}
                <p className="text-sm font-semibold text-dvote-green-dark mt-1">
                  {winner.voteCount.toLocaleString()} votes ({winner.voteShare.toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NOTA summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">NOTA (None of The Above)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">NOTA Votes</span>
            <span className="font-semibold">{result.notaVotes.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground">Share</span>
            <span>{result.notaVoteShare.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Candidate results */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Candidates</h2>
        <div className="space-y-3">
          {candidates
            .sort((a, b) => {
              // Winner first, then by vote count desc, NOTA last
              if (a.isWinner && !a.isNota) return -1
              if (b.isWinner && !b.isNota) return 1
              if (a.isNota) return 1
              if (b.isNota) return -1
              return b.voteCount - a.voteCount
            })
            .map((candidate) => (
              <CandidateVoteRow
                key={candidate.candidateId}
                candidate={candidate}
                totalVotes={result.totalVotesCast}
              />
            ))}
        </div>
      </div>

      {/* Lineage link for rerun */}
      {(result.parentElectionId || result.childElectionId) && (
        <Card className="border-dvote-saffron/30 bg-dvote-saffron-subtle/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Rerun Election</p>
                <p className="text-sm text-muted-foreground">
                  {result.childElectionId
                    ? "A rerun election has been triggered for this constituency."
                    : "This election was a rerun of a previous election."}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleGoToLineage}>
                View Lineage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
