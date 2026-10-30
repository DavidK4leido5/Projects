import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { accounts, goalContributions, goals } from "@repo/db/schema";
import { goalProjection } from "@repo/finance";
import { getDb } from "@/lib/db";

export type GoalStatus = "active" | "completed" | "archived";

export type ContributionRow = {
  id: string;
  goalId: string;
  amount: number;
  date: Date;
  note: string | null;
  accountId: string | null;
  accountName: string | null;
};

export type GoalRow = {
  id: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate: string | null;
  note: string | null;
  color: string;
  status: GoalStatus;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  contributed: number;
  percent: number;
  monthlyPace: number;
  projectedDate: Date | null;
  recentContributions: ContributionRow[];
};

const STATUS_RANK: Record<GoalStatus, number> = { active: 0, completed: 1, archived: 2 };

function groupContributions(rows: ContributionRow[]): Map<string, ContributionRow[]> {
  const grouped = new Map<string, ContributionRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.goalId) ?? [];
    list.push(row);
    grouped.set(row.goalId, list);
  }
  return grouped;
}

export async function listGoals(userId: string): Promise<GoalRow[]> {
  const db = getDb();
  const [goalRows, contributionRows] = await Promise.all([
    db
      .select({
        id: goals.id,
        name: goals.name,
        targetAmount: goals.targetAmount,
        currency: goals.currency,
        targetDate: goals.targetDate,
        note: goals.note,
        color: goals.color,
        status: goals.status,
        linkedAccountId: goals.linkedAccountId,
        linkedAccountName: accounts.name,
      })
      .from(goals)
      .leftJoin(
        accounts,
        and(
          eq(goals.linkedAccountId, accounts.id),
          eq(accounts.userId, userId),
          isNull(accounts.deletedAt),
        ),
      )
      .where(and(eq(goals.userId, userId), isNull(goals.deletedAt))),
    db
      .select({
        id: goalContributions.id,
        goalId: goalContributions.goalId,
        amount: goalContributions.amount,
        date: goalContributions.date,
        note: goalContributions.note,
        accountId: goalContributions.accountId,
        accountName: accounts.name,
      })
      .from(goalContributions)
      .leftJoin(
        accounts,
        and(
          eq(goalContributions.accountId, accounts.id),
          eq(accounts.userId, userId),
          isNull(accounts.deletedAt),
        ),
      )
      .where(eq(goalContributions.userId, userId))
      .orderBy(desc(goalContributions.date), desc(goalContributions.createdAt)),
  ]);

  const grouped = groupContributions(contributionRows);

  return goalRows
    .map((goal) => {
      const contributions = grouped.get(goal.id) ?? [];
      const projection = goalProjection(
        contributions.map((contribution) => ({
          date: contribution.date,
          amount: contribution.amount,
        })),
        goal.targetAmount,
      );

      return {
        ...goal,
        contributed: projection.contributed,
        percent: projection.percent,
        monthlyPace: projection.monthlyPace,
        projectedDate: projection.projectedDate,
        recentContributions: contributions.slice(0, 3),
      };
    })
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.targetDate ?? "9999-12-31").localeCompare(b.targetDate ?? "9999-12-31") ||
        a.name.localeCompare(b.name),
    );
}

export async function listGoalContributions(
  userId: string,
  goalId: string,
): Promise<ContributionRow[]> {
  return getDb()
    .select({
      id: goalContributions.id,
      goalId: goalContributions.goalId,
      amount: goalContributions.amount,
      date: goalContributions.date,
      note: goalContributions.note,
      accountId: goalContributions.accountId,
      accountName: accounts.name,
    })
    .from(goalContributions)
    .leftJoin(
      accounts,
      and(
        eq(goalContributions.accountId, accounts.id),
        eq(accounts.userId, userId),
        isNull(accounts.deletedAt),
      ),
    )
    .where(and(eq(goalContributions.userId, userId), eq(goalContributions.goalId, goalId)))
    .orderBy(desc(goalContributions.date), desc(goalContributions.createdAt))
    .limit(100);
}

export async function listGoalOptions(userId: string) {
  return getDb()
    .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.archived, false), isNull(accounts.deletedAt)),
    )
    .orderBy(asc(accounts.sortOrder), asc(accounts.name));
}
