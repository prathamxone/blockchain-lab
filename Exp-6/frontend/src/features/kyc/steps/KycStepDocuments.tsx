/**
 * DVote Frontend — KycStepDocuments (KYC Wizard Step 2)
 *
 * Identity document inputs for Aadhaar and EPIC.
 * Also handles the Aadhaar-only fallback path (VOTER only).
 *
 * Validation rules (mirrors backend kyc.validators.ts):
 *   VOTER standard path:     Aadhaar (required) + EPIC (required unless Aadhaar-only)
 *   VOTER Aadhaar-only path: Aadhaar (required) + reasonCode (required) — no EPIC
 *   CANDIDATE path:          Aadhaar (required) + EPIC (required). No Aadhaar-only.
 *
 * Aadhaar display (L-C2):
 *   - Displayed fully visible during input (XXXX XXXX XXXX format)
 *   - Never masked at this step
 *   - Masked only on Review step (Step 5)
 *
 * Authority: walkthrough Phase K, kyc.validators.ts, mask.ts utilities
 */

import { useState } from "react"
import { AlertCircle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  formatAadhaarDisplay,
  canonicalizeAadhaar,
  isValidAadhaar,
  canonicalizeEPIC,
  isValidEPIC,
  AADHAAR_ONLY_REASON_CODES,
} from "@/lib/format/mask"
import { useKycWizardStore } from "@/state/kyc-wizard-store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepDocumentsProps {
  onNext: () => void
  onBack: () => void
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface DocumentsValidation {
  aadhaarError: string | null
  epicError: string | null
  reasonCodeError: string | null
}

function validateDocuments(params: {
  participantType: "VOTER" | "CANDIDATE"
  aadhaar: string
  epic: string
  isAadhaarOnly: boolean
  reasonCode: string
}): DocumentsValidation {
  const canonical = canonicalizeAadhaar(params.aadhaar)
  const epicCanonical = canonicalizeEPIC(params.epic)

  const aadhaarError = !isValidAadhaar(canonical)
    ? "Enter a valid 12-digit Aadhaar number"
    : null

  let epicError: string | null = null
  if (params.participantType === "CANDIDATE") {
    if (!isValidEPIC(epicCanonical)) {
      epicError = "Candidates must provide a valid 10-character EPIC"
    }
  } else if (!params.isAadhaarOnly) {
    if (!isValidEPIC(epicCanonical)) {
      epicError = "Enter a valid EPIC, or choose Aadhaar-only fallback"
    }
  }

  const reasonCodeError =
    params.isAadhaarOnly && !params.reasonCode
      ? "Select a reason for using Aadhaar-only fallback"
      : null

  return { aadhaarError, epicError, reasonCodeError }
}

// ─── KycStepDocuments component ───────────────────────────────────────────────

/**
 * Step 2 of KYC Wizard — Aadhaar and EPIC document inputs.
 * Handles voter standard, voter Aadhaar-only fallback, and candidate paths.
 */
export function KycStepDocuments({ onNext, onBack }: KycStepDocumentsProps) {
  const participantType = useKycWizardStore((s) => s.formData.step1.participantType)
  const { aadhaar, epic, isAadhaarOnly, reasonCode } = useKycWizardStore((s) => s.formData.step2)
  const updateStep2 = useKycWizardStore((s) => s.updateStep2)

  const [touched, setTouched] = useState({ aadhaar: false, epic: false, reasonCode: false })
  const [submitted, setSubmitted] = useState(false)

  const isCandidate = participantType === "CANDIDATE"

  const validation = validateDocuments({
    participantType: participantType ?? "VOTER",
    aadhaar,
    epic,
    isAadhaarOnly,
    reasonCode,
  })

  const hasErrors =
    !!validation.aadhaarError ||
    !!validation.epicError ||
    !!validation.reasonCodeError

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format input as "XXXX XXXX XXXX" but store raw digits
    const raw = e.target.value.replace(/[^\d\s]/g, "").replace(/\s+/g, " ").trim()
    updateStep2({ aadhaar: raw })
  }

  const handleEpicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateStep2({ epic: e.target.value.toUpperCase() })
  }

  const handleAadhaarOnlyToggle = () => {
    if (isCandidate) return // Candidates cannot use Aadhaar-only
    updateStep2({ isAadhaarOnly: !isAadhaarOnly, epic: "", reasonCode: "" })
  }

  const handleNext = () => {
    setSubmitted(true)
    setTouched({ aadhaar: true, epic: true, reasonCode: true })
    if (!hasErrors) onNext()
  }

  // ── Field error display logic ────────────────────────────────────────────────

  const showAadhaarError = (touched.aadhaar || submitted) && !!validation.aadhaarError
  const showEpicError = (touched.epic || submitted) && !!validation.epicError
  const showReasonCodeError = (touched.reasonCode || submitted) && !!validation.reasonCodeError

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Identity Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your identity documents for KYC verification.
          {isCandidate && (
            <span className="text-amber-700 font-medium">
              {" "}Both Aadhaar and EPIC are mandatory for candidates.
            </span>
          )}
        </p>
      </div>

      {/* Aadhaar input */}
      <div className="space-y-2">
        <Label htmlFor="kyc-aadhaar">
          Aadhaar Number <span className="text-destructive" aria-label="required">*</span>
        </Label>
        <Input
          id="kyc-aadhaar"
          type="text"
          inputMode="numeric"
          placeholder="1234 5678 9012"
          value={formatAadhaarDisplay(aadhaar)}
          onChange={handleAadhaarChange}
          onBlur={() => setTouched((t) => ({ ...t, aadhaar: true }))}
          maxLength={14} // 12 digits + 2 spaces
          className={cn(showAadhaarError && "border-destructive focus-visible:ring-destructive")}
          aria-invalid={showAadhaarError}
          aria-describedby={showAadhaarError ? "kyc-aadhaar-error" : undefined}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Your Aadhaar number is encrypted and never stored in plain text.
        </p>
        {showAadhaarError && (
          <p id="kyc-aadhaar-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validation.aadhaarError}
          </p>
        )}
      </div>

      {/* Aadhaar-only fallback toggle (VOTER only) */}
      {!isCandidate && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <input
              id="kyc-aadhaar-only"
              type="checkbox"
              checked={isAadhaarOnly}
              onChange={handleAadhaarOnlyToggle}
              className="mt-0.5 size-4 accent-primary cursor-pointer"
              aria-describedby="kyc-aadhaar-only-desc"
            />
            <div>
              <label htmlFor="kyc-aadhaar-only" className="text-sm font-medium cursor-pointer">
                I do not have my EPIC voter ID card
              </label>
              <p id="kyc-aadhaar-only-desc" className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                <HelpCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                Aadhaar-only fallback requires a mandatory reason code and at least one additional
                evidence document (uploaded in the next step).
              </p>
            </div>
          </div>

          {/* Reason code selector */}
          {isAadhaarOnly && (
            <div className="space-y-2 pl-7">
              <Label htmlFor="kyc-reason-code">
                Reason for Aadhaar-only fallback{" "}
                <span className="text-destructive" aria-label="required">*</span>
              </Label>
              <Select
                value={reasonCode}
                onValueChange={(v) => {
                  updateStep2({ reasonCode: v ?? "" })
                  setTouched((t) => ({ ...t, reasonCode: true }))
                }}
              >
                <SelectTrigger
                  id="kyc-reason-code"
                  className={cn(showReasonCodeError && "border-destructive")}
                  aria-invalid={showReasonCodeError}
                  aria-describedby={showReasonCodeError ? "kyc-reason-code-error" : undefined}
                >
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {AADHAAR_ONLY_REASON_CODES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showReasonCodeError && (
                <p id="kyc-reason-code-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {validation.reasonCodeError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* EPIC input (hidden if Aadhaar-only) */}
      {!isAadhaarOnly && (
        <div className="space-y-2">
          <Label htmlFor="kyc-epic">
            EPIC Voter ID Card{" "}
            {isCandidate ? (
              <span className="text-destructive" aria-label="required">*</span>
            ) : (
              <span className="text-muted-foreground text-xs">(recommended)</span>
            )}
          </Label>
          <Input
            id="kyc-epic"
            type="text"
            placeholder="ABC1234567"
            value={epic}
            onChange={handleEpicChange}
            onBlur={() => setTouched((t) => ({ ...t, epic: true }))}
            maxLength={10}
            className={cn(
              "uppercase font-mono tracking-wider",
              showEpicError && "border-destructive focus-visible:ring-destructive",
            )}
            aria-invalid={showEpicError}
            aria-describedby={showEpicError ? "kyc-epic-error" : undefined}
            autoComplete="off"
          />
          {showEpicError && (
            <p id="kyc-epic-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {validation.epicError}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          id="kyc-step2-back"
          onClick={onBack}
          variant="outline"
          type="button"
        >
          Back
        </Button>
        <Button
          id="kyc-step2-next"
          onClick={handleNext}
          type="button"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

