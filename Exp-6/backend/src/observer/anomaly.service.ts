import { APP_CONSTANTS } from "../config/constants.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";
import { deriveFreshnessMeta } from "../lib/freshness.js";
import {
  buildPaginationEnvelope,
  decodeCursor,
  encodeCursor,
  normalizePageOptions,
  type PaginationEnvelope
} from "../lib/pagination/cursor.js";

const ALLOWED_CATEGORIES = new Set([
  "DUPLICATE_IDENTITY_SUSPICION",
  "VOTE_SPIKE_SHORT_WINDOW",
  "INFRASTRUCTURE_OUTAGE_OR_DEGRADATION",
  "UNAUTHORIZED_ADMIN_ACTION_ATTEMPT",
  "KYC_REVIEW_MANIPULATION_SUSPICION"
]);

interface CreateAnomalyInput {
  reportedByWallet: string;
  electionId: string;
  constituencyId?: string | undefined;
  category: string;
  detail: string;
}

interface ListAnomalyInput {
  electionId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  cursor?: string | undefined;
}

interface ObserverAnomalyView {
  anomalyId: string;
  electionId: string;
  constituencyId: string | null;
  category: string;
  status: string;
  createdAt: string;
  trendBucket15m: string;
}

interface ObserverAnomalyListResult {
  items: ObserverAnomalyView[];
  aggregates: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  pagination: PaginationEnvelope;
  freshness: {
    lastSyncedAt: string | null;
    nextPollAfterSec: number;
    freshnessState: "fresh" | "stale" | "degraded";
  };
}

function toTrendBucket(date: Date): string {
  const bucketMs = 15 * 60 * 1000;
  const bucketStart = new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
  return bucketStart.toISOString();
}

export const anomalyService = {
  async report(input: CreateAnomalyInput): Promise<{ anomalyId: string; status: string; createdAt: string }> {
    const category = input.category.trim().toUpperCase();
    const detail = input.detail.trim();

    if (!ALLOWED_CATEGORIES.has(category)) {
      throw appError.validation("Unsupported anomaly category");
    }

    if (!detail) {
      throw appError.validation("Anomaly detail is required");
    }

    const windowStart = new Date(Date.now() - APP_CONSTANTS.anomalyLimitWindowSec * 1000);

    const inWindowCount = await prisma.observerAnomaly.count({
      where: {
        reportedByWallet: input.reportedByWallet,
        createdAt: {
          gte: windowStart
        }
      }
    });

    if (inWindowCount >= APP_CONSTANTS.anomalyLimitMaxPerWindow) {
      throw appError.rateLimited("Anomaly report limit reached for current window");
    }

    const created = await prisma.observerAnomaly.create({
      data: {
        reportedByWallet: input.reportedByWallet,
        electionId: input.electionId,
        constituencyId: input.constituencyId ?? null,
        category,
        detail,
        status: "OPEN"
      }
    });

    return {
      anomalyId: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString()
    };
  },

  async list(input: ListAnomalyInput): Promise<ObserverAnomalyListResult> {
    const page = normalizePageOptions(input);

    const whereBase: {
      electionId?: string;
      OR?: Array<{
        createdAt: { lt: Date };
      } | {
        createdAt: Date;
        id: { lt: string };
      }>;
    } = {};

    if (input.electionId) {
      whereBase.electionId = input.electionId;
    }

    if (page.cursor) {
      const parsed = decodeCursor(page.cursor);
      const cursorDate = new Date(parsed.createdAt);
      whereBase.OR = [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: parsed.id } }
      ];
    }

    const rows = await prisma.observerAnomaly.findMany({
      where: whereBase,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: page.limit + 1,
      skip: page.cursor ? 0 : page.offset
    });

    const hasNext = rows.length > page.limit;
    const pageRows = hasNext ? rows.slice(0, page.limit) : rows;

    const nextCursor = hasNext
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1]!.createdAt.toISOString(),
          id: pageRows[pageRows.length - 1]!.id,
          issuedAt: Date.now()
        })
      : null;

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const row of pageRows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    }

    const latestSync = pageRows.length > 0 ? pageRows[0]!.updatedAt : null;

    return {
      items: pageRows.map((row) => ({
        anomalyId: row.id,
        electionId: row.electionId,
        constituencyId: row.constituencyId,
        category: row.category,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        trendBucket15m: toTrendBucket(row.createdAt)
      })),
      aggregates: {
        total: pageRows.length,
        byStatus,
        byCategory
      },
      pagination: buildPaginationEnvelope({
        nextCursor,
        limit: page.limit,
        offset: page.cursor ? page.offset : page.offset + pageRows.length
      }),
      freshness: deriveFreshnessMeta(latestSync)
    };
  }
};
