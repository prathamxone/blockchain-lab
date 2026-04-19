/**
 * DVote Frontend — InboxFilters Component
 *
 * Filter controls for inbox:
 * - Category filter (multi-select)
 * - Priority filter (multi-select)
 * - Unread only toggle
 *
 * Authority: walkthrough Phase R, FEATURE_FRONTEND §10.2
 */

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { NotificationCategory, NotificationPriority } from "./api"

// ─── Filter config ────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: NotificationCategory; label: string }[] = [
  { value: "KYC_UPDATE", label: "KYC Update" },
  { value: "ELECTION_STATUS", label: "Election" },
  { value: "VOTE_CONFIRMED", label: "Vote Confirmed" },
  { value: "RESULT_DECLARED", label: "Result Declared" },
  { value: "RERUN_TRIGGERED", label: "Rerun Triggered" },
  { value: "SYSTEM_ALERT", label: "System Alert" },
]

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboxFiltersState {
  categories: Set<NotificationCategory>
  priorities: Set<NotificationPriority>
  unreadOnly: boolean
}

// ─── Filter pill button ────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
        active
          ? "bg-dvote-saffron text-white"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
      {active && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      )}
    </button>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface InboxFiltersProps {
  filters: InboxFiltersState
  onFiltersChange: (filters: InboxFiltersState) => void
}

export function InboxFilters({ filters, onFiltersChange }: InboxFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCategory = useCallback(
    (cat: NotificationCategory) => {
      const next = new Set(filters.categories)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      onFiltersChange({ ...filters, categories: next })
    },
    [filters, onFiltersChange]
  )

  const togglePriority = useCallback(
    (pri: NotificationPriority) => {
      const next = new Set(filters.priorities)
      if (next.has(pri)) {
        next.delete(pri)
      } else {
        next.add(pri)
      }
      onFiltersChange({ ...filters, priorities: next })
    },
    [filters, onFiltersChange]
  )

  const toggleUnreadOnly = useCallback(() => {
    onFiltersChange({ ...filters, unreadOnly: !filters.unreadOnly })
  }, [filters, onFiltersChange])

  const clearAll = useCallback(() => {
    onFiltersChange({ categories: new Set(), priorities: new Set(), unreadOnly: false })
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.categories.size > 0 ||
    filters.priorities.size > 0 ||
    filters.unreadOnly

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((v) => !v)}
            className="text-xs h-auto p-0"
          >
            {isExpanded ? "Hide" : "Show"}
          </Button>
        </div>

        {/* Quick filters — always visible */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-dvote-green hover:underline"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={toggleUnreadOnly}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
              filters.unreadOnly
                ? "bg-dvote-saffron text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Unread only
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Category filter */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.value}
                  label={opt.label}
                  active={filters.categories.has(opt.value)}
                  onClick={() => toggleCategory(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Priority
            </p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.value}
                  label={opt.label}
                  active={filters.priorities.has(opt.value)}
                  onClick={() => togglePriority(opt.value)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Filter application helper ────────────────────────────────────────────────

export function applyInboxFilters(
  notifications: import("./api").Notification[],
  filters: InboxFiltersState
): import("./api").Notification[] {
  return notifications.filter((n) => {
    if (filters.categories.size > 0 && !filters.categories.has(n.category)) return false
    if (filters.priorities.size > 0 && !filters.priorities.has(n.priority)) return false
    if (filters.unreadOnly && n.isRead) return false
    return true
  })
}
