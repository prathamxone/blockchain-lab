/**
 * DVote Frontend — NotificationCard Component
 *
 * Single notification card with:
 * - Category icon + label
 * - Priority badge
 * - Title + body from payload
 * - Read/unread visual state
 * - Mark-read action
 *
 * Authority: walkthrough Phase R, FEATURE_FRONTEND §10.2
 */

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { markNotificationRead } from "./api"
import type { Notification, NotificationCategory, NotificationPriority } from "./api"

// ─── Category config ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  KYC_UPDATE: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  ELECTION_STATUS: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  VOTE_CONFIRMED: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  RESULT_DECLARED: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  RERUN_TRIGGERED: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  SYSTEM_ALERT: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  KYC_UPDATE: "KYC Update",
  ELECTION_STATUS: "Election",
  VOTE_CONFIRMED: "Vote",
  RESULT_DECLARED: "Result",
  RERUN_TRIGGERED: "Rerun",
  SYSTEM_ALERT: "Alert",
}

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification
  onMarkRead?: (notificationId: string) => void
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const [isMarking, setIsMarking] = useState(false)

  const { notificationId, category, priority, payload, isRead, createdAt } = notification
  const icon = CATEGORY_ICONS[category]
  const categoryLabel = CATEGORY_LABELS[category]
  const priorityLabel = PRIORITY_LABELS[priority]

  async function handleMarkRead() {
    if (isMarking || isRead) return
    setIsMarking(true)
    try {
      await markNotificationRead(notificationId)
      onMarkRead?.(notificationId)
    } catch {
      // silently fail — card stays interactive
    } finally {
      setIsMarking(false)
    }
  }

  const timeAgo = formatTimeAgo(createdAt)

  return (
    <Card
      className={cn(
        "transition-colors",
        !isRead && "border-l-4 border-l-dvote-saffron bg-dvote-saffron-subtle/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
              isRead ? "bg-muted text-muted-foreground" : "bg-dvote-saffron/10 text-dvote-saffron"
            )}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">
                {categoryLabel}
              </span>
              <Badge
                variant={
                  priority === "HIGH"
                    ? "destructive"
                    : priority === "MEDIUM"
                    ? "secondary"
                    : "default"
                }
                className="text-xs"
              >
                {priorityLabel}
              </Badge>
              {!isRead && (
                <span className="h-2 w-2 rounded-full bg-dvote-saffron" aria-label="Unread" />
              )}
            </div>

            <p className={cn("text-sm", isRead ? "text-muted-foreground" : "font-medium text-foreground")}>
              {payload.title}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {payload.body}
            </p>

            {payload.electionId && (
              <a
                href={`/elections/${encodeURIComponent(payload.electionId)}`}
                className="mt-1 inline-block text-xs text-dvote-green hover:underline"
              >
                View Election →
              </a>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>

              {!isRead && (
                <button
                  type="button"
                  onClick={handleMarkRead}
                  disabled={isMarking}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {isMarking ? "Marking..." : "Mark as read"}
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHour > 0) return `${diffHour}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return "Just now"
}
