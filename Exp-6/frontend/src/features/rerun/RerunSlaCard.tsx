/**
 * DVote Frontend — Rerun SLA Card
 *
 * Displays rerun SLA state with countdown and due-soon threshold.
 * Uses 48-hour threshold for due-soon state per locked policy.
 *
 * Features:
 * - SLA state badge: on-track (green), due-soon (saffron), breached (red)
 * - Countdown to deadline
 * - Due date display
 *
 * Authority: walkthrough Phase Q §4, FEATURE_FRONTEND §9.8
 */

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { fetchRerunStatus } from "@/features/elections/api"
import { formatCountdown, formatDateShort } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { RerunSlaState } from "@/features/elections/types"

// ─── SLA Badge ────────────────────────────────────────────────────────────────

function SlaBadge({ slaState }: { slaState: RerunSlaState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        slaState === "on-track" && "bg-dvote-green-subtle text-dvote-green-dark border border-dvote-green/30",
        slaState === "due-soon" && "bg-dvote-saffron-subtle text-dvote-saffron-dark border border-dvote-saffron/30",
        slaState === "breached" && "bg-destructive/10 text-destructive border border-destructive/30",
      )}
    >
      {slaState === "on-track" && "✓ On Track"}
      {slaState === "due-soon" && "⚠ Due Soon"}
      {slaState === "breached" && "✕ SLA Breached"}
    </span>
  )
}

// ─── SLA Card ────────────────────────────────────────────────────────────────

interface RerunSlaCardProps {
  electionId: string
  rerunDeadline?: string
  rerunSlaState?: RerunSlaState
}

export function RerunSlaCard({ electionId, rerunDeadline, rerunSlaState }: RerunSlaCardProps) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["rerun-status", electionId],
    queryFn: () => fetchRerunStatus(electionId),
    enabled: Boolean(electionId),
    // Will be stale if passed as props
    initialData: rerunDeadline
      ? {
          electionId,
          isRerunRequired: true,
          slaState: rerunSlaState ?? "on-track",
          deadline: rerunDeadline,
          rerunCount: 0,
        }
      : undefined,
  })

  if (isLoading) {
    return <SkeletonCard className="h-24" />
  }

  if (!status?.isRerunRequired || !status.deadline) {
    return null
  }

  const countdown = formatCountdown(status.deadline)
  const isBreached = status.slaState === "breached"

  return (
    <Card
      className={cn(
        "border",
        status.slaState === "on-track" && "border-dvote-green/30 bg-dvote-green-subtle/10",
        status.slaState === "due-soon" && "border-dvote-saffron/30 bg-dvote-saffron-subtle/10",
        status.slaState === "breached" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* SLA status */}
          <div className="flex items-center gap-3">
            <SlaBadge slaState={status.slaState} />
            <div>
              <p className="text-sm font-medium text-foreground">Rerun SLA</p>
              <p className="text-xs text-muted-foreground">
                {status.rerunCount > 0
                  ? `Rerun ${status.rerunCount} of 1`
                  : "Awaiting rerun execution"}
              </p>
            </div>
          </div>

          {/* Countdown + deadline */}
          <div className="text-right">
            {isBreached ? (
              <p className="text-sm font-semibold text-destructive">
                SLA Breached — {formatDateShort(status.deadline)}
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold font-mono text-foreground">
                  {countdown ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  remaining · due {formatDateShort(status.deadline)}
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
