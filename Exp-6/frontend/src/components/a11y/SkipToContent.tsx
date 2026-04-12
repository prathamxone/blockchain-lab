/**
 * DVote Frontend — Skip to Main Content Link (Accessibility)
 *
 * Renders a visually-hidden link that becomes visible on focus.
 * Allows keyboard-only users to skip repeated navigation and jump directly
 * to the page's main content.
 *
 * Authority: walkthrough Phase E §10 + Phase T (CDM-17 — focus rings never hidden)
 * WCAG 2.1 SC 2.4.1 (Bypass Blocks) — required for keyboard navigation compliance.
 *
 * Usage:
 *   Place as the FIRST element inside <body> (before any navigation).
 *   The main content region must have id="main-content".
 *
 *   <SkipToContent />
 *   <nav>...</nav>
 *   <main id="main-content">...</main>
 */

import { cn } from "@/lib/utils"

interface SkipToContentProps {
  /** Target element ID of the main content region. Defaults to "main-content". */
  targetId?: string
  /** Label text shown when focused. */
  label?: string
}

export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Visually hidden until focused
        "sr-only focus:not-sr-only",
        // On focus: absolute position at top of page, highly visible
        "focus:absolute focus:left-4 focus:top-4 focus:z-[9999]",
        "focus:rounded-md focus:px-4 focus:py-2",
        // High-contrast saffron background for visibility against any surface
        "focus:bg-primary focus:text-primary-foreground",
        "focus:text-sm focus:font-semibold focus:no-underline",
        // Focus ring enforced (CDM-17)
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      )}
    >
      {label}
    </a>
  )
}
