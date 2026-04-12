/**
 * DVote Frontend — Elections List Page
 *
 * Election discovery surface with URL-synced status filters and search.
 * Tab title: "DVote - Elections"
 *
 * Features:
 * - Search by election title
 * - Filter by lifecycle status (Draft, RegistrationOpen, VotingOpen, etc.)
 * - URL-synced filters (persists across refresh and sharing)
 * - Cursor-first pagination with offset fallback
 * - Status chips with tri-color semantic styling
 * - NOTA indicator on candidate count
 * - Superseded elections link to child rerun
 *
 * Authority: walkthrough Phase O §1, FEATURE_FRONTEND §9.1, BACKEND_HANDOFF_REPORT §5.1
 * CDM-14: superseded elections show child link; actions are hard-locked
 */

import { useQuery } from "@tanstack/react-query"
import { useSearch } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { ElectionsListFilterBar } from "@/components/ui/FilterBar"
import { PaginationBar } from "@/components/ui/PaginationBar"
import { StatusChip } from "@/components/ui/StatusChip"
import { Card, CardContent } from "@/components/ui/card"
import { fetchElectionList } from "./api"
import type { ElectionsListSearchParams } from "@/lib/url-state"
import { formatDateShort } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { ElectionListItem } from "./types"

// ─── Election Row Skeleton ─────────────────────────────────────────────────────

function ElectionRowSkeleton() {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Election Row ──────────────────────────────────────────────────────────────

interface ElectionRowProps {
  election: ElectionListItem
  onSelect: (electionId: string) => void
  onSelectChild: (electionId: string) => void
}

function ElectionRow({ election, onSelect, onSelectChild }: ElectionRowProps) {
  const isSuperseded = election.status === "Superseded" || election.isSuperseded

  return (
    <Card
      className={cn(
        "hover:border-primary/30 transition-colors cursor-pointer",
        isSuperseded && "opacity-75",
      )}
      onClick={() => onSelect(election.electionId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(election.electionId)
        }
      }}
      aria-label={`View election ${election.title}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">
                {election.title}
              </span>
              {election.isSuperseded && election.childElectionId && (
                <span className="text-xs text-muted-foreground">
                  (superseded —{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectChild(election.childElectionId!)
                    }}
                    className="text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                  >
                    view rerun
                  </button>
                  )
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {election.constituency}, {election.state}
            </p>
          </div>

          {/* Status chip */}
          <StatusChip status={election.status} size="sm" />
        </div>

        {/* Footer meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {election.votingEndsAt && (
            <span>
              Voting ends:{" "}
              <span className="text-foreground font-medium">
                {formatDateShort(election.votingEndsAt)}
              </span>
            </span>
          )}
          <span>
            {election.candidateCount} candidate{election.candidateCount !== 1 ? "s" : ""}
            {election.notaEnabled && " + NOTA"}
          </span>
          {election.voterCount !== undefined && (
            <span>
              {election.voterCount.toLocaleString()} voter{election.voterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <h3 className="font-semibold text-foreground mb-1">No elections found</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {hasFilters
          ? "No elections match your current filters. Try adjusting or clearing the filters."
          : "There are no elections available at this time. Check back later."}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ElectionsListPage() {
  useDocumentTitle("DVote - Elections")

  const search = useSearch({} as any) as ElectionsListSearchParams

  const queryKey = [
    "elections",
    search.status,
    search.q,
    search.page,
    search.limit,
    search.sort,
    search.dir,
  ] as const

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey,
    queryFn: () =>
      fetchElectionList({
        status: search.status,
        q: search.q,
        page: search.page,
        limit: search.limit,
        sort: search.sort,
        dir: search.dir,
      }),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const pagination = data?.pagination

  const hasFilters = Boolean(search.status || search.q)

  const handleSelectElection = (electionId: string) => {
    window.location.href = `/elections/${electionId}`
  }

  const handleSelectChild = (electionId: string) => {
    window.location.href = `/elections/${electionId}`
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (search.status) params.set("status", search.status)
    if (search.q) params.set("q", search.q)
    params.set("page", String(newPage))
    params.set("limit", String(search.limit))
    window.location.href = `/elections?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Elections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all elections, filter by status, and view details.
        </p>
      </div>

      {/* Filter bar — URL-synced */}
      <ElectionsListFilterBar className="border border-border rounded-lg p-3 bg-card" />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load elections. Please try again.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ElectionRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState hasFilters={hasFilters} />
      )}

      {/* Election list */}
      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="space-y-3">
            {items.map((election) => (
              <ElectionRow
                key={election.electionId}
                election={election}
                onSelect={handleSelectElection}
                onSelectChild={handleSelectChild}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && (
            <PaginationBar
              pagination={pagination}
              currentPage={search.page}
              totalItems={items.length}
              onPage={handlePageChange}
              isLoading={isFetching}
            />
          )}
        </>
      )}
    </div>
  )
}
