/**
 * DVote Frontend — Confirm Dialog Component
 *
 * Critical action confirmation dialog.
 * Used for vote cast confirmation to ensure explicit user consent.
 *
 * Vote cast confirmation:
 * - Voter selects candidate → confirms intent
 * - Modal displays candidate name + election context
 * - Explicit confirm button required before wallet signature
 *
 * Policy L-D1: Vote token countdown visible throughout confirmation.
 *
 * Authority: walkthrough Phase P, CDM-13
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/LoadingButton"

interface ConfirmDialogProps {
  /** Controls dialog open/close state */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Descriptive text explaining the action consequences */
  description?: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Loading state for confirm action */
  isConfirmLoading?: boolean
  /** Disabled state for confirm button */
  isConfirmDisabled?: boolean
  /** Accessible label for loading state */
  confirmLoadingLabel?: string
  /** Callback when confirm is clicked */
  onConfirm: () => void
  /** Optional JSX content rendered between header and footer */
  children?: React.ReactNode
}

/**
 * Confirmation dialog for sensitive vote actions.
 * Renders a modal with title, optional description, and explicit confirm/cancel buttons.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirmLoading = false,
  isConfirmDisabled = false,
  confirmLoadingLabel = "Processing...",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={isConfirmLoading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>

          <LoadingButton
            isLoading={isConfirmLoading}
            loadingLabel={confirmLoadingLabel}
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            aria-disabled={isConfirmDisabled || isConfirmLoading}
          >
            {confirmLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
