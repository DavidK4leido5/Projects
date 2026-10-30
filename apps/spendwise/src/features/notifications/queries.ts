import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { notifications, type NotificationType } from "@repo/db/schema";
import { getDb } from "@/lib/db";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export async function listNotifications(
  userId: string,
  limit: number = 20,
): Promise<NotificationItem[]> {
  return getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

/** Everything the header bell needs, in one call. */
export async function getNotificationBellData(userId: string, limit: number = 5) {
  const [unread, recent] = await Promise.all([
    unreadCount(userId),
    listNotifications(userId, limit),
  ]);
  return { unread, recent };
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return Number(row?.value ?? 0);
}
