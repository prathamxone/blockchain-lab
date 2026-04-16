/**
 * DVote Frontend — Vote Cast Modal Component
 *
 * Vote confirmation modal for explicit voter consent before wallet signature.
 *
 * Flow:
 * 1. Parent (VoteIntentPanel) shows candidate selection + "Cast Vote" button
 * 2. Clicking "Cast Vote" opens this modal
 * 3. Modal shows: election name, candidate name, token countdown
 * 4. User clicks "Confirm Vote" → wallet signature → POST /votes/cast
 * 5. Success → close modal, show VoteStateCard confirmed state
 * 6. Error/timeout → modal stays open with error state
 *
 * Policy L-D1: Countdown always visible from token issuance in modal.
 * Policy L-D2: Recast blocked until terminal state OR lookup window expires.
 *
 * Authority: walkthrough Phase P, CDM-13, BACKEND_HANDOFF_REPORT §7.1
 */

import { useEffect, useCallback } from "react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useVoteStore } from "@/state/vote-store"
import { useAuthStore } from "@/state/auth-store"
import type { Election, ElectionCandidate } from "@/features/elections/types"

interface VoteCastModalProps {
  /** Controls modal open/close */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Election context */
  election: Election
  /** Selected candidate */
  candidate: ElectionCandidate
  /** Called when vote is successfully recorded */
  onSuccess?: () => void
  /** Called when user wants to check results */
  onCheckResults?: () => void
}

/**
 * Confirmation modal for vote cast.
 * Displays candidate selection and countdown timer.
 * Handles the vote cast action via vote store.
 */
export function VoteCastModal({
  open,
  onOpenChange,
  election,
  candidate,
  onSuccess,
  onCheckResults,
}: VoteCastModalProps) {
  const {
    state,
    castVote,
    canCast,
    getRemainingSeconds,
    isWithinSafetyBuffer,
    expireToken,
    reset,
  } = useVoteStore()

  const remainingSeconds = getRemainingSeconds()
  const inSafetyBuffer = isWithinSafetyBuffer()
  const isUnsafe = !canCast()

  // Token expiry countdown
  useEffect(() => {
    if (state !== "cast-ready") return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((useVoteStore.getState().tokenExpiresAt?.getTime() ?? 0 - Date.now()) / 1000))
      if (remaining <= 0) {
        expireToken()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state, expireToken])

  // Auto-close on confirmed state
  useEffect(() => {
    if (state === "confirmed") {
      onSuccess?.()
      onOpenChange(false)
    }
  }, [state, onSuccess, onOpenChange])

  const handleConfirm = useCallback(async () => {
    if (!canCast()) return

    const walletAddress = useAuthStore.getState().walletAddress
    const clientNonce = useVoteStore.getState().clientNonce

    await castVote({
      candidateIndex: election.candidates.findIndex(c => c.candidateId === candidate.candidateId),
      clientNonce: clientNonce ?? "",
      wallet: walletAddress ?? "",
    })
  }, [canCast, castVote, election.candidates, candidate.candidateId])

  const handleClose = () => {
    // Only allow close in terminal states
    const currentState = useVoteStore.getState().state
    if (currentState === "confirmed" || currentState === "conflict" || currentState === "expired" || currentState === "failed") {
      reset()
      onOpenChange(false)
    }
  }

  const getTitle = () => {
    switch (state) {
      case "cast-ready":
        return "Confirm Your Vote"
      case "submitting":
        return "Recording Vote..."
      case "timeout-uncertain":
        return "Vote Outcome Uncertain"
      case "confirmed":
        return "Vote Recorded"
      case "failed":
        return "Vote Failed"
      case "expired":
        return "Token Expired"
      case "conflict":
        return "Vote Already Recorded"
      default:
        return "Confirm Your Vote"
    }
  }

  const getDescription = () => {
    if (state === "cast-ready") {
      return `You are about to cast your vote for ${candidate.name}${candidate.partyAffiliation ? ` (${candidate.partyAffiliation})` : ""} in ${election.title}.`
    }
    if (state === "submitting") {
      return "Please confirm the transaction in your wallet and wait..."
    }
    return undefined
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleClose}
      title={getTitle()}
      description={getDescription()}
      confirmLabel={
        state === "cast-ready"
          ? "Confirm Vote"
          : state === "submitting"
            ? "Recording..."
            : state === "confirmed"
              ? "Done"
              : "Close"
      }
      cancelLabel={state === "cast-ready" ? "Cancel" : undefined}
      isConfirmLoading={state === "submitting"}
      isConfirmDisabled={isUnsafe || state === "expired" || state === "conflict" || state === "failed"}
      confirmLoadingLabel="Recording vote..."
      onConfirm={handleConfirm}
    >
      {/* Countdown timer — always visible (Policy L-D1) */}
      {state === "cast-ready" && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">Token expires in:</span>
          <span
            className={`font-mono text-sm font-semibold tabular-nums ${
              inSafetyBuffer ? "text-saffron" : "text-foreground"
            }`}
          >
            {remainingSeconds}s
          </span>
        </div>
      )}

      {/* Candidate summary */}
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{candidate.name}</p>
            {candidate.partyAffiliation && (
              <p className="text-xs text-muted-foreground">{candidate.partyAffiliation}</p>
            )}
          </div>
          {candidate.isNota && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">NOTA</span>
          )}
        </div>
      </div>

      {/* Safety buffer warning */}
      {state === "cast-ready" && inSafetyBuffer && (
        <p className="text-xs text-saffron">
          Token expiring soon. Please confirm immediately or request a new token.
        </p>
      )}

      {/* Error state */}
      {(state === "failed" || state === "timeout-uncertain") && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">
            {state === "failed"
              ? "Your vote could not be recorded. Please try again."
              : "The outcome of your vote is uncertain."}
          </p>
          {onCheckResults && (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={onCheckResults}
            >
              Check Results
            </button>
          )}
        </div>
      )}

      {/* Conflict state */}
      {state === "conflict" && (
        <p className="text-sm text-muted-foreground">
          A vote has already been recorded for this election from your wallet. No further action is possible.
        </p>
      )}

      {/* Expired state */}
      {state === "expired" && (
        <p className="text-sm text-muted-foreground">
          Your vote token has expired. Please close this dialog and request a new token.
        </p>
      )}
    </ConfirmDialog>
  )
}
