/**
 * DVote Frontend — Inbox Page
 *
 * User notification inbox at /inbox.
 * Features:
 * - Notification list with category, priority, read/unread
 * - Cursor-first pagination (backend: hasNext/hasPrev/total)
 * - Category + priority filters (InboxFilters)
 * - Mark-read action on each card
 * - Freshness indicator
 *
 * Authority: walkthrough Phase R, FEATURE_FRONTEND §10
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { InboxFilters, applyInboxFilters, type InboxFiltersState } from "./InboxFilters"
import { NotificationCard } from "./NotificationCard"
import { fetchInboxList, type Notification } from "./api"
import type { InboxListResponse, PaginationEnvelope } from "./api"

// ─── Pagination helpers ─────────────────────────────────────────────────────────

interface InboxPaginationProps {
  pagination: PaginationEnvelope
  onPrev: () => void
  onNext: () => void
  isLoading: boolean
}

function InboxPagination({ pagination, onPrev, onNext, isLoading }: InboxPaginationProps) {
  const { hasNext, hasPrev, total } = pagination
  const start = 1
  const end = total ?? "?"

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-muted-foreground">
        {total !== null ? `Showing ${start}–${end} notification${total !== 1 ? "s" : ""}` : "Loading..."}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev || isLoading}
        >
          ← Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNext || isLoading}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function InboxEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mb-4 flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <p className="text-base font-medium text-foreground">No notifications</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "No notifications match your current filters. Try adjusting them."
            : "You don't have any notifications yet."}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Freshness indicator ────────────────────────────────────────────────────────

function FreshnessIndicator({ freshness }: { freshness: InboxListResponse["freshness"] }) {
  const state = freshness.freshnessState
  const label =
    state === "fresh"
      ? "Data is current"
      : state === "stale"
      ? "Data may be outdated — refreshing..."
      : "Data may be outdated — retrying..."

  const colorClass =
    state === "fresh"
      ? "text-dvote-green"
      : state === "stale"
      ? "text-dvote-saffron"
      : "text-destructive"

  return (
    <div className={`flex items-center gap-1.5 text-xs ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: InboxFiltersState = {
  categories: new Set(),
  priorities: new Set(),
  unreadOnly: false,
}

const PAGE_SIZE = 25

export function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pagination, setPagination] = useState<PaginationEnvelope | null>(null)
  const [freshness, setFreshness] = useState<InboxListResponse["freshness"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InboxFiltersState>(DEFAULT_FILTERS)

  const fetchPage = useCallback(
    async (options: { cursor?: string | null } = {}) => {
      try {
        const data = await fetchInboxList({
          limit: PAGE_SIZE,
          cursor: options.cursor ?? null,
          unreadOnly: false,
        })
        setNotifications(data.items)
        setPagination(data.pagination)
        setFreshness(data.freshness)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notifications")
      }
    },
    []
  )

  useEffect(() => {
    setIsLoading(true)
    fetchPage().finally(() => setIsLoading(false))
  }, [fetchPage])

  function handlePrev() {
    if (!pagination?.hasPrev) return
    setIsLoading(true)
    fetchPage().finally(() => setIsLoading(false))
  }

  function handleNext() {
    if (!pagination?.hasNext || !pagination?.nextCursor) return
    setIsLoadingMore(true)
    fetchInboxList({ cursor: pagination.nextCursor, limit: PAGE_SIZE })
      .then((data) => {
        setNotifications(data.items)
        setPagination(data.pagination)
        setFreshness(data.freshness)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load more"))
      .finally(() => setIsLoadingMore(false))
  }

  function handleMarkRead(notificationId: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      )
    )
  }

  const filteredNotifications = applyInboxFilters(notifications, filters)
  const hasFilters =
    filters.categories.size > 0 ||
    filters.priorities.size > 0 ||
    filters.unreadOnly

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
          {freshness && <FreshnessIndicator freshness={freshness} />}
        </div>
      </div>

      <InboxFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} variant="card" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <InboxEmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.notificationId}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>

          {pagination && (
            <InboxPagination
              pagination={pagination}
              onPrev={handlePrev}
              onNext={handleNext}
              isLoading={isLoadingMore}
            />
          )}
        </>
      )}
    </div>
  )
}
