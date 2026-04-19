/**
 * DVote Frontend — Results API Layer
 *
 * All results-related API calls.
 * Routes through /api/v1/results prefix per BACKEND_HANDOFF_REPORT §5.1.
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.1, FEATURE_FRONTEND §9.7
 */

import { apiClient } from "@/lib/api-client"
import type { FinalizationOutcome } from "@/features/elections/types"

// ─── Results List ─────────────────────────────────────────────────────────────

export interface ElectionResultListItem {
  electionId: string
  title: string
  constituency: string
  state: string
  status: "Finalized"
  finalizedAt: string
  winnerId?: string
  winnerName?: string
  winnerParty?: string
  winnerIsNota: boolean
  totalVotesCast: number
  notaVotes: number
  finalizationOutcome: FinalizationOutcome
  freshnessState?: "fresh" | "stale" | "degraded"
}

export interface ResultsListResponse {
  items: ElectionResultListItem[]
  pagination: {
    mode: "cursor"
    nextCursor: string | null
    offsetFallback: { limit: number; offset: number }
    orderKey: "createdAt:desc,id:desc"
  }
}

// ─── Result Detail ────────────────────────────────────────────────────────────

export interface CandidateResult {
  candidateId: string
  name: string
  partyAffiliation?: string
  isNota: boolean
  isWinner: boolean
  voteCount: number
  voteShare: number // percentage 0-100
}

export interface ElectionResultDetail {
  electionId: string
  title: string
  description?: string
  constituency: string
  state: string
  status: "Finalized"
  votingStartsAt: string
  votingEndsAt: string
  votingClosedAt: string
  finalizedAt: string
  totalVotesCast: number
  notaVotes: number
  notaVoteShare: number
  contestingCandidateCap?: number
  finalizationOutcome: FinalizationOutcome
  winner: CandidateResult
  candidates: CandidateResult[]
  parentElectionId?: string
  childElectionId?: string
  freshnessState?: "fresh" | "stale" | "degraded"
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/results
 * Returns paginated finalized election results list.
 */
export async function fetchResultsList(params?: {
  q?: string
  page?: number
  limit?: number
}): Promise<ResultsListResponse> {
  const qs = new URLSearchParams()
  if (params?.q) qs.set("q", params.q)
  if (params?.page) qs.set("page", String(params.page))
  if (params?.limit) qs.set("limit", String(params.limit))

  const queryString = qs.toString()
  return apiClient.get<ResultsListResponse>(
    `/results${queryString ? `?${queryString}` : ""}`,
  )
}

/**
 * GET /api/v1/results/:id
 * Returns full result detail for a finalized election.
 * Uses exact FinalizationOutcome enum values from backend.
 */
export async function fetchResultDetail(electionId: string): Promise<ElectionResultDetail> {
  return apiClient.get<ElectionResultDetail>(`/results/${electionId}`)
}
