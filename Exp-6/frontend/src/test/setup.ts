/**
 * DVote Frontend — Test Setup
 *
 * Global test configuration and mocks for unit/integration tests.
 *
 * Authority: walkthrough Phase V
 */

import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom"

// Global afterEach cleanup
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock })

// Mock import.meta.env
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_BASE_URL: "http://localhost:4000",
    VITE_APP_WALLETCONNECT_PROJECT_ID: "test-project-id",
    MODE: "test",
  },
})

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:5173/",
    origin: "http://localhost:5173",
    pathname: "/",
    search: "",
    hash: "",
  },
  writable: true,
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
  writable: true,
})

// Mock wagmi hooks
vi.mock("@/hooks/useWalletGovernance", () => ({
  useWalletGovernance: () => ({
    governanceState: { status: "WalletMismatchLocked" },
    isLoading: false,
  }),
}))

vi.mock("@/hooks/useFreshness", () => ({
  useFreshness: () => ({
    freshnessState: { status: "fresh", lastChecked: new Date() },
    isLoading: false,
  }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    accessToken: null,
    isAuthenticated: false,
    login: async () => {},
    logout: async () => {},
  }),
}))

export {}

// Re-export testing utilities for convenience
export { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
export { vi } from "vitest"