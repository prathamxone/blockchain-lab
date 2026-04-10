import { RoleName } from "@prisma/client";

import { auditService } from "../audit/audit.service.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";

interface CreateEscalationInput {
  electionId: string;
  createdByWallet: string;
  createdByRole: RoleName;
  reasonCategory: string;
  reasonNote: string;
  evidenceHashRef: string;
}

interface ExecuteEscalationInput {
  electionId: string;
  actorWallet: string;
  actorRole: RoleName;
}

export const escalationService = {
  async createTicket(input: CreateEscalationInput): Promise<{
    ticketId: string;
    status: string;
    createdAt: string;
  }> {
    const reasonCategory = input.reasonCategory.trim();
    const reasonNote = input.reasonNote.trim();
    const evidenceHashRef = input.evidenceHashRef.trim();

    if (!reasonCategory || !reasonNote || !evidenceHashRef) {
      throw appError.validation("reasonCategory, reasonNote, and evidenceHashRef are required");
    }

    const existingOpen = await prisma.rerunEscalationTicket.findFirst({
      where: {
        electionId: input.electionId,
        status: "OPEN"
      }
    });

    if (existingOpen) {
      throw appError.conflict("Open escalation ticket already exists for this election");
    }

    const ticket = await prisma.rerunEscalationTicket.create({
      data: {
        electionId: input.electionId,
        createdByWallet: input.createdByWallet,
        createdByRole: input.createdByRole,
        reasonCategory,
        reasonNote,
        evidenceHashRef,
        status: "OPEN"
      }
    });

    await auditService.write({
      actorWallet: input.createdByWallet,
      action: "RERUN_ESCALATION_TICKET_CREATED",
      entityType: "RerunEscalationTicket",
      entityId: ticket.id,
      payload: {
        electionId: input.electionId,
        reasonCategory,
        evidenceHashRef
      }
    });

    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString()
    };
  },

  async executeRerun(input: ExecuteEscalationInput): Promise<{
    ticketId: string;
    status: string;
    resolvedAt: string;
    executionMode: "stub";
  }> {
    const ticket = await prisma.rerunEscalationTicket.findFirst({
      where: {
        electionId: input.electionId,
        status: "OPEN"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!ticket) {
      throw appError.notFound("No open escalation ticket found for this election");
    }

    if (ticket.createdByRole !== RoleName.ADMIN) {
      throw appError.conflict("Escalation must be raised by Admin before ECI execution");
    }

    const resolvedAt = new Date();

    const updated = await prisma.rerunEscalationTicket.update({
      where: {
        id: ticket.id
      },
      data: {
        status: "EXECUTED",
        resolvedAt,
        resolvedByWallet: input.actorWallet
      }
    });

    await auditService.write({
      actorWallet: input.actorWallet,
      action: "RERUN_EXECUTED_STUB",
      entityType: "RerunEscalationTicket",
      entityId: updated.id,
      payload: {
        electionId: input.electionId,
        actorRole: input.actorRole,
        executionMode: "stub"
      }
    });

    return {
      ticketId: updated.id,
      status: updated.status,
      resolvedAt: resolvedAt.toISOString(),
      executionMode: "stub"
    };
  }
};
