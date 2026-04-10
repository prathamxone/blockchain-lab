import { WalletGovernanceStateType } from "@prisma/client";

import { prisma } from "../db/prisma.js";

export type WalletStatusContract =
  | "WalletMismatchLocked"
  | "WalletSwitchPendingApproval"
  | "WalletSwitchApprovedAwaitingOnChainRebind"
  | "WalletSwitchRejected";

function mapWalletStatus(state: WalletGovernanceStateType): WalletStatusContract {
  if (state === WalletGovernanceStateType.WALLET_SWITCH_PENDING_APPROVAL) {
    return "WalletSwitchPendingApproval";
  }

  if (state === WalletGovernanceStateType.WALLET_SWITCH_APPROVED_AWAITING_ONCHAIN_REBIND) {
    return "WalletSwitchApprovedAwaitingOnChainRebind";
  }

  if (state === WalletGovernanceStateType.WALLET_SWITCH_REJECTED) {
    return "WalletSwitchRejected";
  }

  return "WalletMismatchLocked";
}

export const walletStatusService = {
  async getWalletStatus(wallet: string, role: string): Promise<{
    wallet: string;
    role: string;
    state: WalletStatusContract;
    mismatchContext: string | null;
    pendingTargetWallet: string | null;
    reviewedAt: string | null;
  }> {
    const existing = await prisma.walletGovernanceState.findUnique({
      where: {
        wallet
      }
    });

    if (!existing) {
      return {
        wallet,
        role,
        state: "WalletMismatchLocked",
        mismatchContext: "No explicit wallet-governance approval state found",
        pendingTargetWallet: null,
        reviewedAt: null
      };
    }

    return {
      wallet,
      role,
      state: mapWalletStatus(existing.state),
      mismatchContext: existing.mismatchContext,
      pendingTargetWallet: existing.pendingTargetWallet,
      reviewedAt: existing.reviewedAt ? existing.reviewedAt.toISOString() : null
    };
  }
};
