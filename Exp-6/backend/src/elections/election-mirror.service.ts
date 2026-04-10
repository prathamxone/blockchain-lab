import { prisma } from "../db/prisma.js";
import { deriveFreshnessMeta, type FreshnessMeta } from "../lib/freshness.js";
import {
  buildPaginationEnvelope,
  decodeCursor,
  encodeCursor,
  normalizePageOptions,
  type PaginationEnvelope
} from "../lib/pagination/cursor.js";

interface ElectionListInput {
  limit?: number | undefined;
  offset?: number | undefined;
  cursor?: string | undefined;
}

interface ElectionView {
  electionId: string;
  status: string;
  finalizationOutcome: string | null;
  parentElectionId: string | null;
  childElectionId: string | null;
  contestingCandidateCap: number;
  isSuperseded: boolean;
  isNota: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ElectionListResult {
  items: ElectionView[];
  pagination: PaginationEnvelope;
  freshness: FreshnessMeta;
}

function mapElection(item: {
  electionId: string;
  status: string;
  finalizationOutcome: string | null;
  parentElectionId: string | null;
  childElectionId: string | null;
  contestingCandidateCap: number;
  createdAt: Date;
  updatedAt: Date;
}): ElectionView {
  return {
    electionId: item.electionId,
    status: item.status,
    finalizationOutcome: item.finalizationOutcome,
    parentElectionId: item.parentElectionId,
    childElectionId: item.childElectionId,
    contestingCandidateCap: item.contestingCandidateCap,
    isSuperseded: Boolean(item.childElectionId),
    isNota: false,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

async function readFreshnessMeta(): Promise<FreshnessMeta> {
  const latestSync = await prisma.electionMirror.findFirst({
    where: {
      lastSyncedAt: {
        not: null
      }
    },
    orderBy: {
      lastSyncedAt: "desc"
    },
    select: {
      lastSyncedAt: true
    }
  });

  return deriveFreshnessMeta(latestSync?.lastSyncedAt ?? null);
}

export const electionMirrorService = {
  async listElections(input: ElectionListInput): Promise<ElectionListResult> {
    const page = normalizePageOptions(input);

    const query: {
      where?: {
        OR: Array<
          | {
              createdAt: {
                lt: Date;
              };
            }
          | {
              createdAt: Date;
              id: {
                lt: string;
              };
            }
        >;
      };
      orderBy: Array<{ createdAt: "desc" } | { id: "desc" }>;
      skip: number;
      take: number;
    } = {
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page.cursor ? 0 : page.offset,
      take: page.limit + 1
    };

    if (page.cursor) {
      const parsed = decodeCursor(page.cursor);
      const cursorDate = new Date(parsed.createdAt);

      query.where = {
        OR: [
          {
            createdAt: {
              lt: cursorDate
            }
          },
          {
            createdAt: cursorDate,
            id: {
              lt: parsed.id
            }
          }
        ]
      };
    }

    const records = await prisma.electionMirror.findMany(query);

    const hasNext = records.length > page.limit;
    const pageRows = hasNext ? records.slice(0, page.limit) : records;

    const nextCursor = hasNext
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1]!.createdAt.toISOString(),
          id: pageRows[pageRows.length - 1]!.id,
          issuedAt: Date.now()
        })
      : null;

    return {
      items: pageRows.map(mapElection),
      pagination: buildPaginationEnvelope({
        nextCursor,
        limit: page.limit,
        offset: page.cursor ? page.offset : page.offset + pageRows.length
      }),
      freshness: await readFreshnessMeta()
    };
  },

  async getElectionById(electionId: string): Promise<{ election: ElectionView | null; freshness: FreshnessMeta }> {
    const election = await prisma.electionMirror.findUnique({
      where: {
        electionId
      }
    });

    if (!election) {
      return {
        election: null,
        freshness: await readFreshnessMeta()
      };
    }

    return {
      election: mapElection(election),
      freshness: deriveFreshnessMeta(election.lastSyncedAt ?? null)
    };
  },

  async listResults(input: ElectionListInput): Promise<ElectionListResult> {
    const result = await this.listElections(input);
    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        status: "RESULT_READY"
      }))
    };
  },

  async getResultByElectionId(electionId: string): Promise<{ result: ElectionView | null; freshness: FreshnessMeta }> {
    const detail = await this.getElectionById(electionId);
    return {
      result: detail.election
        ? {
            ...detail.election,
            status: "RESULT_READY"
          }
        : null,
      freshness: detail.freshness
    };
  }
};
