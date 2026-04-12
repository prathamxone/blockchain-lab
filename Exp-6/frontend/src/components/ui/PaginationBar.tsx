/**
 * DVote Frontend — Pagination Bar Component
 *
 * Renders pagination controls for list views using cursor-first pagination
 * with offset fallback (BACKEND_HANDOFF_REPORT §5.5).
 *
 * Shows:
 * - Current range indicator ("Showing 1-20 of 143")
 * - Previous / Next buttons
 * - Page number display
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.5, walkthrough Phase 15
 */

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { BackendPagination } from "@/hooks/usePaginatedList"

interface PaginationBarProps {
  /** Pagination metadata from the last backend response */
  pagination: BackendPagination
  /** Current page offset (1-indexed) */
  currentPage: number
  /** Total items from the accumulated list */
  totalItems: number
  /** Callback to load the next page (for cursor mode) */
  onNext?: () => void
  /** Callback to load the previous page (for cursor mode — resets to page 1) */
  onPrev?: () => void
  /** Callback to jump to a specific offset page (offset fallback mode only) */
  onPage?: (page: number) => void
  /** True while a fetch is in-flight */
  isLoading?: boolean
  className?: string
}

/**
 * Parse offset from backend offsetFallback to determine current page number.
 * offsetFallback = { limit, offset } where offset = (page - 1) * limit.
 */
function offsetToPage(offsetFallback: BackendPagination["offsetFallback"]): number {
  if (!offsetFallback || offsetFallback.limit === 0) return 1
  return Math.floor(offsetFallback.offset / offsetFallback.limit) + 1
}

/**
 * Calculate total pages from offsetFallback + totalItems.
 */
function calcTotalPages(offsetFallback: BackendPagination["offsetFallback"], totalItems: number): number {
  if (!offsetFallback || offsetFallback.limit === 0) return 1
  return Math.ceil(totalItems / offsetFallback.limit)
}

export function PaginationBar({
  pagination,
  currentPage,
  totalItems,
  onNext,
  onPrev,
  onPage,
  isLoading = false,
  className,
}: PaginationBarProps) {
  // Backend uses cursor-first pagination; currentPage is computed from offsetFallback.
  // The prop is kept for future offset-mode support.
  void currentPage
  // Backend uses cursor-first pagination. offsetFallback enables
  // offset-based page jumping when cursor expires.
  const totalPages    = calcTotalPages(pagination.offsetFallback, totalItems)
  const pageFromOffset = offsetToPage(pagination.offsetFallback)
  const displayPage   = pageFromOffset

  const startItem = (displayPage - 1) * (pagination.offsetFallback.limit || 20) + 1
  const endItem   = Math.min(startItem + (pagination.offsetFallback.limit || 20) - 1, totalItems)
  const hasPrev   = pageFromOffset > 1
  const hasNext   = pagination.nextCursor !== null

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 py-3",
        className,
      )}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Range indicator */}
      <p className="text-sm text-muted-foreground whitespace-nowrap">
        {totalItems === 0 ? (
          "No results"
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-foreground">{startItem}</span>
            {" – "}
            <span className="font-medium text-foreground">{endItem}</span>
            {" of "}
            <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span>
          </>
        )}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Previous — resets to page 1 via offset fallback */}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || !hasPrev}
          onClick={() => {
            if (onPage) {
              onPage(1)
            } else if (onPrev) {
              onPrev()
            }
          }}
          aria-label="Previous page"
        >
          {/* Chevron left icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page indicator */}
        <span className="text-sm text-muted-foreground min-w-[4ch] text-center">
          {displayPage} / {totalPages}
        </span>

        {/* Next / Load more — uses cursor when available */}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || !hasNext}
          onClick={() => onNext?.()}
          aria-label={hasNext ? "Load more" : "No more results"}
        >
          {hasNext ? (
            <>
              <span className="hidden sm:inline">Load more</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Next</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
