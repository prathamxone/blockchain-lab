/**
 * DVote Frontend — TanStack Query Client Configuration
 *
 * Shared QueryClient instance with DVote-specific defaults:
 * - staleTime: 15s (matches active-tab polling cadence from FEATURE_FRONTEND §8.3)
 * - gcTime: 5 minutes (keep unused query results cached for smooth navigation)
 * - retry: 1 (single automatic retry on transient failures to avoid cascade)
 * - retryDelay: exponential with 1s base, capped at 10s
 * - refetchOnWindowFocus: true (immediate refetch on tab re-activation)
 * - refetchOnReconnect: true (immediate refetch on network reconnect)
 *
 * Authority: FEATURE_FRONTEND §8.3 (polling freshness strategy)
 * Background tab polling is handled at hook level (useFreshness) not here.
 */

import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 15 seconds — matches active-tab freshness polling cadence
      staleTime: 15 * 1000,

      // 5 minutes — keep data in cache for smooth back-navigation
      gcTime: 5 * 60 * 1000,

      // Single retry on transient failure (network blip, 503)
      retry: 1,

      // Exponential backoff: 1s → 2s → cap at 10s
      retryDelay: (attemptIndex) =>
        Math.min(1000 * Math.pow(2, attemptIndex), 10_000),

      // Immediately refetch when user returns to tab or reconnects
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Do not refetch on mount if data is still fresh
      refetchOnMount: true,
    },
    mutations: {
      // Mutations do not auto-retry — sensitive actions (vote, KYC) must be explicit
      retry: false,
    },
  },
})
