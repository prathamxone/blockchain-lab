/**
 * DVote Frontend — Safe Action Button Component
 *
 * Duplicate-safe action trigger for sensitive vote operations.
 * Blocks repeated clicks while an action is in-flight.
 *
 * CDM-13 compliance:
 * - Vote recast is blocked until terminal state OR statusLookupWindowSec expires
 * - This button does NOT enforce the terminal-state check — that is the
 *   responsibility of the calling component (VoteCastModal)
 *
 * This component provides click-level duplicate suppression only.
 *
 * Policy L-D2: Recast blocked until terminal OR window expires.
 *
 * Authority: walkthrough Phase P, CDM-13
 *
 * Usage:
 *   <SafeActionButton
 *     isUnsafe={!canCast}
 *     isLoading={isSubmitting}
 *     unsafeLabel="Cast Vote"
 *     loadingLabel="Casting vote..."
 *     onClick={handleCast}
 *   />
 */

import { forwardRef } from "react"
import { LoadingButton } from "@/components/ui/LoadingButton"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"

interface SafeActionButtonProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "disabled">,
      VariantProps<typeof buttonVariants> {
  /**
   * When true, renders a disabled "safe" variant with unsafeLabel.
   * Does NOT block clicks while loading — use isLoading for that.
   */
  isUnsafe?: boolean
  /**
   * Label shown on the button when isUnsafe is true (safe state label).
   * Used as accessible name even when visually showing the unsafe state.
   */
  safeLabel: string
  /**
   * Label shown when isUnsafe is true (action not currently allowed).
   * Should be descriptive of why the action is blocked.
   */
  unsafeLabel?: string
  /** Suppresses duplicate clicks while action is in-flight */
  isLoading?: boolean
  /** Accessible label while loading */
  loadingLabel?: string
  /** Tooltip shown when isUnsafe is true */
  unsafeTooltip?: string
}

export const SafeActionButton = forwardRef<HTMLButtonElement, SafeActionButtonProps>(
  (
    {
      isUnsafe = false,
      safeLabel,
      unsafeLabel,
      isLoading = false,
      loadingLabel = "Processing...",
      unsafeTooltip,
      className,
      variant,
      size,
      onClick,
      ...props
    },
    ref,
  ) => {
    // When unsafe, show disabled state but keep the button present
    // for accessibility (the button is still in the tab order)
    const showUnsafe = isUnsafe && !isLoading

    return (
      <div className="relative" title={showUnsafe ? unsafeTooltip : undefined}>
        <LoadingButton
          ref={ref}
          variant={showUnsafe ? "outline" : variant}
          size={size}
          isLoading={isLoading}
          loadingLabel={loadingLabel}
          // Always render enabled — visual disabled is handled by variant
          disabled={false}
          aria-disabled={showUnsafe || isLoading}
          className={className}
          onClick={showUnsafe ? undefined : onClick}
          {...props}
        >
          {showUnsafe ? (
            <span className="text-muted-foreground">{unsafeLabel ?? safeLabel}</span>
          ) : (
            safeLabel
          )}
        </LoadingButton>
      </div>
    )
  },
)

SafeActionButton.displayName = "SafeActionButton"
