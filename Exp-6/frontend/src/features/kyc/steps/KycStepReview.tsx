/**
 * DVote Frontend — KycStepReview (KYC Wizard Step 5)
 *
 * Review and Submit — final step of the KYC wizard.
 *
 * L-C2 Aadhaar Masking Rule (CRITICAL):
 *   Aadhaar MUST be displayed masked as XXXX-XXXX-1234 on the Review step.
 *   It is fully visible during input steps (Steps 2–3) but NEVER on this step.
 *
 * EPIC is displayed in full (not masked) — official voter ID is not sensitive
 * in the review context.
 *
 * Candidate rule: EPIC absence at review is treated as validation failure —
 * Submit button is disabled and an inline error rendered.
 *
 * Submit action is gated on:
 *   1. All required fields present (canonical validation)
 *   2. useSensitiveActionGate: not blocked (freshness degraded = CDM-9)
 *   3. isSubmitting: false (prevents double-submit)
 *
 * Authority: walkthrough Phase K, L-C2, CDM-9, CDM-10
 */

import { CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  maskAadhaar,
  canonicalizeAadhaar,
  canonicalizeEPIC,
  isValidAadhaar,
  isValidEPIC,
  kycStatusLabel,
  AADHAAR_ONLY_REASON_CODES,
} from "@/lib/format/mask"
import { useKycWizardStore } from "@/state/kyc-wizard-store"
import { useSensitiveActionGate } from "@/hooks/useSensitiveActionGate"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepReviewProps {
  onBack: () => void
  /** Called when user clicks Submit — triggers POST /kyc/submissions or /submit */
  onSubmit: () => Promise<void>
}

// ─── Review row component ─────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
  isSensitive = false,
}: {
  label: string
  value: string | null | undefined
  isSensitive?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:items-center py-2.5">
      <dt className="text-xs font-medium text-muted-foreground sm:w-44 shrink-0">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium text-foreground break-words",
          isSensitive && "font-mono tracking-widest",
          !value && "text-muted-foreground italic",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  )
}

// ─── KycStepReview component ──────────────────────────────────────────────────

/**
 * Step 5 of KYC Wizard — Review and Submit.
 * Aadhaar masked per L-C2. EPIC displayed in full.
 */
export function KycStepReview({ onBack, onSubmit }: KycStepReviewProps) {
  const formData = useKycWizardStore((s) => s.formData)
  const isSubmitting = useKycWizardStore((s) => s.isSubmitting)
  const submitError = useKycWizardStore((s) => s.submitError)
  const existingState = useKycWizardStore((s) => s.existingState)

  // CDM-9: freshness gate
  const { isBlocked: isFreshnessBlocked, reason: freshnessReason } = useSensitiveActionGate()

  const { step1, step2, step3 } = formData

  // Derived display values
  const participantLabel = step1.participantType === "CANDIDATE" ? "Candidate" : "Voter"
  const canonicalAadhaar = canonicalizeAadhaar(step2.aadhaar)
  const maskedAadhaar = maskAadhaar(canonicalAadhaar)    // L-C2: MASKED on review
  const epicDisplay = canonicalizeEPIC(step2.epic) || null

  // Aadhaar-only reason label
  const reasonLabel =
    AADHAAR_ONLY_REASON_CODES.find((r) => r.value === step2.reasonCode)?.label ??
    step2.reasonCode

  // Validation for submit enablement
  const aadhaarValid = isValidAadhaar(canonicalAadhaar)
  const epicValid = step2.isAadhaarOnly
    ? true
    : step1.participantType === "CANDIDATE"
      ? isValidEPIC(epicDisplay ?? "")
      : isValidEPIC(epicDisplay ?? "")
  const profileValid =
    step3.fullName.trim().length >= 2 &&
    !!step3.dateOfBirth &&
    step3.addressLine1.trim().length >= 3 &&
    step3.city.trim().length >= 2 &&
    step3.state.trim().length >= 2 &&
    /^\d{6}$/.test(step3.pincode)

  const candidateEpicMissing =
    step1.participantType === "CANDIDATE" && !isValidEPIC(epicDisplay ?? "")

  const canSubmit =
    aadhaarValid &&
    epicValid &&
    profileValid &&
    !candidateEpicMissing &&
    !isFreshnessBlocked &&
    !isSubmitting

  const fullAddress = [
    step3.addressLine1,
    step3.addressLine2,
    step3.city,
    step3.state,
    step3.pincode,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please review your details before submitting for KYC verification.
          Once submitted, your application will be reviewed by the election owner.
        </p>
      </div>

      {/* Existing submission status (if resuming) */}
      {existingState && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            Existing submission:{" "}
            <span className="font-semibold">{kycStatusLabel(existingState)}</span>
          </span>
        </div>
      )}

      {/* Review sections */}
      <dl className="divide-y divide-border rounded-lg border bg-card px-4">
        {/* Identity */}
        <div className="py-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">
            Identity
          </p>
          <ReviewRow label="Participation Role" value={participantLabel} />
          <ReviewRow
            label="Aadhaar Number"
            value={maskedAadhaar}
            isSensitive
          />
          {!step2.isAadhaarOnly && (
            <ReviewRow label="EPIC Voter ID" value={epicDisplay} isSensitive />
          )}
          {step2.isAadhaarOnly && (
            <>
              <ReviewRow label="Fallback Path" value="Aadhaar-only" />
              <ReviewRow label="Reason" value={reasonLabel} />
            </>
          )}
        </div>

        <Separator />

        {/* Profile */}
        <div className="py-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">
            Profile
          </p>
          <ReviewRow label="Full Name" value={step3.fullName} />
          <ReviewRow
            label="Date of Birth"
            value={
              step3.dateOfBirth
                ? new Date(step3.dateOfBirth).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null
            }
          />
          <ReviewRow label="Address" value={fullAddress} />
        </div>
      </dl>

      {/* Candidate EPIC missing error */}
      {candidateEpicMissing && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive text-sm"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <span className="font-semibold">Cannot submit:</span> Candidate KYC
            requires a valid EPIC voter ID. Please go back to Step 2 and enter
            your EPIC number.
          </p>
        </div>
      )}

      {/* Freshness gate error */}
      {isFreshnessBlocked && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive text-sm"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>{freshnessReason}</p>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive text-sm"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <span className="font-semibold">Submission failed:</span> {submitError}
          </p>
        </div>
      )}

      {/* L-C2 disclosure note */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Your Aadhaar is shown masked for security (
        <span className="font-mono">XXXX-XXXX-1234</span>). Once submitted, your
        information is encrypted and can only be reviewed by authorised election officials.
      </p>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          id="kyc-step5-back"
          onClick={onBack}
          variant="outline"
          type="button"
          disabled={isSubmitting}
        >
          Back
        </Button>
        <LoadingButton
          id="kyc-step5-submit"
          onClick={onSubmit}
          isLoading={isSubmitting}
          disabled={!canSubmit}
          loadingLabel="Submitting…"
          title={isFreshnessBlocked ? freshnessReason : undefined}
        >
          Submit KYC Application
        </LoadingButton>
      </div>
    </div>
  )
}
