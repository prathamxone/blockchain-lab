/**
 * DVote Frontend — Election API Layer
 *
 * All election-related API calls.
 * Routes through /api/v1/elections prefix per BACKEND_HANDOFF_REPORT §5.1.
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.1, FEATURE_FRONTEND §9
 */

import { apiClient } from "@/lib/api-client"
import type {
  Election,
  ElectionListResponse,
  ElectionLineage,
  RerunStatus,
} from "./types"

// ─── Election List ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/elections
 * Returns paginated election list with cursor-first pagination.
 */
export async function fetchElectionList(params: {
  status?: string
  q?: string
  page?: number
  limit?: number
  sort?: string
  dir?: string
}): Promise<ElectionListResponse> {
  const qs = new URLSearchParams()
  if (params.status)  qs.set("status", params.status)
  if (params.q)      qs.set("q", params.q)
  if (params.page)    qs.set("page", String(params.page))
  if (params.limit)   qs.set("limit", String(params.limit))
  if (params.sort)    qs.set("sort", params.sort)
  if (params.dir)     qs.set("dir", params.dir)

  const queryString = qs.toString()
  return apiClient.get<ElectionListResponse>(
    `/elections${queryString ? `?${queryString}` : ""}`,
  )
}

// ─── Election Detail ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/elections/:id
 * Returns full election detail including candidates and lifecycle metadata.
 */
export async function fetchElectionDetail(electionId: string): Promise<Election> {
  return apiClient.get<Election>(`/elections/${electionId}`)
}

// ─── Election Lineage ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/elections/:id/lineage
 * Returns parent-child rerun linkage for a given election.
 */
export async function fetchElectionLineage(electionId: string): Promise<ElectionLineage> {
  return apiClient.get<ElectionLineage>(`/elections/${electionId}/lineage`)
}

// ─── Rerun Status ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/elections/:id/rerun/status
 * Returns rerun SLA state (on-track / due-soon / breached).
 */
export async function fetchRerunStatus(electionId: string): Promise<RerunStatus> {
  return apiClient.get<RerunStatus>(`/elections/${electionId}/rerun/status`)
}
