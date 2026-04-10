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

interface ListInboxInput {
  wallet: string;
  limit?: number | undefined;
  offset?: number | undefined;
  cursor?: string | undefined;
  unreadOnly?: boolean | undefined;
}

interface InboxListResult {
  items: Array<{
    notificationId: string;
    category: string;
    priority: string;
    payload: unknown;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
  }>;
  pagination: PaginationEnvelope;
  freshness: {
    lastSyncedAt: string | null;
    nextPollAfterSec: number;
    freshnessState: "fresh" | "stale" | "degraded";
  };
}

export const inboxService = {
  async list(input: ListInboxInput): Promise<InboxListResult> {
    const page = normalizePageOptions(input);

    const whereClause: {
      wallet: string;
      isRead?: boolean;
      OR?: Array<
        | {
            createdAt: { lt: Date };
          }
        | {
            createdAt: Date;
            id: { lt: string };
          }
      >;
    } = {
      wallet: input.wallet
    };

    if (input.unreadOnly) {
      whereClause.isRead = false;
    }

    if (page.cursor) {
      const parsed = decodeCursor(page.cursor);
      const cursorDate = new Date(parsed.createdAt);
      whereClause.OR = [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: parsed.id } }
      ];
    }

    const rows = await prisma.notification.findMany({
      where: whereClause,
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

    const latest = pageRows.length > 0 ? pageRows[0]!.createdAt : null;

    return {
      items: pageRows.map((row) => ({
        notificationId: row.id,
        category: row.category,
        priority: row.priority,
        payload: row.payload,
        isRead: row.isRead,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null
      })),
      pagination: buildPaginationEnvelope({
        nextCursor,
        limit: page.limit,
        offset: page.cursor ? page.offset : page.offset + pageRows.length
      }),
      freshness: deriveFreshnessMeta(latest)
    };
  },

  async markRead(input: { wallet: string; notificationId: string }): Promise<{
    notificationId: string;
    isRead: boolean;
    readAt: string;
  }> {
    const item = await prisma.notification.findUnique({
      where: {
        id: input.notificationId
      }
    });

    if (!item) {
      throw appError.notFound("Notification not found");
    }

    if (item.wallet.toLowerCase() !== input.wallet.toLowerCase()) {
      throw appError.forbidden("Cannot modify another wallet's notification");
    }

    const readAt = new Date();

    const updated = await prisma.notification.update({
      where: {
        id: input.notificationId
      },
      data: {
        isRead: true,
        readAt
      }
    });

    return {
      notificationId: updated.id,
      isRead: updated.isRead,
      readAt: readAt.toISOString()
    };
  }
};
