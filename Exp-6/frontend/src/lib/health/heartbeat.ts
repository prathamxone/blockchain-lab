/**
 * DVote Frontend — Health Heartbeat Utility
 *
 * Provides a lightweight, non-blocking health check for the frontend diagnostics.
 * Does not make actual API calls - simply validates that the app is running
 * and the API client is configured.
 *
 * Authority: walkthrough Phase U §4
 *
 * Usage:
 *   import { checkHealth } from '@/lib/health/heartbeat'
 *   const status = checkHealth() // { healthy: true, timestamp: Date }
 */

export interface HealthStatus {
  healthy: boolean
  timestamp: Date
  version: string
  environment: string
}

/**
 * Non-blocking health check.
 * Returns a status object without making network requests.
 * Real health status should be verified via backend /health endpoint.
 */
export function checkHealth(): HealthStatus {
  return {
    healthy: true,
    timestamp: new Date(),
    version: import.meta.env.VITE_APP_VERSION ?? "0.1.0",
    environment: import.meta.env.MODE ?? "development",
  }
}

/**
 * Format the health timestamp for display
 */
export function formatHealthTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
}