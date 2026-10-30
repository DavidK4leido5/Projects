import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { categories, userSettings, accounts, type UserSettings } from "@repo/db/schema";
import { getDb, getDbPool } from "@/lib/db";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "@/lib/defaults";

/**
 * First authenticated load creates the profile row, the starter categories,
 * and three empty accounts. Idempotent, so a retry after a failed request is
 * harmless.
 */
export const ensureUserSetup = cache(async (userId: string): Promise<UserSettings> => {
  const db = getDb();
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const settings = existing[0];
  if (settings) return settings;

  await getDbPool().transaction(async (tx) => {
    await tx.insert(userSettings).values({ userId }).onConflictDoNothing();

    const categoryRows = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1);

    if (categoryRows.length === 0) {
      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((category, index) => ({
          userId,
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          sortOrder: index,
        })),
      );
    }

    const accountRows = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId)))
      .limit(1);

    if (accountRows.length === 0) {
      await tx.insert(accounts).values(
        DEFAULT_ACCOUNTS.map((account, index) => ({
          userId,
          name: account.name,
          type: account.type,
          color: account.color,
          icon: account.icon,
          startingBalance: account.startingBalance,
          sortOrder: index,
        })),
      );
    }
  });

  const created = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const row = created[0];
  if (!row) throw new Error("Could not create settings for this user.");
  return row;
});

export const getSettings = cache(async (userId: string) => ensureUserSetup(userId));
