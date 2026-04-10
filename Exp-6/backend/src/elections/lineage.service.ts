import { prisma } from "../db/prisma.js";

type ElectionMirrorRecord = Awaited<ReturnType<typeof prisma.electionMirror.findUnique>>;

interface LineageNode {
  electionId: string;
  status: string;
  finalizationOutcome: string | null;
  parentElectionId: string | null;
  childElectionId: string | null;
  isSuperseded: boolean;
}

export const lineageService = {
  async getLineage(electionId: string): Promise<{
    rootElectionId: string;
    nodes: LineageNode[];
  } | null> {
    const start = await prisma.electionMirror.findUnique({
      where: {
        electionId
      }
    });

    if (!start) {
      return null;
    }

    const visited = new Set<string>();
    const nodesById = new Map<string, LineageNode>();

    let cursor: ElectionMirrorRecord = start;
    while (cursor && !visited.has(cursor.electionId)) {
      visited.add(cursor.electionId);
      nodesById.set(cursor.electionId, {
        electionId: cursor.electionId,
        status: cursor.status,
        finalizationOutcome: cursor.finalizationOutcome,
        parentElectionId: cursor.parentElectionId,
        childElectionId: cursor.childElectionId,
        isSuperseded: Boolean(cursor.childElectionId)
      });

      if (!cursor.parentElectionId) {
        break;
      }

      cursor = await prisma.electionMirror.findUnique({
        where: {
          electionId: cursor.parentElectionId
        }
      });
    }

    const rootElectionId = cursor?.electionId ?? start.electionId;

    let forwardCursor: string | null = rootElectionId;
    while (forwardCursor) {
      const node = nodesById.get(forwardCursor);
      if (node?.childElectionId) {
        forwardCursor = node.childElectionId;
        continue;
      }

      const record: ElectionMirrorRecord = await prisma.electionMirror.findUnique({
        where: {
          electionId: forwardCursor
        }
      });

      if (!record || !record.childElectionId || visited.has(record.childElectionId)) {
        break;
      }

      visited.add(record.childElectionId);

      const child: ElectionMirrorRecord = await prisma.electionMirror.findUnique({
        where: {
          electionId: record.childElectionId
        }
      });

      if (!child) {
        break;
      }

      nodesById.set(child.electionId, {
        electionId: child.electionId,
        status: child.status,
        finalizationOutcome: child.finalizationOutcome,
        parentElectionId: child.parentElectionId,
        childElectionId: child.childElectionId,
        isSuperseded: Boolean(child.childElectionId)
      });

      forwardCursor = child.electionId;
    }

    const nodes: LineageNode[] = [];
    let nextId: string | null = rootElectionId;

    while (nextId) {
      const node = nodesById.get(nextId);
      if (!node) {
        break;
      }

      nodes.push(node);
      nextId = node.childElectionId;
    }

    return {
      rootElectionId,
      nodes
    };
  }
};
