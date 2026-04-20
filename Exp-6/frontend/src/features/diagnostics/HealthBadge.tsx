/**
 * DVote Frontend — Health Badge Component
 *
 * Optional non-blocking diagnostics badge showing frontend health status.
 * Can be placed in footer or profile area for quick system status visibility.
 *
 * Authority: walkthrough Phase U §4
 *
 * Usage:
 *   <HealthBadge />
 */

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { checkHealth, formatHealthTimestamp, type HealthStatus } from "@/lib/health/heartbeat"
import { Wifi, Clock } from "lucide-react"

export function HealthBadge({ className }: { className?: string }) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Update health status on mount
    setHealth(checkHealth())

    // Update timestamp every 30 seconds
    const interval = setInterval(() => {
      setHealth(checkHealth())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className={cn(
          "fixed bottom-4 left-4 z-50",
          "size-8 rounded-full bg-muted border border-border",
          "flex items-center justify-center",
          "hover:bg-accent hover:border-primary",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className,
        )}
        aria-label="Show health status"
        title="Click to show health status"
      >
        <Wifi className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50",
        "bg-popup border border-border rounded-lg shadow-lg",
        "p-3 min-w-[200px]",
        className,
      )}
      role="status"
      aria-label="Frontend health status"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">DVote</span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
          aria-label="Hide health status"
        >
          ✕
        </button>
      </div>

      {/* Status */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              health?.healthy ? "bg-green-500" : "bg-red-500",
            )}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {health?.healthy ? "Frontend OK" : "Frontend Error"}
          </span>
        </div>

        {health && (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              <span>{formatHealthTimestamp(health.timestamp)}</span>
            </div>
            <div className="text-muted-foreground">
              v{health.version} · {health.environment}
            </div>
          </>
        )}
      </div>
    </div>
  )
}