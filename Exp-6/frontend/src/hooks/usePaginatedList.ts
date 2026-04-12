/**
 * DVote Frontend — usePaginatedList (Shared Cursor Pagination Hook)
 *
 * Generic cursor-first pagination hook for all backend list endpoints.
 * Implements the pagination contract from BACKEND_HANDOFF_REPORT §5.5.
 *
 * Backend response shape:
 *   {
 *     items: T[]
 *     pagination: {
 *       mode: "cursor"
 *       nextCursor: string | null
 *       offsetFallback: { limit: number; offset: number }
 *       orderKey: string
 *     }
 *   }
 *
 * PAGINATION_CURSOR_INVALID fallback (BACKEND_HANDOFF_REPORT §5.5):
 *   If the backend returns 400 PAGINATION_CURSOR_INVALID (cursor expired — 15min TTL),
 *   the hook automatically falls back to offset-based pagination using
 *   the `offsetFallback` from the last successful response, then retries.
 *
 * Usage:
 *   const { items, loadMore, isLoading, hasMore, error } = usePaginatedList<Election>(
 *     "/elections",
 *     { limit: 25 }
 *   )
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.5, walkthrough Phase J, api-client.ts
 */

import { useState, useCallback, useRef } from "react"
import { apiClient, ApiError } from "@/lib/api-client"

// ─── Pagination contract types ────────────────────────────────────────────────

/** Backend pagination envelope from BACKEND_HANDOFF_REPORT §5.5 */
export interface BackendPagination {
  mode: "cursor"
  nextCursor: string | null
  offsetFallback: {
    limit: number
    offset: number
  }
  orderKey: string
}

/** Standard backend list response shape */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: BackendPagination
}

// ─── Hook options ─────────────────────────────────────────────────────────────

export interface UsePaginatedListOptions {
  /**
   * Page size. Sent as `?limit=N` query param.
   * If not provided, server uses its default (typically 25).
   */
  limit?: number

  /**
   * Additional static query params to include in every request.
   * Example: { electionId: "abc", status: "active" }
   */
  params?: Record<string, string>
}

// ─── Hook result ──────────────────────────────────────────────────────────────

export interface UsePaginatedListResult<T> {
  /** Accumulated list items (all pages fetched so far). */
  items: T[]
  /** True while a page fetch is in-flight. */
  isLoading: boolean
  /** True if backend returned a non-null nextCursor (more pages exist). */
  hasMore: boolean
  /** Last error from most recent fetch attempt. null if no error. */
  error: ApiError | Error | null
  /** Fetch the next page (no-op if !hasMore or isLoading). */
  loadMore: () => Promise<void>
  /** Reset list and re-fetch from the first page. */
  reset: () => Promise<void>
}

// ─── usePaginatedList hook ────────────────────────────────────────────────────

/**
 * Generic cursor-first paginated list hook.
 * Automatically handles PAGINATION_CURSOR_INVALID with offset fallback.
 *
 * @param path  API path (without /api/v1 prefix). Example: "/elections"
 * @param opts  Page size and static filter params.
 */
export function usePaginatedList<T>(
  path: string,
  opts: UsePaginatedListOptions = {},
): UsePaginatedListResult<T> {
  const { limit, params: staticParams } = opts

  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<ApiError | Error | null>(null)

  // Track cursor for the next page
  const nextCursorRef = useRef<string | null>(null)
  // Track offset fallback from last successful response
  const lastOffsetFallbackRef = useRef<BackendPagination["offsetFallback"] | null>(null)
  // Prevent concurrent fetches
  const isFetchingRef = useRef(false)

  // ── Build query string ─────────────────────────────────────────────────────

  const buildUrl = useCallback(
    (cursor: string | null, useFallback = false): string => {
      const qs = new URLSearchParams()

      // Apply static filter params
      if (staticParams) {
        for (const [k, v] of Object.entries(staticParams)) {
          qs.set(k, v)
        }
      }

      if (limit !== undefined) qs.set("limit", String(limit))

      if (useFallback && lastOffsetFallbackRef.current) {
        // Offset fallback mode — no cursor
        qs.set("limit", String(lastOffsetFallbackRef.current.limit))
        qs.set("offset", String(lastOffsetFallbackRef.current.offset))
      } else if (cursor) {
        qs.set("cursor", cursor)
      }

      return `${path}?${qs.toString()}`
    },
    [path, limit, staticParams],
  )

  // ── Core fetch function ────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (cursor: string | null, useFallback = false): Promise<void> => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const url = buildUrl(cursor, useFallback)
        const data = await apiClient.get<PaginatedResponse<T>>(url)

        setItems((prev) => (cursor === null && !useFallback ? data.items : [...prev, ...data.items]))
        lastOffsetFallbackRef.current = data.pagination.offsetFallback
        nextCursorRef.current = data.pagination.nextCursor
        setHasMore(data.pagination.nextCursor !== null)
      } catch (err: unknown) {
        if (err instanceof ApiError && err.isPaginationCursorInvalid) {
          // CDM: Cursor expired (400 PAGINATION_CURSOR_INVALID).
          // Fall back to offset pagination using last known offsetFallback.
          nextCursorRef.current = null
          if (lastOffsetFallbackRef.current) {
            try {
              const url = buildUrl(null, true)
              const fallbackData = await apiClient.get<PaginatedResponse<T>>(url)
              setItems((prev) => [...prev, ...fallbackData.items])
              lastOffsetFallbackRef.current = fallbackData.pagination.offsetFallback
              nextCursorRef.current = fallbackData.pagination.nextCursor
              setHasMore(fallbackData.pagination.nextCursor !== null)
              return
            } catch (fallbackErr: unknown) {
              setError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)))
              setHasMore(false)
              return
            }
          }
        }

        setError(err instanceof Error ? err : new Error(String(err)))
        setHasMore(false)
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [buildUrl],
  )

  // ── Public loadMore ────────────────────────────────────────────────────────

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) return
    await fetchPage(nextCursorRef.current)
  }, [hasMore, isLoading, fetchPage])

  // ── Reset and refetch from page 1 ─────────────────────────────────────────

  const reset = useCallback(async (): Promise<void> => {
    setItems([])
    setHasMore(true)
    setError(null)
    nextCursorRef.current = null
    lastOffsetFallbackRef.current = null
    await fetchPage(null)
  }, [fetchPage])

  return { items, isLoading, hasMore, error, loadMore, reset }
}
