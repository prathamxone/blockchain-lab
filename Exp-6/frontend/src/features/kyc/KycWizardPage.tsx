/**
 * DVote Frontend — KycWizardPage (KYC Wizard Orchestrator)
 *
 * 5-step KYC submission wizard page. Entry point from /kyc?electionId=...
 *
 * On mount:
 *   1. Reads electionId + constituencyId from query params.
 *   2. Calls GET /kyc/me?electionId= to check for existing server draft.
 *   3. If server draft found → check state:
 *      - DRAFT | NEEDS_RESUBMISSION → set draftConflict → show KycResumeConflictModal
 *      - Other states (SUBMITTED, QUEUED, APPROVED etc.) → show status page (not wizard)
 *   4. If no draft → initialize wizard from step 1.
 *
 * Step navigation:
 *   1 → 2 → 3 → 4 → 5 → Submit
 *
 * Submit (Step 5):
 *   POST /kyc/submissions with all form data (canonicalized)
 *   On success: navigate to /profile (or show success screen)
 *
 * CDM-7 compliance: resumedStep is restored after re-auth.
 * CDM-10 compliance: KycResumeConflictModal shown when server draft exists.
 *
 * Authority: walkthrough Phase K, CDM-7, CDM-10, backend /kyc routes.ts
 */

import { useEffect, useState, useCallback } from "react"
import { useSearch } from "@tanstack/react-router"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

import { apiClient, ApiError } from "@/lib/api-client"
import { canonicalizeAadhaar, canonicalizeEPIC, kycStatusLabel } from "@/lib/format/mask"
import { useKycWizardStore } from "@/state/kyc-wizard-store"
import { KycResumeConflictModal } from "@/features/kyc/KycResumeConflictModal"
import { KycStepIdentityType } from "@/features/kyc/steps/KycStepIdentityType"
import { KycStepDocuments } from "@/features/kyc/steps/KycStepDocuments"
import { KycStepProfile } from "@/features/kyc/steps/KycStepProfile"
import { KycStepUpload } from "@/features/kyc/steps/KycStepUpload"
import { KycStepReview } from "@/features/kyc/steps/KycStepReview"
import { KYC_STEP_LABELS, type KycWizardStep, type ServerDraftMeta } from "@/state/kyc-wizard-store"
import { cn } from "@/lib/utils"
import type { KycStatus } from "@/lib/format/mask"

// ─── API response types ───────────────────────────────────────────────────────

interface KycMeResponse {
  submission: {
    submissionId: string
    state: KycStatus
    submittedAt: string | null
    isAadhaarOnly: boolean
  } | null
}

interface KycCreateResponse {
  submissionId: string
  state: KycStatus
}

// ─── Step progress indicator ──────────────────────────────────────────────────

function WizardStepBar({
  currentStep,
  totalSteps,
}: {
  currentStep: KycWizardStep
  totalSteps: number
}) {
  return (
    <nav aria-label="KYC wizard progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const stepLabel = KYC_STEP_LABELS[step as KycWizardStep]

          return (
            <li key={step} className="flex-1 flex items-center">
              <div className="flex flex-col items-center w-full">
                {/* Step circle */}
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-background border-primary text-primary ring-2 ring-primary/20"
                        : "bg-background border-border text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    step
                  )}
                </div>
                {/* Step label */}
                <span
                  className={cn(
                    "text-xs mt-1.5 text-center hidden sm:block",
                    isCurrent ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  {stepLabel}
                </span>
              </div>
              {/* Connector line */}
              {step < totalSteps && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 transition-colors",
                    step < currentStep ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Submitted status page ────────────────────────────────────────────────────

function KycSubmittedStatus({ state }: { state: KycStatus }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-semibold">
        KYC Application: {kycStatusLabel(state)}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        Your KYC application for this election is already{" "}
        <span className="font-medium">{kycStatusLabel(state).toLowerCase()}</span>.
        No further action is required at this time.
      </p>
    </div>
  )
}

// ─── KycWizardPage component ──────────────────────────────────────────────────

// States that are terminal — wizard should not be shown
const TERMINAL_STATES: KycStatus[] = ["SUBMITTED", "QUEUED", "UNDER_REVIEW", "APPROVED"]

// Fields: electionId and constituencyId come from router search params
// The wizard expects ?electionId=xxx&constituencyId=xxx in the URL

/**
 * KYC submission wizard page.
 * Mounts at /kyc route. Requires ?electionId + ?constituencyId query params.
 */
export function KycWizardPage() {
  // Route query params
  const search = useSearch({ strict: false }) as Record<string, string>
  const electionId = (search.electionId as string) || ""
  const constituencyId = (search.constituencyId as string) || ""

  // Store accessors
  const currentStep = useKycWizardStore((s) => s.currentStep)
  const draftConflict = useKycWizardStore((s) => s.draftConflict)
  const serverDraftMeta = useKycWizardStore((s) => s.serverDraftMeta)
  const resumedStep = useKycWizardStore((s) => s.resumedStep)
  const {
    initWizard,
    setStep,
    setServerDraft,
    resolveDraftConflict,
    setSubmitting,
    setSubmitError,
    setResumedStep,
    resetWizard,
  } = useKycWizardStore.getState()

  const [isLoading, setIsLoading] = useState(true)
  const [terminalState, setTerminalState] = useState<KycStatus | null>(null)
  const [paramError, setParamError] = useState<string | null>(null)

  // ── Mount: check for existing draft ────────────────────────────────────────

  const checkExistingDraft = useCallback(async () => {
    if (!electionId) {
      setParamError("electionId is required. Please navigate from an election page.")
      setIsLoading(false)
      return
    }
    if (!constituencyId) {
      setParamError("constituencyId is required. Please navigate from an election page.")
      setIsLoading(false)
      return
    }

    try {
      const data = await apiClient.get<KycMeResponse>(
        `/kyc/me?electionId=${encodeURIComponent(electionId)}`
      )

      if (data.submission) {
        const { submissionId, state, submittedAt, isAadhaarOnly } = data.submission

        if (TERMINAL_STATES.includes(state)) {
          // Terminal state — show status page, not wizard
          setTerminalState(state)
          setIsLoading(false)
          return
        }

        // DRAFT or NEEDS_RESUBMISSION — CDM-10 conflict path
        const meta: ServerDraftMeta = {
          submissionId,
          state,
          submittedAt,
          isAadhaarOnly,
        }
        initWizard({ electionId, constituencyId })
        setServerDraft(meta)

        // CDM-7: if resumedStep was stored (re-auth restore), apply it
        if (resumedStep) {
          setStep(resumedStep)
          setResumedStep(null)
        }
      } else {
        // No existing draft — start fresh
        initWizard({ electionId, constituencyId })

        // CDM-7: if resumedStep was stored (re-auth restore), apply it
        if (resumedStep) {
          setStep(resumedStep)
          setResumedStep(null)
        }
      }
    } catch (err) {
      // If 404 = no submission exists (some backends return 404 for /kyc/me)
      if (err instanceof ApiError && err.httpStatus === 404) {
        initWizard({ electionId, constituencyId })
      } else {
        toast.error("Failed to check existing KYC status. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [electionId, constituencyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void checkExistingDraft()
    return () => resetWizard()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // intentionally run once on mount only

  // ── Submit handler ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const { formData, existingSubmissionId } = useKycWizardStore.getState()
    // step3 (profile) not sent to backend in Phase K — no profile fields in createSchema
    const { step1, step2, additionalEvidenceRefs } = formData

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Canonicalize identity fields before submission
      const canonicalAadhaar = canonicalizeAadhaar(step2.aadhaar)
      const canonicalEpic = step2.isAadhaarOnly ? undefined : canonicalizeEPIC(step2.epic) || undefined

      // Build the POST payload (matches backend createSchema)
      const payload: Record<string, unknown> = {
        electionId,
        constituencyId,
        participantType: step1.participantType,
        aadhaar: canonicalAadhaar,
        // Profile data (name, DOB, address) → not in createSchema but useful for audit
        // Backend stores identity encrypted; profile may be used in Phase M
      }

      if (canonicalEpic) payload.epic = canonicalEpic
      if (step2.isAadhaarOnly) {
        payload.isAadhaarOnly = true
        payload.reasonCode = step2.reasonCode
      }
      if (additionalEvidenceRefs.length > 0) {
        payload.additionalEvidenceRefs = additionalEvidenceRefs
      }

      if (existingSubmissionId) {
        // Resume: submit the existing draft
        await apiClient.post<KycCreateResponse>(
          `/kyc/submissions/${existingSubmissionId}/submit`,
          {}
        )
      } else {
        // New submission: create draft then submit
        const created = await apiClient.post<KycCreateResponse>("/kyc/submissions", payload)
        // Immediately submit the draft
        await apiClient.post(`/kyc/submissions/${created.submissionId}/submit`, {})
      }

      toast.success("KYC application submitted successfully!", {
        description: "Your application is now in review queue.",
      })

      // Navigate to profile or show success
      setTerminalState("SUBMITTED")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "An unexpected error occurred. Please try again."
      setSubmitError(message)
      toast.error("Submission failed", { description: message })
    } finally {
      setSubmitting(false)
    }
  }, [electionId, constituencyId, setSubmitting, setSubmitError])

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const goNext = () => {
    if (currentStep < 5) setStep((currentStep + 1) as KycWizardStep)
  }
  const goBack = () => {
    if (currentStep > 1) setStep((currentStep - 1) as KycWizardStep)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin size-8 rounded-full border-4 border-primary border-t-transparent" aria-label="Loading KYC status…" />
      </div>
    )
  }

  if (paramError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        <p className="font-semibold mb-2">Missing Required Parameters</p>
        <p>{paramError}</p>
      </div>
    )
  }

  if (terminalState) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <KycSubmittedStatus state={terminalState} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your identity verification to participate in the election.
        </p>
      </div>

      {/* Step progress bar */}
      <WizardStepBar currentStep={currentStep} totalSteps={5} />

      {/* CDM-10: Draft conflict modal — non-dismissable */}
      <KycResumeConflictModal
        open={draftConflict}
        serverState={serverDraftMeta?.state ?? "DRAFT"}
        serverSubmittedAt={serverDraftMeta?.submittedAt ?? null}
        onUseServer={() => resolveDraftConflict("server")}
        onUseLocal={() => resolveDraftConflict("local")}
      />

      {/* Step content panel */}
      <div className="rounded-2xl border bg-card shadow-sm px-6 py-6">
        {currentStep === 1 && <KycStepIdentityType onNext={goNext} />}
        {currentStep === 2 && <KycStepDocuments onNext={goNext} onBack={goBack} />}
        {currentStep === 3 && <KycStepProfile onNext={goNext} onBack={goBack} />}
        {currentStep === 4 && <KycStepUpload onNext={goNext} onBack={goBack} />}
        {currentStep === 5 && (
          <KycStepReview onBack={goBack} onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  )
}
