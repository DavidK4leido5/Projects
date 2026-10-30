import "server-only";

import { desc, eq } from "drizzle-orm";
import { reports } from "@repo/db/schema";
import { getDb } from "@/lib/db";

/** Most recent reports first. Scoped to the signed-in user. */
export async function listReportHistory(userId: string, limit = 20) {
  return getDb()
    .select({
      id: reports.id,
      type: reports.type,
      title: reports.title,
      dateFrom: reports.dateFrom,
      dateTo: reports.dateTo,
      options: reports.options,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}
