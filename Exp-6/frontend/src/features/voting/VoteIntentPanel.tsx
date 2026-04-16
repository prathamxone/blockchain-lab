/**
 * DVote Frontend — Vote Intent Panel Component
 *
 * Main vote casting panel for an election.
 * Shows candidate list, selection, vote token request, and cast confirmation.
 *
 * Flow:
 * 1. Display eligible candidates for the election
 * 2. Voter selects a candidate
 * 3. Request vote token via POST /votes/token (60s TTL)
 * 4. Show countdown timer (Policy L-D1: always visible)
 * 5. Open VoteCastModal for explicit confirmation
 * 6. Handle cast result via state machine
 * 7. Show VoteStateCard for terminal states
 *
 * Policy L-D1: Countdown always visible from token issuance; 10s warning at ≤10s.
 * Policy L-D2: Recast blocked until terminal state OR lookup window expires.
 *
 * Authority: walkthrough Phase P, CDM-13, BACKEND_HANDOFF_REPORT §7.1
 */

import { useState, useEffect, useCallback } from "react"
import { useVoteStore, generateClientNonce, VOTE_TOKEN_TTL_SEC } from "@/state/vote-store"
import { useAuthStore } from "@/state/auth-store"
import { useSensitiveActionGate } from "@/hooks/useSensitiveActionGate"
import { VoteStateCard } from "./VoteStateCard"
import { VoteCastModal } from "./VoteCastModal"
import { SafeActionButton } from "@/components/ui/SafeActionButton"
import { Spinner } from "@/components/ui/Spinner"
import type { Election, ElectionCandidate } from "@/features/elections/types"
import { CheckCircle2 } from "lucide-react"

interface VoteIntentPanelProps {
  /** Election to vote in */
  election: Election
  /** Called when user wants to check results */
  onCheckResults?: () => void
}

/**
 * Main vote casting panel.
 * Manages candidate selection, token request, and vote confirmation.
 */
export function VoteIntentPanel({ election, onCheckResults }: VoteIntentPanelProps) {
  const { walletAddress } = useAuthStore()
  const {
    state,
    electionId,
    requestToken,
    reset,
    getRemainingSeconds,
    isWithinSafetyBuffer,
    tokenExpiresAt,
  } = useVoteStore()
  const { isBlocked: isFreshnessBlocked, reason: freshnessBlockedReason } = useSensitiveActionGate()

  const [selectedCandidate, setSelectedCandidate] = useState<ElectionCandidate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Token expiry countdown
  useEffect(() => {
    if (state !== "cast-ready" || !tokenExpiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.floor((tokenExpiresAt.getTime() - Date.now()) / 1000)
      if (remaining <= 0) {
        useVoteStore.getState().expireToken()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state, tokenExpiresAt])

  // Reset selection when election changes
  useEffect(() => {
    if (electionId !== election.electionId) {
      reset()
      setSelectedCandidate(null)
      setIsModalOpen(false)
    }
  }, [electionId, election.electionId, reset])

  const handleSelectCandidate = useCallback((candidate: ElectionCandidate) => {
    if (candidate.isNota || candidate.isWithdrawn || candidate.registrationStatus !== "Registered") {
      return
    }
    setSelectedCandidate(candidate)
  }, [])

  const handleRequestToken = useCallback(async () => {
    if (!selectedCandidate || !walletAddress || isFreshnessBlocked) return

    const nonce = generateClientNonce()
    useVoteStore.setState({ clientNonce: nonce })

    await requestToken({
      electionId: election.electionId,
      wallet: walletAddress,
    })
  }, [selectedCandidate, walletAddress, isFreshnessBlocked, election.electionId, requestToken])

  const handleOpenModal = useCallback(() => {
    if (!selectedCandidate || !walletAddress) return
    setIsModalOpen(true)
  }, [selectedCandidate, walletAddress])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleStartOver = useCallback(() => {
    reset()
    setSelectedCandidate(null)
  }, [reset])

  const remainingSeconds = getRemainingSeconds()
  const inSafetyBuffer = isWithinSafetyBuffer()

  // Active vote in progress (token issued)
  const isVoteActive = state !== "idle" && state !== "expired"

  // Terminal states — show VoteStateCard instead of candidate list
  if (state === "confirmed" || state === "failed" || state === "conflict" || state === "expired") {
    return (
      <div className="flex flex-col gap-4">
        <VoteStateCard
          electionName={election.title}
          candidateName={selectedCandidate?.name}
          onCheckResults={onCheckResults}
          onStartOver={handleStartOver}
        />
      </div>
    )
  }

  // Active vote flow (token requested or cast-ready)
  if (isVoteActive) {
    return (
      <div className="flex flex-col gap-4">
        {/* Token status bar */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            {state === "token-requested" ? (
              <>
                <Spinner size="sm" label="Requesting token..." />
                <span className="text-sm">Requesting vote token...</span>
              </>
            ) : state === "submitting" ? (
              <>
                <Spinner size="sm" label="Submitting..." />
                <span className="text-sm">Recording vote...</span>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Token expires in:</span>
                <span
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    inSafetyBuffer ? "text-saffron" : "text-foreground"
                  }`}
                >
                  {remainingSeconds}s
                </span>
              </>
            )}
          </div>

          {state === "cast-ready" && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleStartOver}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Selected candidate confirmation */}
        {selectedCandidate && state === "cast-ready" && (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedCandidate.name}</p>
                {selectedCandidate.partyAffiliation && (
                  <p className="text-xs text-muted-foreground">{selectedCandidate.partyAffiliation}</p>
                )}
              </div>
              {selectedCandidate.isNota && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">NOTA</span>
              )}
            </div>

            <SafeActionButton
              safeLabel="Cast Vote"
              unsafeLabel={inSafetyBuffer ? "Token expiring" : "Cannot vote"}
              isUnsafe={inSafetyBuffer}
              isLoading={false}
              onClick={handleOpenModal}
              unsafeTooltip={inSafetyBuffer ? "Token expires soon. Please wait for a new token." : undefined}
            />

            {inSafetyBuffer && (
              <p className="text-xs text-saffron">
                Token expiring soon. Confirm immediately or cancel and restart.
              </p>
            )}
          </div>
        )}

        {/* Vote cast modal */}
        {selectedCandidate && (
          <VoteCastModal
            open={isModalOpen}
            onOpenChange={handleCloseModal}
            election={election}
            candidate={selectedCandidate}
            onSuccess={() => {
              // State card will show confirmed state
            }}
            onCheckResults={onCheckResults}
          />
        )}
      </div>
    )
  }

  // Idle state — show candidate list
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="font-medium">Cast Your Vote</h3>
        <p className="text-sm text-muted-foreground">
          Select a candidate to begin. Your vote token will be valid for {VOTE_TOKEN_TTL_SEC} seconds.
        </p>
      </div>

      {/* Candidate list */}
      <div className="flex flex-col gap-2">
        {election.candidates
          .filter((c) => c.registrationStatus === "Registered" && !c.isWithdrawn)
          .map((candidate) => {
            const isSelected = selectedCandidate?.candidateId === candidate.candidateId

            return (
              <button
                key={candidate.candidateId}
                type="button"
                disabled={candidate.isNota === false && isVoteActive}
                onClick={() => handleSelectCandidate(candidate)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                } ${candidate.isNota ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-medium">
                      {candidate.name}
                      {candidate.isNota && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">NOTA</span>
                      )}
                    </p>
                    {candidate.partyAffiliation && (
                      <p className="text-xs text-muted-foreground">{candidate.partyAffiliation}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
      </div>

      {/* Action button */}
      {selectedCandidate && !selectedCandidate.isNota && (
        <SafeActionButton
          safeLabel="Request Vote Token"
          unsafeLabel={isFreshnessBlocked ? "System sync degraded" : "Select a candidate"}
          isUnsafe={!selectedCandidate || selectedCandidate.isNota || isFreshnessBlocked}
          isLoading={useVoteStore.getState().state === "token-requested"}
          loadingLabel="Requesting token..."
          onClick={handleRequestToken}
          unsafeTooltip={isFreshnessBlocked ? freshnessBlockedReason : undefined}
        />
      )}

      {selectedCandidate?.isNota && (
        <p className="text-xs text-muted-foreground">
          You selected None of the Above (NOTA). Selecting NOTA means you choose not to vote for any candidate.
        </p>
      )}
    </div>
  )
}
