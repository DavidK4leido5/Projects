import { eq } from "drizzle-orm";
import {
  accounts,
  attachments,
  budgets,
  categories,
  goalContributions,
  goals,
  notifications,
  recurringRules,
  reports,
  tags,
  transactionTags,
  transactions,
  userSettings,
} from "@repo/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

/** Full account export. This is the user's data, so no caching and no logs. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const userId = user.id;

  const [
    settings,
    accountRows,
    categoryRows,
    transactionRows,
    tagRows,
    transactionTagRows,
    recurringRows,
    budgetRows,
    goalRows,
    contributionRows,
    reportRows,
    notificationRows,
    attachmentRows,
  ] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(transactions).where(eq(transactions.userId, userId)),
    db.select().from(tags).where(eq(tags.userId, userId)),
    db
      .select({
        transactionId: transactionTags.transactionId,
        tagId: transactionTags.tagId,
      })
      .from(transactionTags)
      .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
      .where(eq(transactions.userId, userId)),
    db.select().from(recurringRules).where(eq(recurringRules.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(goalContributions).where(eq(goalContributions.userId, userId)),
    db.select().from(reports).where(eq(reports.userId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(attachments).where(eq(attachments.userId, userId)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email },
    settings: settings[0] ?? null,
    accounts: accountRows,
    categories: categoryRows,
    transactions: transactionRows,
    tags: tagRows,
    transactionTags: transactionTagRows,
    recurringRules: recurringRows,
    budgets: budgetRows,
    goals: goalRows,
    goalContributions: contributionRows,
    reports: reportRows,
    notifications: notificationRows,
    attachments: attachmentRows.filter((row) => !row.storageKey.startsWith("share:")),
  };

  const fileName = "spendwise-export-" + new Date().toISOString().slice(0, 10) + ".json";

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="' + fileName + '"',
      "Cache-Control": "no-store",
    },
  });
}
