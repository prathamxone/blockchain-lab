/**
 * DVote Frontend — KycDecisionModal (Owner Queue)
 *
 * Standalone modal dialog for submitting a KYC review decision.
 * Used as an alternative to the inline KycReviewCard action panel:
 * triggered from the OwnerQueuePage when the reviewer wants a
 * focused decision experience with more screen space.
 *
 * Decision types: APPROVED | REJECTED | NEEDS_RESUBMISSION
 * Reason is required for REJECTED and NEEDS_RESUBMISSION.
 *
 * API: POST /owner/kyc/:submissionId/decision
 *   Body: { decision, reason }
 *   Returns: { submissionId, state }
 *
 * Authority: walkthrough Phase N, CDM-12, Plan Phase 14, FEATURE_FRONTEND §7.2
 */

import { useState, useCallback, useEffect } from "react"
import { CheckCircle2, XCircle, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { cn } from "@/lib/utils"
import { kycStatusLabel, type KycStatus } from "@/lib/format/mask"
import { apiClient, ApiError } from "@/lib/api-client"
import type { KycDecision, KycQueueItem } from "./KycReviewCard"

// ─── Modal overlay ─────────────────────────────────────────────────────────────

interface ModalBackdropProps {
  children: React.ReactNode
  onClose: () => void
}

function ModalBackdrop({ children, onClose }: ModalBackdropProps) {
  // Trap Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}

// ─── Decision option row ──────────────────────────────────────────────────────

interface DecisionOptionProps {
  decision: KycDecision
  selected: boolean
  onSelect: (d: KycDecision) => void
  disabled?: boolean
}

const DECISION_META: Record<
  KycDecision,
  { label: string; description: string; icon: React.ReactNode; iconClass: string }
> = {
  APPROVED: {
    label: "Approve",
    description: "Submission meets all KYC requirements.",
    icon: <CheckCircle2 className="size-4" aria-hidden="true" />,
    iconClass: "text-green-600",
  },
  REJECTED: {
    label: "Reject",
    description: "Submission cannot be accepted. Requires reason.",
    icon: <XCircle className="size-4" aria-hidden="true" />,
    iconClass: "text-red-600",
  },
  NEEDS_RESUBMISSION: {
    label: "Request Resubmission",
    description: "Submission needs corrections. Requires reason.",
    icon: <RotateCcw className="size-4" aria-hidden="true" />,
    iconClass: "text-amber-600",
  },
}

function DecisionOption({ decision, selected, onSelect, disabled }: DecisionOptionProps) {
  const meta = DECISION_META[decision]
  return (
    <button
      id={`modal-decision-${decision.toLowerCase()}`}
      type="button"
      onClick={() => onSelect(decision)}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-lg border px-4 py-3 flex items-start gap-3 transition-colors",
        "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className={cn("shrink-0 mt-0.5", meta.iconClass)}>{meta.icon}</span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{meta.label}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{meta.description}</span>
      </span>
    </button>
  )
}

// ─── KycDecisionModal component ───────────────────────────────────────────────

export interface KycDecisionModalProps {
  item: KycQueueItem
  onClose: () => void
  onDecisionSuccess?: (submissionId: string, newState: KycStatus) => void
}

/**
 * Full-screen modal for Owner KYC review decision with reason capture.
 */
export function KycDecisionModal({
  item,
  onClose,
  onDecisionSuccess,
}: KycDecisionModalProps) {
  const [selectedDecision, setSelectedDecision] = useState<KycDecision | null>(null)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const requiresReason =
    selectedDecision === "REJECTED" || selectedDecision === "NEEDS_RESUBMISSION"

  const canSubmit =
    selectedDecision !== null &&
    (!requiresReason || reason.trim().length > 0)

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedDecision || !canSubmit) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await apiClient.post<{ submissionId: string; state: KycStatus }>(
        `/owner/kyc/${item.submissionId}/decision`,
        {
          decision: selectedDecision,
          reason: reason.trim() || "No reason provided",
        }
      )

      onDecisionSuccess?.(result.submissionId, result.state)
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Decision submission failed. Please try again."
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedDecision, reason, canSubmit, item.submissionId, onDecisionSuccess, onClose])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="relative w-full max-w-md mx-4 rounded-xl border bg-popover shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2
            id="kyc-modal-title"
            className="text-base font-semibold text-foreground"
          >
            Review Decision
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submission{" "}
            <span className="font-mono">{item.submissionId.slice(0, 8)}…</span> ·
            Seq #{item.sequenceNo}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Current state indicator */}
          <div className="text-xs text-muted-foreground">
            Current State:{" "}
            <span className="font-semibold text-foreground">
              {kycStatusLabel(item.state)}
            </span>
          </div>

          {/* Decision options */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground mb-2">
              Select Decision
            </legend>
            {(["APPROVED", "REJECTED", "NEEDS_RESUBMISSION"] as KycDecision[]).map(
              (d) => (
                <DecisionOption
                  key={d}
                  decision={d}
                  selected={selectedDecision === d}
                  onSelect={setSelectedDecision}
                  disabled={isSubmitting}
                />
              )
            )}
          </fieldset>

          {/* Reason textarea (conditional) */}
          {requiresReason && (
            <div className="space-y-1">
              <label
                htmlFor="modal-reason-textarea"
                className="text-xs font-medium text-foreground"
              >
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                id="modal-reason-textarea"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
                placeholder="Provide a clear reason for this decision…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground/60 text-right">
                {reason.length}/500
              </p>
            </div>
          )}

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <p>{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button
            id="kyc-modal-cancel"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <LoadingButton
            id="kyc-modal-confirm"
            size="sm"
            disabled={!canSubmit || isSubmitting}
            isLoading={isSubmitting}
            loadingLabel="Submitting…"
            onClick={handleSubmit}
          >
            Confirm Decision
          </LoadingButton>
        </div>
      </div>
    </ModalBackdrop>
  )
}
