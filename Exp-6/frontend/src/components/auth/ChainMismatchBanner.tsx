/**
 * DVote Frontend — Chain Mismatch Banner
 *
 * CDM-5 (CRITICAL): Chain mismatch banner MUST appear BEFORE any signature
 * attempt. Never allow challenge fetch if chain ≠ Sepolia (11155111).
 *
 * Rendered when:
 *   - Wallet is connected (isConnected=true)
 *   - Connected chain ID ≠ TARGET_CHAIN_ID (11155111 / Sepolia)
 *
 * Banner is PERSISTENT (not dismissable) until user switches network.
 * Blocks the login flow downstream — LoginPage checks chainId before
 * calling useAuth.login() via useIsOnCorrectChain (exported from hooks/useAuth.ts).
 *
 * Shows RainbowKit's built-in chain switcher button via useChainModal().
 *
 * Authority: FEATURE_FRONTEND §6.2 (failure branch: unsupported chain),
 *            walkthrough Phase G §4, CDM-5
 */

import { useAccount, useChainId } from "wagmi"
import { useChainModal } from "@rainbow-me/rainbowkit"
import { AlertTriangle } from "lucide-react"
import { TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from "@/config/roles"
import { cn } from "@/lib/utils"

interface ChainMismatchBannerProps {
  className?: string
}

export function ChainMismatchBanner({ className }: ChainMismatchBannerProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { openChainModal } = useChainModal()

  // Only show when connected AND on wrong chain
  const isOnWrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  if (!isOnWrongChain) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "w-full flex items-start gap-3 rounded-lg border px-4 py-3",
        "bg-dvote-warning-light border-dvote-warning/40",
        className,
      )}
    >
      {/* Warning icon */}
      <AlertTriangle
        className="mt-0.5 size-5 flex-shrink-0 text-dvote-warning"
        aria-hidden="true"
      />

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dvote-warning">
          Wrong Network Detected
        </p>
        <p className="mt-0.5 text-sm text-dvote-warning/80">
          DVote requires the{" "}
          <strong>{TARGET_CHAIN_NAME}</strong> testnet (Chain ID {TARGET_CHAIN_ID}).
          Please switch your wallet network before signing in.
        </p>
      </div>

      {/* Switch network CTA */}
      {openChainModal && (
        <button
          type="button"
          onClick={openChainModal}
          className={cn(
            "flex-shrink-0 rounded-md px-3 py-1.5",
            "text-xs font-semibold text-dvote-warning",
            "border border-dvote-warning/50 bg-dvote-warning/10",
            "hover:bg-dvote-warning/20 transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dvote-warning",
          )}
        >
          Switch to {TARGET_CHAIN_NAME}
        </button>
      )}
    </div>
  )
}

