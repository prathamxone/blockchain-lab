/**
 * DVote Frontend — Inbox Feature API
 *
 * API surface:
 *   - GET /inbox — list notifications (cursor-first, with cursor/limit/offset/unreadOnly)
 *   - POST /inbox/:notificationId/read — mark notification as read
 *
 * Authority: walkthrough Phase R, FEATURE_FRONTEND §10
 */

import { apiClient } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationCategory =
  | "KYC_UPDATE"
  | "ELECTION_STATUS"
  | "VOTE_CONFIRMED"
  | "RESULT_DECLARED"
  | "RERUN_TRIGGERED"
  | "SYSTEM_ALERT"

export type NotificationPriority = "HIGH" | "MEDIUM" | "LOW"

export interface Notification {
  notificationId: string
  category: NotificationCategory
  priority: NotificationPriority
  payload: NotificationPayload
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface NotificationPayload {
  title: string
  body: string
  electionId?: string
  electionTitle?: string
}

export interface InboxListResponse {
  items: Notification[]
  pagination: PaginationEnvelope
  freshness: FreshnessMeta
}

export interface PaginationEnvelope {
  hasNext: boolean
  hasPrev: boolean
  total: number | null
  nextCursor: string | null
  prevCursor: string | null
}

export interface FreshnessMeta {
  lastSyncedAt: string | null
  nextPollAfterSec: number
  freshnessState: "fresh" | "stale" | "degraded"
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export interface InboxListParams {
  limit?: number
  cursor?: string | null
  unreadOnly?: boolean
}

/**
 * Fetch paginated notification list.
 * Cursor-first pagination: nextCursor from response becomes cursor for next page.
 */
export async function fetchInboxList(
  params: InboxListParams = {}
): Promise<InboxListResponse> {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.cursor) searchParams.set("cursor", params.cursor)
  if (params.unreadOnly) searchParams.set("unreadOnly", "true")

  const query = searchParams.toString()
  const path = `/inbox${query ? `?${query}` : ""}`

  return apiClient.get<InboxListResponse>(path)
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/inbox/${encodeURIComponent(notificationId)}/read`,
    undefined
  )
}
