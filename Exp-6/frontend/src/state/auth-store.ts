/**
 * DVote Frontend — In-Memory Auth Store (Zustand)
 *
 * SECURITY POLICY (L-B1, L-B2 — non-negotiable):
 *   Access tokens are stored EXCLUSIVELY in this in-memory Zustand store.
 *   NEVER write tokens to localStorage, sessionStorage, or any cookie.
 *   Tokens are lost on page refresh — re-auth via silent refresh or re-login.
 *
 * State shape:
 *   - accessToken: string | null — in-memory JWT bearer token
 *   - sessionId: string | null — backend-assigned session identifier
 *   - role: DVoteRole | null — resolved from GET /auth/me (NEVER from JWT claims)
 *   - walletAddress: string | null — EVM checksum address of authenticated wallet
 *   - isHydrated: boolean — true once startup session check has completed
 *   - isAuthenticated: boolean — derived: token != null && role != null
 *
 * Wire hooks (circular dependency breaking):
 *   api-client.ts calls wireTokenGetter() at startup to inject the token getter
 *   without importing auth-store directly (avoids circular dep).
 *   wireUnauthorizedHandler() wires the 401→clearSession callback.
 *
 * Authority: FEATURE_FRONTEND §6.3, walkthrough Phase F §5
 * Authority: BACKEND_HANDOFF_REPORT §5.1 (auth transport: access token in memory)
 */

import { create } from "zustand"
import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Session metadata type ────────────────────────────────────────────────────

export interface SessionMeta {
  /** JWT bearer access token — NEVER persisted outside this store */
  accessToken: string | null
  /** Backend-assigned session UUID */
  sessionId: string | null
  /** Resolved role from GET /api/v1/auth/me — NEVER from JWT claims */
  role: DVoteRole | null
  /** EVM checksum address of authenticated wallet */
  walletAddress: string | null
  /**
   * True once the startup session hydration check has completed.
   * Guards must await isHydrated before making auth decisions (CDM-4).
   */
  isHydrated: boolean
}

// ─── Store actions ────────────────────────────────────────────────────────────

interface AuthActions {
  /** Set access token (called after verify endpoint returns token). */
  setAccessToken: (token: string) => void
  /**
   * Set full session metadata after successful login.
   * Role MUST come from GET /auth/me — never extracted from token payload.
   */
  setSession: (meta: {
    accessToken: string
    sessionId: string
    role: DVoteRole
    walletAddress: string
  }) => void
  /** Mark hydration complete (called after startup GET /auth/me attempt). */
  setHydrated: () => void
  /** Update role from GET /auth/me re-resolve (e.g., after role change event). */
  updateRole: (role: DVoteRole) => void
  /**
   * Clear all session state. Called on:
   *   - Explicit logout
   *   - 401 response from API (via wireUnauthorizedHandler callback)
   *   - Wallet disconnect event (Policy L-B2)
   *   - Inactivity timeout (Phase H)
   */
  clearSession: () => void
}

// ─── Store type ───────────────────────────────────────────────────────────────

type AuthStore = SessionMeta & AuthActions & {
  /** Derived: true if accessToken and role are both non-null */
  isAuthenticated: boolean
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_SESSION: SessionMeta = {
  accessToken: null,
  sessionId: null,
  role: null,
  walletAddress: null,
  isHydrated: false,
}

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...INITIAL_SESSION,
  isAuthenticated: false,

  setAccessToken: (token) =>
    set((s) => ({
      accessToken: token,
      isAuthenticated: token != null && s.role != null,
    })),

  setSession: ({ accessToken, sessionId, role, walletAddress }) =>
    set({
      accessToken,
      sessionId,
      role,
      walletAddress,
      isAuthenticated: true,
    }),

  setHydrated: () => set({ isHydrated: true }),

  updateRole: (role) =>
    set((s) => ({
      role,
      isAuthenticated: s.accessToken != null && role != null,
    })),

  clearSession: () =>
    set({
      ...INITIAL_SESSION,
      // Keep isHydrated true — we know startup check already ran
      isHydrated: get().isHydrated,
      isAuthenticated: false,
    }),
}))

// ─── Selectors (stable references) ───────────────────────────────────────────

/** Returns current access token without subscribing to full store updates. */
export const getAccessToken = (): string | null =>
  useAuthStore.getState().accessToken

/** Returns current role without subscribing to full store updates. */
export const getRole = (): DVoteRole | null =>
  useAuthStore.getState().role

/** Returns current wallet address without subscribing. */
export const getWalletAddress = (): string | null =>
  useAuthStore.getState().walletAddress

// ─── Wire API client callbacks at module load ─────────────────────────────────
// Imported here (not in api-client) to break the circular dependency.
// api-client.ts calls wireTokenGetter(getAccessToken) and
// wireUnauthorizedHandler(clearSession) in a separate wire module (Phase J).
// These selectors are the stable references passed to those wires.
