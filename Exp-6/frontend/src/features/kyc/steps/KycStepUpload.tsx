/**
 * DVote Frontend — KycStepUpload (KYC Wizard Step 4)
 *
 * Document Upload step — Phase L placeholder.
 *
 * This step is intentionally a minimal placeholder in Phase K.
 * Full upload authorize/finalize/TTL lifecycle will be implemented in Phase L.
 *
 * For the Aadhaar-only fallback path (CDM-9 aware):
 *   - At least 1 additional evidence file is required before submit (backend enforced).
 *   - The placeholder shows a clear message about this requirement.
 *
 * For the Phase K milestone, the step renders:
 *   - Aadhaar-only path: warning about mandatory upload requirement
 *   - Standard path: advisory message stating no upload required
 *   - Back/Continue navigation buttons
 *
 * Authority: walkthrough Phase K (placeholder), Phase L (full impl)
 */

import { Upload, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useKycWizardStore } from "@/state/kyc-wizard-store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepUploadProps {
  onNext: () => void
  onBack: () => void
}

// ─── KycStepUpload component ──────────────────────────────────────────────────

/**
 * Step 4 of KYC Wizard — Document Upload placeholder.
 * Full implementation in Phase L (Upload Authorize/Finalize TTL Guardrails).
 */
export function KycStepUpload({ onNext, onBack }: KycStepUploadProps) {
  const isAadhaarOnly = useKycWizardStore((s) => s.formData.step2.isAadhaarOnly)

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Document Upload</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload supporting identity documents for your KYC submission.
        </p>
      </div>

      {/* Aadhaar-only path warning */}
      {isAadhaarOnly ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 space-y-3">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Additional Evidence Required</p>
              <p className="text-xs mt-1 leading-relaxed">
                Since you are using the Aadhaar-only fallback path, you must upload
                at least one additional evidence document (e.g., a government-issued photo ID,
                birth certificate, or utility bill). Your KYC submission cannot be finalized
                without this evidence.
              </p>
            </div>
          </div>

          {/* Phase L placeholder */}
          <div className="rounded-md border border-amber-200 bg-amber-100/60 p-4 flex flex-col items-center gap-3 text-center">
            <Upload className="size-8 text-amber-600" aria-hidden="true" />
            <p className="text-sm text-amber-700 font-medium">
              Upload functionality coming in Phase L
            </p>
            <p className="text-xs text-amber-600">
              Evidence document upload, file validation, and finalize-bind will be
              fully implemented in the next phase. You can proceed through the wizard now.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-4">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No Mandatory Uploads for Standard Path
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                For the standard verification path (Aadhaar + EPIC), no additional
                document uploads are required. You may still upload supporting documents
                to strengthen your application. Full upload functionality will be available in
                the next release.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button id="kyc-step4-back" onClick={onBack} variant="outline" type="button">
          Back
        </Button>
        <Button id="kyc-step4-next" onClick={onNext} type="button">
          Review & Submit
        </Button>
      </div>
    </div>
  )
}
