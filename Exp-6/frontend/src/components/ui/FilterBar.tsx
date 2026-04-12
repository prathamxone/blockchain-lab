/**
 * DVote Frontend — Filter Bar Component
 *
 * Renders a horizontal row of filter controls for list views.
 * Supports status filter dropdowns, text search inputs, and active filter
 * chips with clear-all affordance.
 *
 * URL-synced: filter state lives in URL search params (via TanStack Router
 * validateSearch). FilterBar reads/writes search params through the
 * router's navigate / search hooks.
 *
 * Authority: walkthrough Phase 15, FEATURE_FRONTEND §9.1
 * CDM: tri-color accents used only as highlights, neutral base for surfaces
 */

import { useSearch } from "@tanstack/react-router"
import { useCallback } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ElectionsListSearchParams } from "@/lib/url-state"

interface FilterBarProps {
  /** Override class for the container */
  className?: string
  /** Show search input */
  showSearch?: boolean
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Current search query value */
  searchValue?: string
  /** Callback when search changes */
  onSearchChange?: (value: string) => void
  /** Show status filter dropdown */
  showStatusFilter?: boolean
  /** Available status options */
  statusOptions?: { label: string; value: string }[]
  /** Current selected status */
  selectedStatus?: string
  /** Callback when status changes */
  onStatusChange?: (value: string | undefined) => void
  /** Number of active filters (for badge display) */
  activeFilterCount?: number
  /** Callback to clear all filters */
  onClearAll?: () => void
}

export function FilterBar({
  className,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showStatusFilter = false,
  statusOptions = [],
  selectedStatus,
  onStatusChange,
  activeFilterCount = 0,
  onClearAll,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Search input */}
      {showSearch && (
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-48 sm:w-64 h-9"
          aria-label="Search"
        />
      )}

      {/* Status filter dropdown */}
      {showStatusFilter && statusOptions.length > 0 && (
        <select
          value={selectedStatus ?? ""}
          onChange={(e) => onStatusChange?.(e.target.value || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm
                     text-foreground focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Active filter count badge */}
      {activeFilterCount > 0 && onClearAll && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClearAll}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * ElectionsListFilterBar — election-specific filter bar wired to TanStack Router.
 * Reads/writes URL search params directly to persist filters across refresh/sharing.
 *
 * Authority: walkthrough Phase 15 §9.1, url-state.ts ElectionsListSearchParams
 */
export function ElectionsListFilterBar({
  className,
}: {
  className?: string
}) {
  const search  = useSearch({ from: "/elections" } as any) as ElectionsListSearchParams

  const handleSearchChange = useCallback(
    (q: string) => {
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("limit", String(search.limit))
      if (q) params.set("q", q)
      if (search.status) params.set("status", search.status)
      if (search.sort) params.set("sort", search.sort)
      if (search.dir) params.set("dir", search.dir)
      window.location.href = `/elections?${params.toString()}`
    },
    [search],
  )

  const handleStatusChange = useCallback(
    (status: string | undefined) => {
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("limit", String(search.limit))
      if (search.q) params.set("q", search.q)
      if (status) params.set("status", status)
      if (search.sort) params.set("sort", search.sort)
      if (search.dir) params.set("dir", search.dir)
      window.location.href = `/elections?${params.toString()}`
    },
    [search],
  )

  const handleClearAll = useCallback(() => {
    const params = new URLSearchParams()
    params.set("page", "1")
    params.set("limit", String(search.limit))
    window.location.href = `/elections?${params.toString()}`
  }, [search])

  const statusOptions: { label: string; value: string }[] = [
    { label: "Draft",             value: "Draft" },
    { label: "Registration Open", value: "RegistrationOpen" },
    { label: "Voting Open",      value: "VotingOpen" },
    { label: "Voting Closed",     value: "VotingClosed" },
    { label: "Finalized",        value: "Finalized" },
    { label: "Superseded",       value: "Superseded" },
  ]

  const activeCount = [
    search.q      ? 1 : 0,
    search.status ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <FilterBar
      className={className}
      showSearch
      searchPlaceholder="Search elections..."
      searchValue={search.q}
      onSearchChange={handleSearchChange}
      showStatusFilter
      statusOptions={statusOptions}
      selectedStatus={search.status}
      onStatusChange={handleStatusChange}
      activeFilterCount={activeCount}
      onClearAll={handleClearAll}
    />
  )
}