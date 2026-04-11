/**
 * DVote Frontend — Base API Client
 *
 * Central HTTP client for all backend API calls.
 * Routes through VITE_API_BASE_URL with /api/v1/ prefix.
 *
 * Implements:
 * 1. Bearer token attachment from in-memory auth store (never localStorage).
 * 2. CSRF token extraction from dvote_csrf_token cookie and x-csrf-token header injection.
 * 3. Response envelope unwrapping: { ok, requestId, data } or { ok, requestId, error }.
 * 4. Error code taxonomy from BACKEND_HANDOFF_REPORT §5.2.
 * 5. 401 intercept hook for silent token refresh (wired in Phase H).
 * 6. PAGINATION_CURSOR_INVALID (400) detection for offset fallback guidance.
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.1–5.3
 *
 * IMPORTANT: This client MUST NOT persist tokens to localStorage or sessionStorage.
 * Access tokens live only in the in-memory auth store (Phase F).
 */

import { env } from "@/config/env"

// ─── API Error Taxonomy ───────────────────────────────────────────────────────
// Mirrors BACKEND_HANDOFF_REPORT §5.2 (frozen contract)

export type ApiErrorCode =
  | "VALIDATION_ERROR"          // 400
  | "PAGINATION_CURSOR_INVALID" // 400 — special: triggers offset fallback
  | "CLIENT_NONCE_INVALID_FORMAT" // 422
  | "UNAUTHORIZED"              // 401 — triggers silent refresh attempt
  | "FORBIDDEN"                 // 403
  | "NOT_FOUND"                 // 404
  | "CONFLICT"                  // 409 — e.g. vote already recorded
  | "UNPROCESSABLE"             // 422
  | "RATE_LIMITED"              // 429
  | "INTERNAL_ERROR"            // 500
  | "SERVICE_UNAVAILABLE"       // 503

// ─── Response envelope types ─────────────────────────────────────────────────

export interface ApiSuccessEnvelope<T> {
  ok: true
  requestId: string
  data: T
}

export interface ApiErrorEnvelope {
  ok: false
  requestId: string
  error: {
    code: ApiErrorCode
    message: string
    retryability: "retryable" | "non-retryable"
  }
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

// ─── DVote API Error class ────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly retryability: "retryable" | "non-retryable"
  readonly requestId: string
  readonly httpStatus: number

  constructor(
    code: ApiErrorCode,
    message: string,
    retryability: "retryable" | "non-retryable",
    requestId: string,
    httpStatus: number,
  ) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.retryability = retryability
    this.requestId = requestId
    this.httpStatus = httpStatus
  }

  get isPaginationCursorInvalid(): boolean {
    return this.code === "PAGINATION_CURSOR_INVALID"
  }

  get isUnauthorized(): boolean {
    return this.code === "UNAUTHORIZED"
  }

  get isConflict(): boolean {
    return this.code === "CONFLICT"
  }

  get isRateLimited(): boolean {
    return this.code === "RATE_LIMITED"
  }

  get isRetryable(): boolean {
    return this.retryability === "retryable"
  }
}

// ─── Network error (non-API) ──────────────────────────────────────────────────

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NetworkError"
  }
}

// ─── CSRF cookie extractor ────────────────────────────────────────────────────
// Reads the dvote_csrf_token cookie (readable, not HttpOnly).
// Sent as x-csrf-token header on mutating requests.
// Authority: BACKEND_HANDOFF_REPORT §5.3

function extractCsrfToken(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("dvote_csrf_token="))
  return match ? decodeURIComponent(match.split("=")[1]!) : null
}

// ─── In-memory access token accessor ─────────────────────────────────────────
// Lazy reference — actual store is wired in Phase F (auth-store.ts).
// Uses a mutable callback ref to avoid circular dependency.

let _getAccessToken: (() => string | null) | null = null

/**
 * Called once from auth-store initialization (Phase F) to wire the token getter.
 * Breaks circular dependency: api-client → auth-store → api-client.
 */
export function wireTokenGetter(getter: () => string | null): void {
  _getAccessToken = getter
}

// ─── 401 refresh hook ─────────────────────────────────────────────────────────
// Wired in Phase H (useTokenRefresh) to attempt silent token refresh on 401.

let _onUnauthorized: (() => Promise<void>) | null = null

export function wireUnauthorizedHandler(handler: () => Promise<void>): void {
  _onUnauthorized = handler
}

// ─── Request builder ──────────────────────────────────────────────────────────

const BASE_URL = `${env.apiBaseUrl}/api/v1`

interface RequestOptions {
  /** Skip Bearer token attachment (for public endpoints like /auth/challenge) */
  skipAuth?: boolean
  /** Skip CSRF header (GET requests never require CSRF) */
  skipCsrf?: boolean
  /** Additional headers to merge */
  headers?: Record<string, string>
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  }

  // Attach Bearer token from in-memory store
  if (!options.skipAuth && _getAccessToken) {
    const token = _getAccessToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  // Attach CSRF token for mutating requests
  const isMutation = method !== "GET" && method !== "HEAD"
  if (isMutation && !options.skipCsrf) {
    const csrf = extractCsrfToken()
    if (csrf) {
      headers["x-csrf-token"] = csrf
    }
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include", // Required for HttpOnly refresh cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new NetworkError(
      `Network request failed for ${method} ${path}: ${String(err)}`,
    )
  }

  // Parse envelope
  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new NetworkError(
      `Failed to parse JSON response for ${method} ${path} (status: ${response.status})`,
    )
  }

  if (!envelope.ok) {
    const err = new ApiError(
      envelope.error.code,
      envelope.error.message,
      envelope.error.retryability,
      envelope.requestId,
      response.status,
    )

    // 401: fire unauthorized handler to attempt silent token refresh (Phase H)
    if (err.isUnauthorized && _onUnauthorized) {
      await _onUnauthorized()
      // Re-throw so calling hook can retry or redirect cleanly
    }

    throw err
  }

  return envelope.data
}

// ─── Exported API client ──────────────────────────────────────────────────────

export const apiClient = {
  /** GET /api/v1/{path} — never requires CSRF */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, { skipCsrf: true, ...options })
  },

  /** POST /api/v1/{path} */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options)
  },

  /** PUT /api/v1/{path} */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, body, options)
  },

  /** PATCH /api/v1/{path} */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, body, options)
  },

  /** DELETE /api/v1/{path} */
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options)
  },
}

export type ApiClient = typeof apiClient

