/**
 * DVote Frontend — KycStepUpload (KYC Wizard Step 4) — FULL IMPLEMENTATION
 *
 * Replaces the Phase K placeholder. Implements the full upload lifecycle
 * for KYC evidence documents:
 *
 *   authorize → PUT (direct to R2) → compute SHA-256 → finalize-bind
 *
 * CDM-11 Compliance:
 *   - Aadhaar-only path: at least 1 finalized evidence document required.
 *   - Standard path: upload is optional (bonus evidence).
 *   - "Continue" button is disabled until required artifacts are finalized.
 *   - Finalize-bind status is tracked in kyc-wizard-store via addUploadArtifact.
 *
 * Upload slot:
 *   - Single upload slot per KYC submission in Phase L (MVP).
 *   - Phase M may add multiple slots or profile photo.
 *
 * TTL Handling (CDM-11):
 *   - Per-artifact TTL countdown shown while contract is alive.
 *   - On expiry: UploadCard shows "Contract expired" state with Re-upload CTA.
 *   - Re-upload = resetUpload() + file picker re-opens.
 *   - Draft data preserved on expiry.
 *
 * Error handling:
 *   - MIME / size rejected before authorize call (client-side).
 *   - Size mismatch, checksum error, scanner unavailable → shown deterministically.
 *
 * Authority: walkthrough Phase L, CDM-11, Plan Phase 12,
 *            backend uploads/routes.ts, upload-authorize/finalize service
 */

import { useCallback } from "react"
import { AlertTriangle, Info, CheckCircle2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UploadCard } from "@/components/ui/UploadCard"
import { useUploadContract } from "@/hooks/useUploadContract"
import {
  useKycWizardStore,
  allArtifactsFinalized,
  type UploadArtifactRecord,
} from "@/state/kyc-wizard-store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepUploadProps {
  onNext: () => void
  onBack: () => void
}

// ─── KycStepUpload component ──────────────────────────────────────────────────

/**
 * Step 4 of KYC Wizard — Document Upload.
 *
 * Uses useUploadContract hook for a single evidence document slot.
 * Aadhaar-only path requires at least 1 finalized artifact before Continue.
 */
export function KycStepUpload({ onNext, onBack }: KycStepUploadProps) {
  const isAadhaarOnly = useKycWizardStore((s) => s.formData.step2.isAadhaarOnly)
  const electionId = useKycWizardStore((s) => s.electionId) ?? ""
  const constituencyId = useKycWizardStore((s) => s.constituencyId) ?? ""
  const existingSubmissionId = useKycWizardStore((s) => s.existingSubmissionId) ?? ""
  const uploadArtifacts = useKycWizardStore((s) => s.formData.uploadArtifacts)
  const addUploadArtifact = useKycWizardStore((s) => s.addUploadArtifact)
  const removeUploadArtifact = useKycWizardStore((s) => s.removeUploadArtifact)

  // CDM-11: compute if submit gate passed
  const artifactsReady = allArtifactsFinalized(isAadhaarOnly, uploadArtifacts)

  // ── Evidence upload slot through useUploadContract ────────────────────────

  const handleFinalizeSuccess = useCallback(
    (artifactId: string, objectKey: string) => {
      // Only add if not already present (avoid duplicate on re-render)
      if (!uploadArtifacts.find((a) => a.artifactId === artifactId)) {
        const record: UploadArtifactRecord = {
          artifactId,
          objectKey,
          artifactType: "DOCUMENT",
          fileName: evidenceUpload.selectedFile?.name ?? "document",
        }
        addUploadArtifact(record)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadArtifacts, addUploadArtifact]
  )

  const evidenceUpload = useUploadContract({
    artifactType: "DOCUMENT",
    submissionId: existingSubmissionId,
    electionId,
    constituencyId,
    onFinalizeSuccess: handleFinalizeSuccess,
  })

  const handleEvidenceReset = useCallback(() => {
    // If a finalized artifact was already stored, remove it
    if (evidenceUpload.artifactId) {
      removeUploadArtifact(evidenceUpload.artifactId)
    }
    evidenceUpload.resetUpload()
  }, [evidenceUpload, removeUploadArtifact])

  // ── No submissionId guard ─────────────────────────────────────────────────

  if (!existingSubmissionId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Document Upload</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload supporting identity documents for your KYC submission.
          </p>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 flex items-start gap-2 text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Submission ID not available</p>
            <p className="text-xs mt-1">
              Please go back and ensure your KYC submission was created before uploading.
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button id="kyc-step4-back" onClick={onBack} variant="outline" type="button">
            Back
          </Button>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Document Upload</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload supporting identity documents for your KYC submission.
        </p>
      </div>

      {/* Aadhaar-only path: mandatory upload banner */}
      {isAadhaarOnly && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2 text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Additional Evidence Required</p>
            <p className="text-xs mt-1 leading-relaxed">
              Since you selected the Aadhaar-only fallback path, you must upload at least
              one additional identity document (e.g., birth certificate, utility bill, or
              government-issued photo ID). Your KYC cannot be submitted without this evidence.
            </p>
          </div>
        </div>
      )}

      {/* Standard path: advisory */}
      {!isAadhaarOnly && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-start gap-2">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Optional:</span> Upload additional
            supporting documents to strengthen your verification. Standard path (Aadhaar + EPIC)
            does not require any uploads.
          </p>
        </div>
      )}

      {/* Evidence upload slot */}
      <div className="space-y-3">
        <UploadCard
          id="kyc-evidence-upload"
          label={isAadhaarOnly ? "Additional Evidence Document" : "Supporting Document"}
          required={isAadhaarOnly}
          artifactType="DOCUMENT"
          status={evidenceUpload.status}
          progress={evidenceUpload.progress}
          secondsRemaining={evidenceUpload.secondsRemaining}
          errorMessage={evidenceUpload.errorMessage}
          fileName={evidenceUpload.selectedFile?.name}
          onFileSelect={evidenceUpload.startUpload}
          onReset={handleEvidenceReset}
        />

        {/* Upload policy note */}
        <p className="text-xs text-muted-foreground">
          Accepted: Images (JPEG, PNG, WEBP) or PDF · Max 10 MB
        </p>
      </div>

      {/* Finalized artifacts summary */}
      {uploadArtifacts.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Bound Artifacts
          </p>
          <ul className="space-y-1">
            {uploadArtifacts.map((a) => (
              <li key={a.artifactId} className="flex items-center gap-2 text-xs text-green-700">
                <Upload className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{a.fileName}</span>
                <span className="shrink-0 text-green-600/70 font-mono text-xs">
                  scan-pending
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CDM-11 gate: continue disabled when required artifacts not finalized */}
      {isAadhaarOnly && !artifactsReady && (
        <p className="text-xs text-destructive text-center" role="status">
          At least one evidence document must be uploaded and verified before continuing.
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          id="kyc-step4-back"
          onClick={onBack}
          variant="outline"
          type="button"
        >
          Back
        </Button>
        <Button
          id="kyc-step4-next"
          onClick={onNext}
          type="button"
          disabled={!artifactsReady}
          title={
            !artifactsReady
              ? "Upload and finalize at least one evidence document to continue"
              : undefined
          }
        >
          Review &amp; Submit
        </Button>
      </div>
    </div>
  )
}
