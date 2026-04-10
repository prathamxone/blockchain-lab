import { APP_CONSTANTS } from "../config/constants.js";
import { prisma } from "../db/prisma.js";

export type RerunSlaState = "on-track" | "due-soon" | "breached" | "not-required";

function deriveDeadline(rerunRequiredAt: Date | null, rerunDeadline: Date | null): Date | null {
  if (rerunDeadline) {
    return rerunDeadline;
  }

  if (!rerunRequiredAt) {
    return null;
  }

  return new Date(rerunRequiredAt.getTime() + APP_CONSTANTS.rerunSlaDays * 24 * 60 * 60 * 1000);
}

function deriveSlaState(deadline: Date | null): RerunSlaState {
  if (!deadline) {
    return "not-required";
  }

  const now = Date.now();
  const remainingMs = deadline.getTime() - now;

  if (remainingMs < 0) {
    return "breached";
  }

  const dueSoonMs = APP_CONSTANTS.rerunDueSoonHours * 60 * 60 * 1000;
  if (remainingMs <= dueSoonMs) {
    return "due-soon";
  }

  return "on-track";
}

export const rerunService = {
  async getRerunStatus(electionId: string): Promise<{
    electionId: string;
    rerunRequired: boolean;
    rerunRequiredAt: string | null;
    rerunDeadline: string | null;
    slaState: RerunSlaState;
    finalizationOutcome: string | null;
    parentElectionId: string | null;
    childElectionId: string | null;
  } | null> {
    const election = await prisma.electionMirror.findUnique({
      where: {
        electionId
      }
    });

    if (!election) {
      return null;
    }

    const deadline = deriveDeadline(election.rerunRequiredAt, election.rerunDeadline);
    const slaState = deriveSlaState(deadline);

    return {
      electionId,
      rerunRequired: Boolean(election.rerunRequiredAt),
      rerunRequiredAt: election.rerunRequiredAt ? election.rerunRequiredAt.toISOString() : null,
      rerunDeadline: deadline ? deadline.toISOString() : null,
      slaState,
      finalizationOutcome: election.finalizationOutcome,
      parentElectionId: election.parentElectionId,
      childElectionId: election.childElectionId
    };
  }
};
