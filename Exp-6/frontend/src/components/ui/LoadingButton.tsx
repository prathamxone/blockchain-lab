/**
 * DVote Frontend — Loading Button Component
 *
 * Extends the shadcn Button with integrated loading state.
 * Displays a Spinner and disables pointer events while loading.
 *
 * CDM-7 safety: Loading buttons used for vote-cast and KYC-submit
 * MUST be disabled while in-flight to prevent accidental duplicate submissions.
 *
 * Authority: walkthrough Phase E §5, CDM-7 (no auto-submit on re-auth)
 *
 * Usage:
 *   <LoadingButton isLoading={isMutating} loadingLabel="Casting vote...">
 *     Cast Vote
 *   </LoadingButton>
 */

import { forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/Spinner"
import { cn } from "@/lib/utils"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"

interface LoadingButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  /** When true, shows spinner and disables the button. */
  isLoading?: boolean
  /** Accessible label announced by screen readers while loading. */
  loadingLabel?: string
  /** Icon rendered before children (not shown while loading). */
  icon?: React.ReactNode
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      isLoading = false,
      loadingLabel = "Loading...",
      icon,
      children,
      disabled,
      className,
      variant,
      size,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={cn("relative gap-2", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner
              size="sm"
              // Button foreground color: white on primary/secondary, else muted
              color={
                variant === "default" || variant === "secondary"
                  ? "white"
                  : "muted"
              }
              label={loadingLabel}
            />
            <span>{loadingLabel}</span>
          </>
        ) : (
          <>
            {icon && <span aria-hidden="true">{icon}</span>}
            {children}
          </>
        )}
      </Button>
    )
  },
)

LoadingButton.displayName = "LoadingButton"
