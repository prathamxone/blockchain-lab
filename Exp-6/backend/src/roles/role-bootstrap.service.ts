import { RoleName } from "@prisma/client";
import { getAddress, isAddress } from "viem";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../lib/logger.js";

interface RoleBootstrapResult {
  upserted: number;
  skipped: number;
}

interface RoleEntry {
  role: RoleName;
  wallet: string | undefined;
}

function normalizeWallet(wallet: string): string | null {
  const trimmed = wallet.trim();
  if (!isAddress(trimmed)) {
    return null;
  }

  return getAddress(trimmed);
}

const roleEntries: RoleEntry[] = [
  { role: RoleName.ADMIN, wallet: env.ADMIN_WALLET },
  { role: RoleName.ECI, wallet: env.ECI_WALLET },
  { role: RoleName.SRO, wallet: env.SRO_WALLET },
  { role: RoleName.RO, wallet: env.RO_WALLET },
  { role: RoleName.OBSERVER, wallet: env.OBSERVER_WALLET }
];

export async function bootstrapRoleWallets(): Promise<RoleBootstrapResult> {
  let upserted = 0;
  let skipped = 0;

  for (const entry of roleEntries) {
    if (!entry.wallet || entry.wallet.trim().length === 0) {
      skipped += 1;
      continue;
    }

    const normalizedWallet = normalizeWallet(entry.wallet);
    if (!normalizedWallet) {
      skipped += 1;
      logger.warn("Skipping invalid bootstrap wallet", {
        role: entry.role,
        walletPreview: `${entry.wallet.slice(0, 8)}...`
      });
      continue;
    }

    await prisma.roleWallet.upsert({
      where: { wallet: normalizedWallet },
      update: {
        role: entry.role,
        source: "env-bootstrap",
        active: true
      },
      create: {
        wallet: normalizedWallet,
        role: entry.role,
        source: "env-bootstrap",
        active: true
      }
    });

    upserted += 1;
  }

  return { upserted, skipped };
}
