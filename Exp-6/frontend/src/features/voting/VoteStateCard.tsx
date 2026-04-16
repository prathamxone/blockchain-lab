/**
 * DVote Frontend — Vote State Card Component
 *
 * Renders a persistent state card for the vote journey.
 * Shows current state, relevant metadata, and next actions.
 *
 * Terminal states:
 * - confirmed: green, vote recorded
 * - failed: red, vote rejected
 * - expired: muted, token expired
 * - conflict: amber, vote already recorded
 *
 * Non-terminal states:
 * - idle: no action in progress
 * - token-requested: spinner, waiting for token
 * - cast-ready: countdown timer visible
 * - submitting: spinner, vote being recorded
 * - timeout-uncertain: amber warning, auto-polling guidance
 *
 * Policy L-D1: Countdown always visible from token issuance.
 *
 * Authority: walkthrough Phase P, CDM-13, BACKEND_HANDOFF_REPORT §7.1
 */

import { useVoteStore, type VoteState } from "@/state/vote-store"
import { VoteTimeoutFallback } from "./VoteTimeoutFallback"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Ban,
} from "lucide-react"

interface VoteStateCardProps {
  electionName?: string
  candidateName?: string
  onCheckResults?: () => void
  onStartOver?: () => void
}

/**
 * Maps VoteState to display properties.
 */
function getStateDisplay(state: VoteState): {
  label: string
  description: string
  icon: React.ReactNode
  variant: "success" | "error" | "warning" | "muted" | "info"
} {
  switch (state) {
    case "idle":
      return {
        label: "Ready to vote",
        description: "Select a candidate to begin",
        icon: <Clock className="h-5 w-5" />,
        variant: "muted",
      }
    case "token-requested":
      return {
        label: "Requesting vote token...",
        description: "Please wait",
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        variant: "info",
      }
    case "cast-ready":
      return {
        label: "Vote token received",
        description: "Ready to cast your vote",
        icon: <Clock className="h-5 w-5" />,
        variant: "info",
      }
    case "submitting":
      return {
        label: "Recording vote...",
        description: "Please wait for confirmation",
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        variant: "info",
      }
    case "confirmed":
      return {
        label: "Vote recorded",
        description: "Your vote has been successfully recorded",
        icon: <CheckCircle2 className="h-5 w-5 text-green" />,
        variant: "success",
      }
    case "failed":
      return {
        label: "Vote rejected",
        description: "Your vote could not be recorded",
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        variant: "error",
      }
    case "expired":
      return {
        label: "Token expired",
        description: "Your vote token has expired. Please start over.",
        icon: <Ban className="h-5 w-5 text-muted-foreground" />,
        variant: "muted",
      }
    case "conflict":
      return {
        label: "Vote already recorded",
        description: "A vote has already been recorded for this election from your wallet",
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        variant: "warning",
      }
    case "timeout-uncertain":
      return {
        label: "Vote outcome uncertain",
        description: "The outcome of your vote is currently unknown",
        icon: <AlertTriangle className="h-5 w-5 text-saffron" />,
        variant: "warning",
      }
  }
}

const variantClasses = {
  success: "border-green/30 bg-green/5",
  error: "border-destructive/30 bg-destructive/5",
  warning: "border-saffron/30 bg-saffron/5",
  muted: "border-border bg-muted/30",
  info: "border-primary/30 bg-primary/5",
}

const iconClasses = {
  success: "text-green",
  error: "text-destructive",
  warning: "text-saffron",
  muted: "text-muted-foreground",
  info: "text-primary",
}

/**
 * Renders a persistent state card for the vote journey.
 * Shows current state, countdown timer, and appropriate actions.
 */
export function VoteStateCard({
  electionName,
  candidateName,
  onCheckResults,
  onStartOver,
}: VoteStateCardProps) {
  const { state, txHash, errorMessage, getRemainingSeconds, isWithinSafetyBuffer } =
    useVoteStore()

  const display = getStateDisplay(state)
  const remainingSeconds = getRemainingSeconds()
  const inSafetyBuffer = isWithinSafetyBuffer()

  // Special rendering for timeout-uncertain state
  if (state === "timeout-uncertain") {
    return (
      <VoteTimeoutFallback
        onCheckResults={onCheckResults}
        onStartOver={onStartOver}
      />
    )
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 ${variantClasses[display.variant]}`}
    >
      {/* Header: icon + label */}
      <div className="flex items-center gap-3">
        <span className={iconClasses[display.variant]}>{display.icon}</span>
        <div>
          <p className="font-medium">{display.label}</p>
          {electionName && (
            <p className="text-xs text-muted-foreground">{electionName}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">{display.description}</p>

      {/* Countdown timer — visible only in cast-ready state (Policy L-D1) */}
      {state === "cast-ready" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Token expires in:</span>
          <span
            className={`font-mono text-sm font-semibold tabular-nums ${
              inSafetyBuffer ? "text-saffron" : "text-foreground"
            }`}
          >
            {remainingSeconds}s
          </span>
          {inSafetyBuffer && (
            <span className="text-xs text-saffron">
              — confirm soon
            </span>
          )}
        </div>
      )}

      {/* Candidate name when known */}
      {candidateName && state !== "idle" && state !== "expired" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Voting for:</span>
          <span className="text-sm font-medium">{candidateName}</span>
        </div>
      )}

      {/* TX hash when available */}
      {txHash && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Transaction:</span>
          <code className="truncate text-xs font-mono text-muted-foreground">
            {txHash}
          </code>
        </div>
      )}

      {/* Error message when available */}
      {errorMessage && state === "failed" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Conflict guidance */}
      {state === "conflict" && (
        <p className="text-xs text-muted-foreground">
          No further action is possible. Check results to see the recorded vote.
        </p>
      )}
    </div>
  )
}
