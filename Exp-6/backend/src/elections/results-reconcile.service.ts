import { prisma } from "../db/prisma.js";

export const resultsReconcileService = {
  async markSynchronized(electionId: string): Promise<void> {
    await prisma.electionMirror.update({
      where: {
        electionId
      },
      data: {
        lastSyncedAt: new Date()
      }
    });
  }
};
