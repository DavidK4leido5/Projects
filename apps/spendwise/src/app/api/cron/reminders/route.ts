import { NextResponse } from "next/server";
import { syncAllReminders } from "@/features/notifications/sync";

export const maxDuration = 60;

/**
 * Vercel Cron entry point. Vercel sends the CRON_SECRET as a bearer token when
 * the variable is present. The route stays closed to anonymous traffic.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await syncAllReminders();
  return NextResponse.json({ ok: true, ...result });
}
