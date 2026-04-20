/**
 * DVote Frontend — Focus Outline Debug Tool
 *
 * Renders a visible overlay that highlights all focus rings on the page.
 * Toggleable via URL param (?focus-debug=true) or localStorage key.
 * Used during development to verify CDM-17 compliance.
 *
 * Authority: walkthrough Phase T §2 (CDM-17 — focus rings never hidden)
 * WIG: MUST have visible focus rings on all interactive elements
 *
 * Usage:
 *   <FocusOutlineDebug />
 *   Add ?focus-debug=true to URL or call localStorage.setItem('focus-debug', 'true')
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'focus-debug'
const URL_PARAM = 'focus-debug'

interface FocusOutlineDebugProps {
  /** Override initial visibility state */
  visible?: boolean
}

export function FocusOutlineDebug({ visible: initialVisible }: FocusOutlineDebugProps) {
  const [isEnabled, setIsEnabled] = useState(initialVisible ?? false)

  useEffect(() => {
    // Check URL param first
    const urlParams = new URLSearchParams(window.location.search)
    const urlFlag = urlParams.get(URL_PARAM)

    // Then check localStorage
    const storageFlag = localStorage.getItem(STORAGE_KEY)

    const shouldEnable = urlFlag === 'true' || storageFlag === 'true'
    setIsEnabled(shouldEnable ?? false)

    // Sync URL param to localStorage if present
    if (urlFlag === 'true' && storageFlag !== 'true') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [])

  const toggle = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    localStorage.setItem(STORAGE_KEY, newValue ? 'true' : 'false')

    // Update URL param without reload
    const url = new URL(window.location.href)
    if (newValue) {
      url.searchParams.set(URL_PARAM, 'true')
    } else {
      url.searchParams.delete(URL_PARAM)
    }
    window.history.replaceState({}, '', url.toString())
  }

  if (!isEnabled) return null

  return (
    <>
      {/* Debug toggle button */}
      <button
        onClick={toggle}
        aria-label="Toggle focus debug overlay"
        title="Click to disable focus debug overlay"
        className={cn(
          'fixed bottom-4 right-4 z-[9999]',
          'bg-neutral-900 text-white',
          'px-3 py-2 rounded-lg text-xs font-mono',
          'shadow-lg',
          'hover:bg-neutral-800 active:bg-neutral-700',
          'focus:outline-none focus:ring-2 focus:ring-dvote-saffron focus:ring-offset-2',
        )}
      >
        Focus Debug: ON
      </button>

      {/* Overlay injection via style tag */}
      <FocusOverlayStyles />
    </>
  )
}

/**
 * Injects global styles that add visible outlines to all focused elements.
 * Uses CSS to target :focus-visible and add a high-contrast saffron ring.
 */
function FocusOverlayStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        /* Focus debug mode — makes all focus rings visible with debug styling */
        [data-focus-debug="true"] *:focus-visible {
          outline: 3px solid #E87F24 !important;
          outline-offset: 2px !important;
          background-color: rgba(232, 127, 36, 0.1) !important;
        }

        /* Also highlight buttons and links */
        [data-focus-debug="true"] button:focus-visible,
        [data-focus-debug="true"] a:focus-visible,
        [data-focus-debug="true"] input:focus-visible,
        [data-focus-debug="true"] select:focus-visible,
        [data-focus-debug="true"] textarea:focus-visible {
          box-shadow: 0 0 0 3px #E87F24, 0 0 0 6px rgba(232, 127, 36, 0.3) !important;
        }

        /* Show focus ring boundaries */
        [data-focus-debug="true"] *:focus-visible::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px dashed rgba(232, 127, 36, 0.5);
          pointer-events: none;
        }
      `,
      }}
    />
  )
}

/**
 * Component that applies focus-debug attribute to the document body.
 * Wrap your app with this to enable focus debug mode globally.
 */
export function FocusDebugProvider({ children }: { children: React.ReactNode }) {
  const [debugEnabled, setDebugEnabled] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === 'true'
    const urlParam = new URLSearchParams(window.location.search).get(URL_PARAM) === 'true'

    const enabled = stored || urlParam
    setDebugEnabled(enabled)

    if (enabled) {
      document.body.setAttribute('data-focus-debug', 'true')
    } else {
      document.body.removeAttribute('data-focus-debug')
    }
  }, [])

  return (
    <>
      {children}
      {debugEnabled && <FocusOverlayStyles />}
    </>
  )
}

/**
 * Hook to check if focus debug mode is enabled
 */
export function useFocusDebug() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === 'true' ||
      new URLSearchParams(window.location.search).get(URL_PARAM) === 'true'
  })

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY) === 'true'
      setEnabled(stored)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return enabled
}