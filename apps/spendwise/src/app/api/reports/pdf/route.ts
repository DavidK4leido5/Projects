import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/session";
import { buildReportDocument } from "@/lib/pdf/document";
import { rateLimit } from "@/lib/rate-limit";
import { fetchReportData, recordReport, reportRequestInput } from "@/lib/report-data";
import { reportFileName } from "@/features/reports/report-meta";

/** Generates the branded PDF for one report request. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit("report:" + user.id, 10, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many reports. Try again in " + limited.retryAfter + " seconds." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON report request." }, { status: 400 });
  }

  const parsed = reportRequestInput.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Check the report settings." },
      { status: 400 },
    );
  }

  try {
    const data = await fetchReportData(user.id, parsed.data, user.name);
    const buffer = await renderToBuffer(buildReportDocument(data));

    // Best-effort history: a failed insert must not cost the user the PDF.
    await recordReport(user.id, parsed.data, data.title).catch(() => undefined);

    const filename = reportFileName(
      parsed.data.type,
      parsed.data.dateFrom,
      parsed.data.dateTo,
      "pdf",
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Could not generate the report. Try again." }, { status: 500 });
  }
}
