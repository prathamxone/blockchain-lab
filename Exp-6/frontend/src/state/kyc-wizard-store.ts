/**
 * DVote Frontend — KYC Wizard Store (Zustand)
 *
 * In-memory wizard state for the 5-step KYC submission flow.
 *
 * CDM-10 (Draft Conflict) is enforced here:
 *   - draftConflict: true if server draft is newer than local
 *   - defaulting to server; local overwrite requires explicit user action
 *
 * CDM-7 compliance: resumedStep tracks the exact step to navigate to
 * after re-auth. No auto-submit on resume — only exact step restore.
 *
 * Steps:
 *   1 = IdentityType  (voter / candidate)
 *   2 = Documents     (Aadhaar, EPIC, Aadhaar-only path)
 *   3 = Profile       (name, DOB, address)
 *   4 = Upload        (document artifacts — Phase L)
 *   5 = Review        (masked Aadhaar, final submit)
 *
 * Form data is held in-memory only (never localStorage/sessionStorage — L-B1).
 * On session clear, the wizard state is reset.
 *
 * Authority: walkthrough Phase K+L, CDM-7, CDM-10, CDM-11, FEATURE_FRONTEND §6.5
 */

import { create } from "zustand"
import type { KycStatus } from "@/lib/format/mask"

// ─── Upload artifact tracking (CDM-11) ───────────────────────────────────────

/**
 * Represents a finalize-bound upload artifact.
 * Only artifacts with status="scan-pending" (finalized) count toward CDM-11 gate.
 */
export interface UploadArtifactRecord {
  /** artifactId from POST /uploads/finalize response */
  artifactId: string
  /** objectKey from POST /uploads/finalize response */
  objectKey: string
  /** "DOCUMENT" | "PROFILE_PHOTO" */
  artifactType: "DOCUMENT" | "PROFILE_PHOTO"
  /** Original filename for display */
  fileName: string
}

// ─── KYC Wizard step numbering ────────────────────────────────────────────────

export type KycWizardStep = 1 | 2 | 3 | 4 | 5

export const KYC_STEP_LABELS: Record<KycWizardStep, string> = {
  1: "Identity Type",
  2: "Documents",
  3: "Profile Details",
  4: "Document Upload",
  5: "Review & Submit",
}

// ─── Form data shape ──────────────────────────────────────────────────────────

/** Participant type as returned by backend (frozen enum). */
export type ParticipantType = "VOTER" | "CANDIDATE"

/** Step 1 form data */
export interface IdentityTypeData {
  participantType: ParticipantType | null
}

/** Step 2 form data */
export interface DocumentsData {
  /** Raw Aadhaar input (not yet canonicalized — canonicalize on submit) */
  aadhaar: string
  /** Raw EPIC input. Required for CANDIDATE. Optional for VOTER with full path. */
  epic: string
  /** True when VOTER selects the Aadhaar-only fallback path */
  isAadhaarOnly: boolean
  /** Required when isAadhaarOnly is true */
  reasonCode: string
}

/** Step 3 form data */
export interface ProfileData {
  fullName: string
  dateOfBirth: string   // ISO-8601 date string (YYYY-MM-DD)
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
}

/** Combined wizard form data */
export interface KycWizardFormData {
  step1: IdentityTypeData
  step2: DocumentsData
  step3: ProfileData
  /** Upload artifact IDs from Step 4 (finalized in Phase L) */
  additionalEvidenceRefs: string[]
  /**
   * Phase L upload artifacts — CDM-11 finalize-bind tracking.
   * Each entry represents a confirmed finalize-bound artifact.
   * Submit MUST remain disabled until required artifacts are here.
   */
  uploadArtifacts: UploadArtifactRecord[]
}

// ─── Draft metadata ───────────────────────────────────────────────────────────

/** Draft comparison info from GET /kyc/me for CDM-10 conflict detection */
export interface ServerDraftMeta {
  submissionId: string
  state: KycStatus
  submittedAt: string | null
  isAadhaarOnly: boolean
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface KycWizardStoreState {
  /** Active step in the wizard (1–5) */
  currentStep: KycWizardStep

  /** Wizard is open / active (mounted on page) */
  isOpen: boolean

  /** Target electionId for this KYC submission (from route param) */
  electionId: string | null

  /** Target constituencyId for this KYC submission */
  constituencyId: string | null

  /** submissionId if a DRAFT or NEEDS_RESUBMISSION exists on the server */
  existingSubmissionId: string | null

  /** Current KYC state from the server (null if no prior submission) */
  existingState: KycStatus | null

  /** CDM-10: true when server draft was detected and needs user resolution */
  draftConflict: boolean

  /** Server draft metadata for CDM-10 conflict modal */
  serverDraftMeta: ServerDraftMeta | null

  /** Combined form data for all steps */
  formData: KycWizardFormData

  /** True while POST /kyc/submissions or /submit is in-flight */
  isSubmitting: boolean

  /** Error from last submit/save attempt. null if none. */
  submitError: string | null

  /** CDM-7: Step to restore after re-auth. null = start from step 1. */
  resumedStep: KycWizardStep | null
}

interface KycWizardStoreActions {
  /** Initialize wizard for a given election (sets electionId, resets other state) */
  initWizard: (params: { electionId: string; constituencyId: string }) => void

  /** Set the current wizard step */
  setStep: (step: KycWizardStep) => void

  /** Update Step 1 form data */
  updateStep1: (data: Partial<IdentityTypeData>) => void

  /** Update Step 2 form data */
  updateStep2: (data: Partial<DocumentsData>) => void

  /** Update Step 3 form data */
  updateStep3: (data: Partial<ProfileData>) => void

  /** Update additionalEvidenceRefs (Phase L — legacy compat) */
  setEvidenceRefs: (refs: string[]) => void

  // ── Phase L: CDM-11 upload artifact actions ──────────────────────────────

  /** Add a finalize-bound artifact to the store (CDM-11 gate) */
  addUploadArtifact: (artifact: UploadArtifactRecord) => void

  /** Remove an artifact by artifactId (on user removing uploaded file) */
  removeUploadArtifact: (artifactId: string) => void

  /** Clear all upload artifacts (on wizard reset or re-auth) */
  clearUploadArtifacts: () => void

  /** Set the server draft metadata (from GET /kyc/me response) */
  setServerDraft: (meta: ServerDraftMeta) => void

  /** Mark draft conflict resolved — by choosing: "server" | "local" */
  resolveDraftConflict: (choice: "server" | "local") => void

  /** Set the existingSubmissionId (returned from POST /kyc/submissions) */
  setExistingSubmissionId: (id: string) => void

  /** Set submitting state */
  setSubmitting: (isSubmitting: boolean) => void

  /** Set submit error */
  setSubmitError: (error: string | null) => void

  /** Store step for CDM-7 re-auth restore */
  setResumedStep: (step: KycWizardStep | null) => void

  /** Full wizard reset (on session clear or wizard close) */
  resetWizard: () => void
}

type KycWizardStore = KycWizardStoreState & KycWizardStoreActions

// ─── Default form data ────────────────────────────────────────────────────────

const DEFAULT_FORM_DATA: KycWizardFormData = {
  step1: { participantType: null },
  step2: { aadhaar: "", epic: "", isAadhaarOnly: false, reasonCode: "" },
  step3: { fullName: "", dateOfBirth: "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" },
  additionalEvidenceRefs: [],
  uploadArtifacts: [],
}

// ─── Initial store state ──────────────────────────────────────────────────────

const INITIAL_STATE: KycWizardStoreState = {
  currentStep: 1,
  isOpen: false,
  electionId: null,
  constituencyId: null,
  existingSubmissionId: null,
  existingState: null,
  draftConflict: false,
  serverDraftMeta: null,
  formData: DEFAULT_FORM_DATA,
  isSubmitting: false,
  submitError: null,
  resumedStep: null,
}

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useKycWizardStore = create<KycWizardStore>((set) => ({
  ...INITIAL_STATE,

  initWizard: ({ electionId, constituencyId }) =>
    set({
      ...INITIAL_STATE,
      isOpen: true,
      electionId,
      constituencyId,
    }),

  setStep: (step) => set({ currentStep: step }),

  updateStep1: (data) =>
    set((s) => ({
      formData: {
        ...s.formData,
        step1: { ...s.formData.step1, ...data },
      },
    })),

  updateStep2: (data) =>
    set((s) => ({
      formData: {
        ...s.formData,
        step2: { ...s.formData.step2, ...data },
      },
    })),

  updateStep3: (data) =>
    set((s) => ({
      formData: {
        ...s.formData,
        step3: { ...s.formData.step3, ...data },
      },
    })),

  setEvidenceRefs: (refs) =>
    set((s) => ({
      formData: { ...s.formData, additionalEvidenceRefs: refs },
    })),

  addUploadArtifact: (artifact) =>
    set((s) => ({
      formData: {
        ...s.formData,
        uploadArtifacts: [...s.formData.uploadArtifacts, artifact],
        // Keep additionalEvidenceRefs in sync for backward compat with KycWizardPage submit
        additionalEvidenceRefs: [...s.formData.additionalEvidenceRefs, artifact.artifactId],
      },
    })),

  removeUploadArtifact: (artifactId) =>
    set((s) => ({
      formData: {
        ...s.formData,
        uploadArtifacts: s.formData.uploadArtifacts.filter((a) => a.artifactId !== artifactId),
        additionalEvidenceRefs: s.formData.additionalEvidenceRefs.filter((id) => id !== artifactId),
      },
    })),

  clearUploadArtifacts: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        uploadArtifacts: [],
        additionalEvidenceRefs: [],
      },
    })),

  setServerDraft: (meta) =>
    set({
      serverDraftMeta: meta,
      existingSubmissionId: meta.submissionId,
      existingState: meta.state,
      draftConflict: true,
    }),

  resolveDraftConflict: (choice) => {
    if (choice === "server") {
      // Default path (CDM-10): clear local form data, continue from step 2
      // user will see server state reflected
      set((s) => ({
        draftConflict: false,
        formData: {
          ...DEFAULT_FORM_DATA,
          // Preserve isAadhaarOnly from server meta if available
          step2: {
            ...DEFAULT_FORM_DATA.step2,
            isAadhaarOnly: s.serverDraftMeta?.isAadhaarOnly ?? false,
          },
        },
        currentStep: 2,
      }))
    } else {
      // Explicit local overwrite confirmed by user
      set({ draftConflict: false, existingSubmissionId: null })
    }
  },

  setExistingSubmissionId: (id) => set({ existingSubmissionId: id }),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  setSubmitError: (error) => set({ submitError: error }),

  setResumedStep: (step) => set({ resumedStep: step }),

  resetWizard: () => set(INITIAL_STATE),
}))

// ─── Stable imperative accessors ──────────────────────────────────────────────

/** Reset wizard state imperatively (e.g. on session clear in auth-store). */
export const resetKycWizard = (): void => useKycWizardStore.getState().resetWizard()

// ─── CDM-11 computed helpers ──────────────────────────────────────────────────

/**
 * Returns true when all required upload artifacts are finalize-bound.
 * For Aadhaar-only path: at least 1 artifact is required.
 * For standard path: 0 artifacts needed (upload is optional).
 *
 * CDM-11: Submit gate — caller must check this before enabling submit.
 */
export function allArtifactsFinalized(
  isAadhaarOnly: boolean,
  uploadArtifacts: UploadArtifactRecord[]
): boolean {
  if (isAadhaarOnly) {
    return uploadArtifacts.length >= 1
  }
  // Standard path: no upload required (any uploaded = bonus)
  return true
}
