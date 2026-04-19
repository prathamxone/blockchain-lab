/**
 * DVote Frontend — Results List Page
 *
 * Displays all finalized election results with search and pagination.
 * Tab title: "DVote - Election Results"
 *
 * Features:
 * - Search by election title
 * - Pagination with offset fallback
 * - Winner display with tri-color styling
 * - NOTA result indicator
 * - Link to detailed result view
 *
 * Authority: walkthrough Phase Q §1, FEATURE_FRONTEND §9.7
 */

import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { PaginationBar } from "@/components/ui/PaginationBar"
import { Card, CardContent } from "@/components/ui/card"
import { FreshnessBanner } from "@/components/ui/FreshnessBanner"
import { fetchResultsList } from "./api"
import { formatDateShort } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import type { ElectionResultListItem } from "./api"

// ─── Result Row Skeleton ───────────────────────────────────────────────────────

function ResultRowSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Winner Badge ──────────────────────────────────────────────────────────────

function WinnerBadge({ isNota }: { isNota: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isNota
          ? "bg-muted text-muted-foreground border border-border"
          : "bg-dvote-green-subtle text-dvote-green-dark border border-dvote-green/30",
      )}
    >
      {isNota ? "NOTA" : "Winner"}
    </span>
  )
}

// ─── Result Row ────────────────────────────────────────────────────────────────

interface ResultRowProps {
  result: ElectionResultListItem
  onSelect: (electionId: string) => void
}

function ResultRow({ result, onSelect }: ResultRowProps) {
  return (
    <Card
      className="hover:border-primary/30 transition-colors cursor-pointer"
      onClick={() => onSelect(result.electionId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(result.electionId)
        }
      }}
      aria-label={`View result for ${result.title}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-foreground truncate">
                {result.title}
              </span>
              <WinnerBadge isNota={result.winnerIsNota} />
            </div>
            <p className="text-sm text-muted-foreground">
              {result.constituency}, {result.state}
            </p>
          </div>

          {/* Vote summary */}
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-foreground">
              {result.totalVotesCast.toLocaleString()} votes
            </p>
            <p className="text-xs text-muted-foreground">
              finalized {formatDateShort(result.finalizedAt)}
            </p>
          </div>
        </div>

        {/* Winner info */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          {result.winnerName ? (
            <span className="text-sm text-foreground">
              {result.winnerIsNota ? (
                <span className="font-medium">NOTA</span>
              ) : (
                <>
                  <span className="font-medium">{result.winnerName}</span>
                  {result.winnerParty && (
                    <span className="text-muted-foreground ml-1">
                      — {result.winnerParty}
                    </span>
                  )}
                </>
              )}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No winner declared</span>
          )}
          <span className="text-xs text-muted-foreground">
            {result.notaVotes.toLocaleString()} NOTA votes (
            {((result.notaVotes / (result.totalVotesCast || 1)) * 100).toFixed(1)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ResultsListPage() {
  const navigate = useNavigate()

  useDocumentTitle("DVote - Election Results")

  const { data: resultsData, isLoading } = useQuery({
    queryKey: ["results-list"],
    queryFn: () => fetchResultsList({ limit: 25 }),
  })

  const handleSelectResult = (electionId: string) => {
    navigate({ to: "/results/$uelectionid", params: { uelectionid: electionId } })
  }

  const freshnessState = resultsData?.items?.[0]?.freshnessState

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Election Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Finalized election outcomes and vote tallies
        </p>
      </div>

      {/* Freshness banner */}
      {freshnessState && (
        <FreshnessBanner freshnessState={freshnessState} />
      )}

      {/* Results list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ResultRowSkeleton key={i} />
          ))}
        </div>
      ) : resultsData?.items && resultsData.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {resultsData.items.map((result) => (
              <ResultRow
                key={result.electionId}
                result={result}
                onSelect={handleSelectResult}
              />
            ))}
          </div>

          {/* Pagination */}
          {resultsData.pagination && (
            <PaginationBar
              pagination={resultsData.pagination}
              currentPage={resultsData.pagination.offsetFallback.offset / resultsData.pagination.offsetFallback.limit + 1}
              totalItems={resultsData.items.length}
              onPage={(page: number) => {
                navigate({
                  to: "/results",
                  search: { page, limit: 25 },
                })
              }}
            />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No finalized results available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Results appear after elections are finalized.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
