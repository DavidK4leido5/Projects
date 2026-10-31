"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { settingsSchema } from "@repo/finance";
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
  transactions,
  userSettings,
} from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { getAuthUser, requireUserId, UnauthorizedError } from "@/lib/auth/session";
import {
  CLOUDINARY_FOLDER,
  MAX_LOGO_BYTES,
  LOGO_TYPES,
  getCloudinaryConfig,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import { getDb, getDbPool } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { deleteObject } from "@/lib/storage";

export async function updateSettings(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const values = settingsSchema.parse(input);

    await getDb()
      .update(userSettings)
      .set({
        currency: values.currency.toUpperCase(),
        locale: values.locale,
        dateFormat: values.dateFormat,
        firstDayOfWeek: values.firstDayOfWeek,
        financialMonthStart: values.financialMonthStart,
        theme: values.theme,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadReportLogo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await requireUserId();
    const config = getCloudinaryConfig();
    if (!config) throw new Error("Cloudinary is not configured on this environment.");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload.");
    if (file.size === 0) throw new Error("That file is empty.");
    if (file.size > MAX_LOGO_BYTES) throw new Error("Logos must be 2 MB or smaller.");
    if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) {
      throw new Error("Use a PNG, JPEG, or WebP image.");
    }

    const publicId = CLOUDINARY_FOLDER + "/logos/" + userId + "-" + Date.now();
    const uploaded = await uploadToCloudinary(
      publicId,
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    if (!uploaded) throw new Error("Cloudinary did not return an image id.");

    const url =
      "https://res.cloudinary.com/" + config.cloudName + "/image/upload/f_auto,q_auto/" + uploaded;

    await getDb()
      .update(userSettings)
      .set({ reportLogoUrl: url, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));

    revalidatePath("/settings");
    revalidatePath("/reports");
    return { ok: true, data: { url } };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeReportLogo(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(userSettings)
      .set({ reportLogoUrl: null, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
    revalidatePath("/settings");
    revalidatePath("/reports");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
/**
 * Removes the account. Managed Auth is asked to delete the identity first; when
 * the provider has self-service deletion disabled, the password is verified and
 * the Dalorro data is purged, leaving only the sign-in identity for support.
 */
export async function deleteAccount(
  password: string,
): Promise<ActionResult<{ deleted: boolean; identityDeleted: boolean; message?: string }>> {
  try {
    const user = await getAuthUser();
    if (!user) throw new UnauthorizedError();

    const limited = rateLimit("delete-account:" + user.id, 5, 60_000);
    if (!limited.ok) throw new Error("Too many attempts. Try again shortly.");

    const base = env.NEON_AUTH_BASE_URL.replace(/\/$/, "");
    const origin = new URL(base).origin;
    const requestHeaders = await headers();

    const response = await fetch(base + "/delete-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        cookie: requestHeaders.get("cookie") ?? "",
      },
      body: JSON.stringify({ password, callbackURL: "/login" }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };

    if (response.ok && /verif/i.test(payload.message ?? "")) {
      return {
        ok: true,
        data: {
          deleted: false,
          identityDeleted: false,
          message: payload.message ?? "Check your email to confirm deletion.",
        },
      };
    }

    const identityDeleted = response.ok;

    if (!identityDeleted) {
      const verify = await fetch(base + "/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email: user.email, password }),
      });
      if (!verify.ok) {
        return { ok: false, error: "That password is not correct." };
      }
    }

    const db = getDb();
    const receiptRows = await db
      .select({ key: attachments.storageKey })
      .from(attachments)
      .where(eq(attachments.userId, user.id));

    for (const row of receiptRows) {
      try {
        await deleteObject(row.key);
      } catch {
        // A missing object must not block account deletion.
      }
    }

    await getDbPool().transaction(async (tx) => {
      await tx.delete(attachments).where(eq(attachments.userId, user.id));
      await tx.delete(goalContributions).where(eq(goalContributions.userId, user.id));
      await tx.delete(goals).where(eq(goals.userId, user.id));
      await tx.delete(budgets).where(eq(budgets.userId, user.id));
      await tx.delete(notifications).where(eq(notifications.userId, user.id));
      await tx.delete(reports).where(eq(reports.userId, user.id));
      await tx.delete(transactions).where(eq(transactions.userId, user.id));
      await tx.delete(recurringRules).where(eq(recurringRules.userId, user.id));
      await tx.delete(tags).where(eq(tags.userId, user.id));
      await tx.delete(categories).where(eq(categories.userId, user.id));
      await tx.delete(accounts).where(eq(accounts.userId, user.id));
      await tx.delete(userSettings).where(eq(userSettings.userId, user.id));
    });

    return { ok: true, data: { deleted: true, identityDeleted } };
  } catch (error) {
    return actionError(error);
  }
}
