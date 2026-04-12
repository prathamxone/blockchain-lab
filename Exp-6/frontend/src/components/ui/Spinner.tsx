/**
 * DVote Frontend — Spinner Component
 *
 * CSS-animated loading spinner using DVote design tokens only.
 * Replaces all ad-hoc loading indicators across the app.
 *
 * Sizes: sm (16px) | md (24px) | lg (40px) | xl (56px)
 * Colors: primary (saffron) | secondary (green) | muted | white
 *
 * Authority: walkthrough Phase E §5
 * CDM-2: no direct hex values — all through token classes.
 *
 * Usage:
 *   <Spinner />
 *   <Spinner size="lg" color="secondary" label="Loading election data..." />
 */

import { cn } from "@/lib/utils"

export type SpinnerSize = "sm" | "md" | "lg" | "xl"
export type SpinnerColor = "primary" | "secondary" | "muted" | "white"

interface SpinnerProps {
  size?: SpinnerSize
  color?: SpinnerColor
  /** Screen-reader accessible label. Defaults to "Loading...". */
  label?: string
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-10 border-[3px]",
  xl: "size-14 border-4",
}

const colorClasses: Record<SpinnerColor, string> = {
  primary:   "border-primary/20 border-t-primary",
  secondary: "border-secondary/20 border-t-secondary",
  muted:     "border-muted-foreground/20 border-t-muted-foreground",
  white:     "border-white/20 border-t-white",
}

export function Spinner({
  size = "md",
  color = "primary",
  label = "Loading...",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block rounded-full animate-spin",
          sizeClasses[size],
          colorClasses[color],
        )}
      />
      {/* Screen-reader text */}
      <span className="sr-only">{label}</span>
    </span>
  )
}
