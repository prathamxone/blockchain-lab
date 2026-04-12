/**
 * DVote Frontend — Locale-Safe Formatting Utilities
 *
 * Provides Intl-based formatters for dates, numbers, and election-related
 * text with explicit locale handling for the English-first MVP.
 *
 * Authority: FEATURE_FRONTEND §12.6 (typography/intl), walkthrough Phase 15
 */

const DVOTE_LOCALE = "en-IN" as const

// ─── Date / Time Formatters ──────────────────────────────────────────────────

/**
 * Format a date as "12 Apr 2026" (short month name, no leading zero on day).
 */
export function formatDateShort(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return new Intl.DateTimeFormat(DVOTE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

/**
 * Format a date as "April 12, 2026" (long month name, full year).
 */
export function formatDateLong(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return new Intl.DateTimeFormat(DVOTE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

/**
 * Format a datetime as "12 Apr 2026 at 3:45 PM" with timezone context.
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return new Intl.DateTimeFormat(DVOTE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d)
}

/**
 * Format a datetime as relative time ("2 hours ago", "in 3 days").
 * Falls back to absolute date for dates older than 7 days.
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const now = Date.now()
  const diffMs = d.getTime() - now
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  const abs   = Math.abs(diffSec)

  const rtf = new Intl.RelativeTimeFormat(DVOTE_LOCALE, { numeric: "auto" })

  if (abs < 60)       return rtf.format(diffSec, "second")
  if (abs < 3600)     return rtf.format(diffMin, "minute")
  if (abs < 86400)    return rtf.format(diffHour, "hour")
  if (abs < 604800)   return rtf.format(diffDay, "day")

  // Older than 7 days — fall back to absolute
  return formatDateShort(d)
}

// ─── Countdown / Duration Formatters ─────────────────────────────────────────

/**
 * Format a future date as a countdown string: "3d 14h 22m" or "14:30:00" if < 24h.
 * Returns null if the date is in the past.
 */
export function formatCountdown(futureDate: Date | string | number): string | null {
  const d = typeof futureDate === "string" || typeof futureDate === "number"
    ? new Date(futureDate)
    : futureDate

  const now  = Date.now()
  const diff = d.getTime() - now

  if (diff <= 0) return null

  const totalSec = Math.floor(diff / 1000)
  const days     = Math.floor(totalSec / 86400)
  const hours    = Math.floor((totalSec % 86400) / 3600)
  const minutes  = Math.floor((totalSec % 3600) / 60)
  const seconds   = totalSec % 60

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
  }

  // Less than 24 hours — show HH:MM:SS
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0")
  const m = String(minutes).padStart(2, "0")
  const s = String(seconds).padStart(2, "0")
  return `${h}:${m}:${s}`
}

/**
 * Format a duration in milliseconds as "Xm Ys" (for vote token TTL countdown).
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const minutes  = Math.floor(totalSec / 60)
  const seconds  = totalSec % 60
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`
  return `${seconds}s`
}

// ─── Number Formatters ────────────────────────────────────────────────────────

/**
 * Format a number with Indian locale grouping (e.g. 1,23,45,678).
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(DVOTE_LOCALE).format(n)
}

/**
 * Format a number with up to 2 decimal places (e.g. vote percentages).
 */
export function formatDecimal(n: number, decimals = 2): string {
  return new Intl.NumberFormat(DVOTE_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Format a large number with compact notation ("1.2K", "3.4M").
 */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat(DVOTE_LOCALE, { notation: "compact" }).format(n)
}

// ─── Text Utilities ───────────────────────────────────────────────────────────

/**
 * Format an election title for display, truncating to maxLen characters.
 */
export function truncateText(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + "..."
}

/**
 * Format a 12-digit Aadhaar or 10-digit EPIC-like number for display
 * with partial masking.  e.g. "XXXX-XXXX-1234" for Aadhaar.
 */
export function maskNumberLast4(fullNumber: string): string {
  const cleaned = fullNumber.replace(/\D/g, "")
  if (cleaned.length < 4) return "XXXX"
  return `XXXX-XXXX-${cleaned.slice(-4)}`
}