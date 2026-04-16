/**
 * DVote Frontend — Vote Timeout Fallback Component
 *
 * Renders when vote relay outcome is uncertain.
 * Auto-polls GET /votes/status every recheckAfterSec (3s from backend).
 *
 * Policy L-D2:
 * - Block recast immediately
 * - Auto-poll every recheckAfterSec (3s)
 * - Keep blocking until terminal state OR statusLookupWindowSec expires
 * - After window expires without confirmation: show safe "Check results" guidance
 *
 * CDM-13 compliance:
 * - Lookup precedence: voteIntentId first, then wallet+electionId+clientNonce tuple
 * - Terminal states: confirmed, failed, expired, conflict
 *
 * Authority: walkthrough Phase P, CDM-13, BACKEND_HANDOFF_REPORT §7.1
 */

import { useEffect, useCallback, useState } from "react"
import { useVoteStore } from "@/state/vote-store"
import { useAuthStore } from "@/state/auth-store"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface VoteTimeoutFallbackProps {
  /** Called when user chooses to check results page */
  onCheckResults?: () => void
  /** Called when user chooses to start over (reset vote flow) */
  onStartOver?: () => void
}

/**
 * Renders timeout-uncertain guidance with auto-polling.
 * Shows countdown to lookup window expiry and polling progress.
 */
export function VoteTimeoutFallback({
  onCheckResults,
  onStartOver,
}: VoteTimeoutFallbackProps) {
  const {
    state,
    voteIntentId,
    electionId,
    clientNonce,
    statusLookupWindowSec,
    statusLookupStartedAt,
    checkStatus,
    reset,
  } = useVoteStore()
  const { walletAddress } = useAuthStore()

  const [secondsRemaining, setSecondsRemaining] = useState(0)

  // Calculate seconds remaining in lookup window
  useEffect(() => {
    if (state !== "timeout-uncertain" || !statusLookupStartedAt) {
      return
    }

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - statusLookupStartedAt.getTime()) / 1000)
      const remaining = Math.max(0, statusLookupWindowSec - elapsed)
      setSecondsRemaining(remaining)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [state, statusLookupStartedAt, statusLookupWindowSec])

  // Auto-poll every recheckAfterSec (3s from backend constant)
  const doPoll = useCallback(async () => {
    if (state !== "timeout-uncertain") return

    if (voteIntentId) {
      await checkStatus({ voteIntentId })
    } else if (walletAddress && electionId && clientNonce) {
      await checkStatus({ wallet: walletAddress, electionId, clientNonce })
    }
  }, [state, voteIntentId, walletAddress, electionId, clientNonce, checkStatus])

  // Start auto-poll
  useEffect(() => {
    if (state !== "timeout-uncertain") return

    // Immediate first poll
    doPoll()

    // Then poll every 3 seconds
    const interval = setInterval(doPoll, 3_000)
    return () => clearInterval(interval)
  }, [state, doPoll])

  const handleStartOver = () => {
    reset()
    onStartOver?.()
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-saffron/30 bg-saffron/5 p-6">
      <div className="flex items-center gap-3 text-saffron">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        <span className="font-medium">Vote outcome uncertain</span>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Your vote may or may not have been recorded. Do not close this page.
      </p>

      {secondsRemaining > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Checking status automatically...
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {secondsRemaining}s
          </p>
          <p className="text-xs text-muted-foreground">
            until safe recast window
          </p>
        </div>
      )}

      {secondsRemaining === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            The safe recast window has expired. Your vote may already be recorded.
          </p>

          <div className="flex gap-2">
            {onCheckResults && (
              <Button variant="outline" onClick={onCheckResults}>
                Check Results
              </Button>
            )}
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
