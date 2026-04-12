/**
 * DVote Frontend — Skeleton Card Component
 *
 * Placeholder skeleton rendered before guarded route content loads.
 * CDM-4 enforcement: guarded routes MUST NOT flash real content before
 * guard resolution. Show SkeletonCard until session/role is resolved.
 *
 * Variants:
 *   - "card"    → generic content card skeleton (default)
 *   - "list"    → table/list row skeleton (for queue and election list)
 *   - "profile" → profile header skeleton (photo + name + details)
 *   - "stat"    → small stat/KPI card skeleton (for dashboard metrics)
 *
 * Authority: walkthrough Phase E §5, CDM-4
 *
 * Usage:
 *   // Render 3 placeholder cards while data loads
 *   {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
 */

import { cn } from "@/lib/utils"

export type SkeletonVariant = "card" | "list" | "profile" | "stat"

interface SkeletonCardProps {
  variant?: SkeletonVariant
  className?: string
}

// Shared shimmer base class
const shimmer = "animate-pulse rounded-md bg-muted"

export function SkeletonCard({
  variant = "card",
  className,
}: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={cn("w-full", className)}
    >
      {variant === "card" && <SkeletonCardVariant />}
      {variant === "list" && <SkeletonListVariant />}
      {variant === "profile" && <SkeletonProfileVariant />}
      {variant === "stat" && <SkeletonStatVariant />}
      <span className="sr-only">Loading content...</span>
    </div>
  )
}

// ── Card variant ──────────────────────────────────────────────────────────────
function SkeletonCardVariant() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header: avatar + title line */}
      <div className="flex items-center gap-3">
        <div className={cn(shimmer, "size-10 rounded-full flex-shrink-0")} />
        <div className="flex-1 space-y-2">
          <div className={cn(shimmer, "h-4 w-2/3")} />
          <div className={cn(shimmer, "h-3 w-1/2")} />
        </div>
      </div>
      {/* Body lines */}
      <div className="space-y-2">
        <div className={cn(shimmer, "h-3 w-full")} />
        <div className={cn(shimmer, "h-3 w-5/6")} />
        <div className={cn(shimmer, "h-3 w-4/6")} />
      </div>
      {/* Footer: two action chips */}
      <div className="flex gap-2 pt-1">
        <div className={cn(shimmer, "h-7 w-20 rounded-full")} />
        <div className={cn(shimmer, "h-7 w-16 rounded-full")} />
      </div>
    </div>
  )
}

// ── List row variant ──────────────────────────────────────────────────────────
function SkeletonListVariant() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className={cn(shimmer, "size-8 rounded-full flex-shrink-0")} />
      <div className="flex-1 space-y-2">
        <div className={cn(shimmer, "h-3.5 w-1/3")} />
        <div className={cn(shimmer, "h-3 w-1/2")} />
      </div>
      <div className={cn(shimmer, "h-6 w-16 rounded-full")} />
      <div className={cn(shimmer, "h-6 w-6 rounded-md")} />
    </div>
  )
}

// ── Profile variant ───────────────────────────────────────────────────────────
function SkeletonProfileVariant() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-5">
        <div className={cn(shimmer, "size-20 rounded-full flex-shrink-0")} />
        <div className="flex-1 space-y-3">
          <div className={cn(shimmer, "h-5 w-1/2")} />
          <div className={cn(shimmer, "h-4 w-1/3")} />
          <div className={cn(shimmer, "h-6 w-24 rounded-full")} />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        <div className={cn(shimmer, "h-4 w-full")} />
        <div className={cn(shimmer, "h-4 w-5/6")} />
        <div className={cn(shimmer, "h-4 w-4/6")} />
      </div>
    </div>
  )
}

// ── Stat / KPI card variant ───────────────────────────────────────────────────
function SkeletonStatVariant() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className={cn(shimmer, "h-3.5 w-2/3")} />
      <div className={cn(shimmer, "h-8 w-1/2")} />
      <div className={cn(shimmer, "h-3 w-3/4")} />
    </div>
  )
}
