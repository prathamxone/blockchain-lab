/**
 * DVote Frontend — Document Title Hook
 *
 * Enforces the "DVote - PageName" tab title convention across all pages.
 * Authority: walkthrough Phase E §9, walkthrough L-F2 (tab title policy).
 *
 * Usage:
 *   useDocumentTitle("Home")      → <title>DVote - Home</title>
 *   useDocumentTitle("Elections") → <title>DVote - Elections</title>
 *   useDocumentTitle("Login")     → <title>DVote - Login</title>
 *
 * The hook resets to the base title "DVote" on unmount to avoid stale titles
 * when navigating between pages that do not call this hook.
 */

import { useEffect } from "react"

const BASE_TITLE = "DVote"

/**
 * Sets the document title on mount and resets on unmount.
 *
 * @param pageName - The page-specific suffix (e.g., "Home", "Elections").
 *                   Renders as "DVote - {pageName}" in the browser tab.
 *                   Pass an empty string to reset to "DVote" (base title only).
 */
export function useDocumentTitle(pageName: string): void {
  useEffect(() => {
    const prev = document.title

    document.title = pageName ? `${BASE_TITLE} - ${pageName}` : BASE_TITLE

    return () => {
      // Restore previous title on unmount (handles nested route cases)
      document.title = prev
    }
  }, [pageName])
}
