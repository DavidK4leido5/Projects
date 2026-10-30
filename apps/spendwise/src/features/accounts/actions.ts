"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { accountInputSchema } from "@repo/finance";
import { accounts } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

type AccountInput = {
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit_card" | "savings" | "investment";
  startingBalance: number;
  currency: string;
  color?: string;
  icon?: string;
  archived?: boolean;
};

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = accountInputSchema.parse(input);

    const [row] = await getDb()
      .insert(accounts)
      .values({
        userId,
        name: values.name,
        type: values.type,
        startingBalance: values.startingBalance,
        currency: values.currency.toUpperCase(),
        color: values.color ?? "slate",
        icon: values.icon ?? "wallet",
      })
      .returning({ id: accounts.id });

    if (!row) throw new Error("The account could not be created.");

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateAccount(input: AccountInput & { id: string }): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const values = accountInputSchema.extend({ id: z.uuid("account") }).parse(input);

    const [row] = await getDb()
      .update(accounts)
      .set({
        name: values.name,
        type: values.type,
        startingBalance: values.startingBalance,
        currency: values.currency.toUpperCase(),
        color: values.color,
        icon: values.icon,
        updatedAt: new Date(),
      })
      .where(
        and(eq(accounts.id, values.id), eq(accounts.userId, userId), isNull(accounts.deletedAt)),
      )
      .returning({ id: accounts.id });

    if (!row) throw new Error("That account is not available.");

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(accounts)
      .set({ archived, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)));

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
