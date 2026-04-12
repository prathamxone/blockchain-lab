/**
 * DVote Frontend — ProfilePage
 *
 * Profile page orchestrator for authenticated users.
 *
 * Displays:
 *   - Profile photo upload widget (ProfilePhotoUpload)
 *   - Identity + KYC details (ProfileDetailsForm)
 *
 * Data strategy:
 *   - Wallet address + role: from auth store (already resolved at app level).
 *   - KYC summary: GET /kyc/me?electionId=<id> — fetched on mount.
 *     Note: GET /kyc/me requires electionId query param. If no electionId is
 *     available from route or session, we show "no KYC context" gracefully.
 *   - Photo upload: uses existingSubmissionId from GET /kyc/me response as
 *     the submissionId for POST /uploads/authorize.
 *
 * Tab title: "DVote - Profile" (per walkthrough Phase M exit criterion 5)
 *
 * Roles:
 *   This page is accessible to ALL authenticated roles (Owner, Voter,
 *   Candidate, Observer). Profile photo upload is only available to
 *   Voter/Candidate (requires a KYC submissionId). Owner/Observer
 *   see wallet + role only with no photo slot.
 *
 * Authority: walkthrough Phase M, FEATURE_FRONTEND §7.3, Plan Phase 13
 */

import { useEffect, useState, useCallback } from "react"
import { useSearch } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useAuthStore } from "@/state/auth-store"
import { apiClient, ApiError } from "@/lib/api-client"
import { ProfilePhotoUpload } from "./ProfilePhotoUpload"
import { ProfileDetailsForm, type KycSummaryData } from "./ProfileDetailsForm"
import type { KycStatus } from "@/lib/format/mask"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KycMeResponse {
  submission: {
    submissionId: string
    state: KycStatus
    submittedAt: string | null
    isAadhaarOnly: boolean
  } | null
}

// ─── ProfilePage component ─────────────────────────────────────────────────────

/**
 * My Profile page — wallet, role badge, KYC status, and photo upload.
 */
export function ProfilePage() {
  useDocumentTitle("DVote - Profile")

  const walletAddress = useAuthStore((s) => s.walletAddress) ?? ""
  const role = useAuthStore((s) => s.role)

  // Read electionId from URL search params (if navigated from elections context)
  const search = useSearch({ strict: false }) as { electionId?: string; constituencyId?: string }
  const electionId = search?.electionId ?? null
  const constituencyId = search?.constituencyId ?? null

  // KYC state
  const [kycData, setKycData] = useState<KycSummaryData | null>(null)
  const [isKycLoading, setIsKycLoading] = useState(false)
  const [kycFetchError, setKycFetchError] = useState<string | null>(null)

  // Derived: submissionId for photo upload (only if KYC is a draft/active submission)
  const submissionId = kycData?.submissionId ?? null

  // Profile photo artifact state (bound after finalize)
  const [photoArtifactId, setPhotoArtifactId] = useState<string | null>(null)

  // ── Fetch GET /kyc/me ─────────────────────────────────────────────────────

  const fetchKycData = useCallback(async () => {
    if (!electionId) {
      setKycData(null)
      setIsKycLoading(false)
      return
    }

    setIsKycLoading(true)
    setKycFetchError(null)

    try {
      const response = await apiClient.get<KycMeResponse>(
        `/kyc/me?electionId=${encodeURIComponent(electionId)}`
      )

      if (response.submission) {
        setKycData({
          submissionId: response.submission.submissionId,
          state: response.submission.state,
          submittedAt: response.submission.submittedAt,
          isAadhaarOnly: response.submission.isAadhaarOnly,
          // Note: aadhaar and epic are NOT returned by GET /kyc/me (backend
          // returns only metadata). In Phase M, we show masked placeholders
          // based on what the wizard stored. Full PII is not re-fetched from
          // backend for display after submission (CDM-10 / L-C2).
          aadhaar: undefined,
          epic: undefined,
          participantType: undefined,
        })
      } else {
        setKycData(null)
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load KYC data. Please try again."
      setKycFetchError(message)
    } finally {
      setIsKycLoading(false)
    }
  }, [electionId])

  useEffect(() => {
    fetchKycData()
  }, [fetchKycData])

  // ── Photo upload callbacks ─────────────────────────────────────────────────

  const handlePhotoSuccess = useCallback(
    (artifactId: string) => {
      setPhotoArtifactId(artifactId)
    },
    []
  )

  const handlePhotoRemove = useCallback(() => {
    setPhotoArtifactId(null)
  }, [])

  // Voter/Candidate get photo upload; Owner/Observer do not
  const canUploadPhoto = role === "Voter" || role === "Candidate"

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!role) return null // Guard while auth resolves

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 px-4">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your wallet identity, system role, and KYC verification status.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left column: photo slot (Voter/Candidate only) */}
        {canUploadPhoto && (
          <div className="w-full lg:w-56 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Profile Photo
            </p>
            <div className="rounded-xl border bg-card p-5">
              <ProfilePhotoUpload
                submissionId={submissionId}
                electionId={electionId}
                constituencyId={constituencyId}
                onUploadSuccess={handlePhotoSuccess}
                onRemove={handlePhotoRemove}
                disabled={
                  // Disable photo upload if KYC is in a submitted/approved/rejected state
                  kycData?.state === "SUBMITTED" ||
                  kycData?.state === "QUEUED" ||
                  kycData?.state === "UNDER_REVIEW" ||
                  kycData?.state === "APPROVED"
                }
              />
              {photoArtifactId && (
                <p className="text-[10px] text-muted-foreground/60 text-center mt-2 font-mono break-all">
                  id: {photoArtifactId.slice(0, 12)}…
                </p>
              )}
            </div>

            {/* No election context advisory */}
            {!electionId && (
              <p className="text-xs text-muted-foreground/70 text-center mt-2 leading-relaxed">
                Navigate from an election page to enable photo upload in context.
              </p>
            )}
          </div>
        )}

        {/* Right column: details form */}
        <div className="flex-1 min-w-0">
          <ProfileDetailsForm
            walletAddress={walletAddress}
            role={role}
            kycData={kycData}
            isLoading={isKycLoading}
            fetchError={kycFetchError}
            electionId={electionId}
          />
        </div>
      </div>
    </div>
  )
}
