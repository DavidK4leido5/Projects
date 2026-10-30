"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { notifications } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function markRead(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Notifications have no soft-delete column; the inbox row is the whole record. */
export async function deleteNotification(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
