import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";

function createEntryHash(): string {
  return randomBytes(20).toString("hex");
}

export const auditService = {
  async write(input: {
    actorWallet?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorWallet: input.actorWallet ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as Prisma.InputJsonValue,
        entryHash: createEntryHash()
      }
    });
  }
};
