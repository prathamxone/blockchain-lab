/**
 * DVote Frontend — KycReviewCard (Owner Queue)
 *
 * Displays a single KYC queue item for Owner-role review.
 * Shows submission metadata and action controls for:
 *   - APPROVED: approve action
 *   - REJECTED: reject with required reason
 *   - NEEDS_RESUBMISSION: resubmit request with required reason
 *
 * Reason capture is REQUIRED for non-approval decisions.
 * This is enforced both in this component (disables confirm button
 * until reason text is provided) and in the KycDecisionModal.
 *
 * API surface:
 *   - Decision submitted via: POST /owner/kyc/:submissionId/decision
 *     Body: { decision: "APPROVED"|"REJECTED"|"NEEDS_RESUBMISSION", reason: string }
 *   - No PII is requested here — this card shows only queue metadata
 *     (submissionId, sequenceNo, state, timestamps, electionId, constituencyId).
 *
 * State badges reuse kycStatusLabel/kycStatusVariant from mask.ts for visual
 * consistency with the KycStepReview and ProfileDetailsForm components.
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useState, useCallback } from "react"
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Hash,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { cn } from "@/lib/utils"
import { kycStatusLabel, kycStatusVariant, type KycStatus } from "@/lib/format/mask"
import { apiClient, ApiError } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycDecision = "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION"

export interface KycQueueItem {
  queueId: string
  submissionId: string
  sequenceNo: number
  electionId: string
  constituencyId: string
  state: KycStatus
  submittedAt: string | null
}

export interface KycReviewCardProps {
  item: KycQueueItem
  /** Compact (dense) or default layout */
  dense?: boolean
  /** Called after a successful decision submission — parent should refetch */
  onDecisionSuccess?: (submissionId: string, newState: KycStatus) => void
}

// ─── Decision action config ────────────────────────────────────────────────────

const DECISION_CONFIG: Record<
  KycDecision,
  {
    label: string
    requiresReason: boolean
    icon: React.ReactNode
    buttonVariant: "default" | "destructive" | "outline"
    buttonClass?: string
  }
> = {
  APPROVED: {
    label: "Approve",
    requiresReason: false,
    icon: <CheckCircle2 className="size-3.5" aria-hidden="true" />,
    buttonVariant: "default",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white border-0",
  },
  REJECTED: {
    label: "Reject",
    requiresReason: true,
    icon: <XCircle className="size-3.5" aria-hidden="true" />,
    buttonVariant: "destructive",
  },
  NEEDS_RESUBMISSION: {
    label: "Request Resubmission",
    requiresReason: true,
    icon: <RotateCcw className="size-3.5" aria-hidden="true" />,
    buttonVariant: "outline",
    buttonClass: "border-amber-400 text-amber-700 hover:bg-amber-50",
  },
}

// ─── Status badge colors ───────────────────────────────────────────────────────

const STATUS_BADGE_CLASS: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  destructive: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  secondary: "bg-slate-100 text-slate-700 border-slate-200",
  default: "bg-muted text-muted-foreground border-border",
}

// ─── KycReviewCard component ──────────────────────────────────────────────────

/**
 * Owner queue submission card with metadata display and decision controls.
 */
export function KycReviewCard({
  item,
  dense = false,
  onDecisionSuccess,
}: KycReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeDecision, setActiveDecision] = useState<KycDecision | null>(null)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Optimistic state update
  const [localState, setLocalState] = useState<KycStatus>(item.state)

  const statusVariant = kycStatusVariant(localState)
  const statusLabel = kycStatusLabel(localState)

  const submittedDate = item.submittedAt
    ? new Date(item.submittedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not yet submitted"

  // ── Decision submit ─────────────────────────────────────────────────────────

  const handleDecisionSubmit = useCallback(async () => {
    if (!activeDecision) return
    const config = DECISION_CONFIG[activeDecision]
    if (config.requiresReason && !reason.trim()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await apiClient.post<{ submissionId: string; state: KycStatus }>(
        `/owner/kyc/${item.submissionId}/decision`,
        {
          decision: activeDecision,
          reason: reason.trim() || "No reason provided",
        }
      )

      // Optimistic update
      setLocalState(result.state)
      setActiveDecision(null)
      setReason("")
      setExpanded(false)
      onDecisionSuccess?.(result.submissionId, result.state)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Decision submission failed. Please try again."
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [activeDecision, reason, item.submissionId, onDecisionSuccess])

  const handleDecisionCancel = useCallback(() => {
    setActiveDecision(null)
    setReason("")
    setSubmitError(null)
  }, [])

  const isTerminal = localState === "APPROVED" || localState === "REJECTED"

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-shadow",
        dense ? "px-3 py-2.5" : "px-4 py-4",
        expanded && "shadow-md"
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Sequence badge */}
          <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold text-muted-foreground font-mono">
            #{item.sequenceNo}
          </span>

          {/* Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* State badge */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0",
                  STATUS_BADGE_CLASS[statusVariant]
                )}
              >
                {statusLabel}
              </span>
            </div>

            <div
              className={cn(
                "mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground",
                dense && "mt-1"
              )}
            >
              <span className="flex items-center gap-1">
                <Hash className="size-3" aria-hidden="true" />
                <span className="font-mono truncate max-w-[120px]" title={item.submissionId}>
                  {item.submissionId.slice(0, 8)}…
                </span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {item.constituencyId.slice(0, 8)}…
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" aria-hidden="true" />
                {submittedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Expand / collapse button */}
        {!isTerminal && (
          <Button
            id={`kyc-card-expand-${item.queueId}`}
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 w-7 p-0"
            onClick={() => {
              setExpanded((v) => !v)
              if (expanded) handleDecisionCancel()
            }}
            title={expanded ? "Close actions" : "Open review actions"}
          >
            {expanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      {/* Action panel (expandable) */}
      {expanded && !isTerminal && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {/* Decision buttons */}
          {!activeDecision && (
            <div className="flex flex-wrap gap-2">
              {(["APPROVED", "REJECTED", "NEEDS_RESUBMISSION"] as KycDecision[]).map(
                (decision) => {
                  const cfg = DECISION_CONFIG[decision]
                  return (
                    <Button
                      key={decision}
                      id={`kyc-action-${decision.toLowerCase()}-${item.queueId}`}
                      variant={cfg.buttonVariant}
                      size="sm"
                      className={cn("gap-1.5 text-xs", cfg.buttonClass)}
                      onClick={() => {
                        setActiveDecision(decision)
                        setSubmitError(null)
                      }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </Button>
                  )
                }
              )}
            </div>
          )}

          {/* Active decision confirmation */}
          {activeDecision && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                {DECISION_CONFIG[activeDecision].label} — Confirm
              </p>

              {/* Reason textarea */}
              {DECISION_CONFIG[activeDecision].requiresReason && (
                <textarea
                  id={`kyc-reason-${item.queueId}`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[72px]"
                  placeholder="Provide a reason (required)…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                />
              )}

              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}

              <div className="flex gap-2">
                <LoadingButton
                  id={`kyc-confirm-${item.queueId}`}
                  size="sm"
                  className={cn(
                    "text-xs gap-1.5",
                    DECISION_CONFIG[activeDecision].buttonClass
                  )}
                  isLoading={isSubmitting}
                  loadingLabel="Submitting…"
                  disabled={
                    isSubmitting ||
                    (DECISION_CONFIG[activeDecision].requiresReason &&
                      !reason.trim())
                  }
                  onClick={handleDecisionSubmit}
                >
                  {DECISION_CONFIG[activeDecision].icon}
                  Confirm {DECISION_CONFIG[activeDecision].label}
                </LoadingButton>
                <Button
                  id={`kyc-cancel-${item.queueId}`}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleDecisionCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terminal state notice */}
      {isTerminal && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          This submission has been finalized ({statusLabel}).
        </p>
      )}
    </div>
  )
}
