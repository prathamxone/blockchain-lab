/**
 * DVote Frontend — Voter Feature API
 *
 * API surface for voter/candidate dashboard:
 *   - GET /kyc/me — fetch current user's KYC submissions
 *
 * Authority: walkthrough Phase Q §6 (Policy L-E1)
 */

import { apiClient } from "@/lib/api-client"
import type { KycStatus } from "@/lib/format/mask"

// ─── Types ────────────────────────────────────────────────────────────────────

/** GET /kyc/me response — current user's KYC submission for an election */
export interface VoterKycStatus {
  submissionId: string
  electionId: string
  state: KycStatus
  submittedAt: string | null
  isAadhaarOnly: boolean
}

/** VoterKycStatus with null when no prior submission exists */
export type VoterKycStatusResponse = VoterKycStatus | null

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch current user's KYC submission status.
 * Returns null if no prior submission exists for this election.
 *
 * Called by VoterDashboardPage to determine if a Candidate user
 * is in SUBMITTED/QUEUED/UNDER_REVIEW state (Policy L-E1).
 *
 * @param electionId — election to check KYC status for (optional, returns first found)
 */
export async function fetchVoterKycStatus(
  electionId?: string
): Promise<VoterKycStatusResponse> {
  try {
    const path = electionId ? `/kyc/me?electionId=${encodeURIComponent(electionId)}` : "/kyc/me"
    const data = await apiClient.get<VoterKycStatus>(path)
    return data
  } catch (err) {
    // 404 means no prior submission — return null
    if (err instanceof Error && err.message.includes("404")) {
      return null
    }
    throw err
  }
}
