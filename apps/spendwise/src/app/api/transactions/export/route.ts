import { getCurrentUser } from "@/lib/auth/session";
import { listTransactionsForExport, type TransactionSort } from "@/features/transactions/queries";
import type { TransactionFilterFields } from "@/features/transactions/queries";
import type { TransactionType } from "@repo/db/schema";
import { toDateInput } from "@repo/finance";
import { csvEscape } from "@/features/transactions/csv";
import { PAYMENT_METHODS } from "@/lib/defaults";

// Route handlers are dynamic by default; cacheComponents forbids the segment config.

const SORTS: TransactionSort[] = ["date_desc", "date_asc", "amount_desc", "amount_asc"];
const HEADERS = [
  "Date",
  "Type",
  "Payee",
  "Amount",
  "Currency",
  "Account",
  "Category",
  "Notes",
  "Payment Method",
  "Tags",
];

function first(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

function majorUnits(minor: number): string {
  const absolute = Math.abs(Math.trunc(minor));
  return Math.floor(absolute / 100) + "." + String(absolute % 100).padStart(2, "0");
}

function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
}

/** Same filters as the transactions page. Never cached. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const typeParam = first(params, "type");
  const type: TransactionType | undefined =
    typeParam === "income" || typeParam === "expense" || typeParam === "transfer"
      ? typeParam
      : undefined;
  const sortParam = first(params, "sort");
  const sort: TransactionSort = SORTS.includes(sortParam as TransactionSort)
    ? (sortParam as TransactionSort)
    : "date_desc";

  const filters: TransactionFilterFields = {
    search: first(params, "q") || undefined,
    type,
    accountId: first(params, "account") || undefined,
    categoryId: first(params, "category") || undefined,
    from: first(params, "from") || undefined,
    to: first(params, "to") || undefined,
    sort,
  };

  try {
    const rows = await listTransactionsForExport(user.id, filters);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(HEADERS.join(",") + "\r\n"));
        let buffer = "";

        for (const row of rows) {
          const cells = [
            toDateInput(row.date),
            row.type,
            row.payee,
            majorUnits(row.amount),
            row.currency,
            row.accountName,
            row.categoryName ?? "",
            row.notes ?? "",
            paymentLabel(row.paymentMethod),
            row.tags,
          ].map((cell) => csvEscape(cell));
          buffer += cells.join(",") + "\r\n";

          if (buffer.length >= 32_000) {
            controller.enqueue(encoder.encode(buffer));
            buffer = "";
          }
        }

        if (buffer.length > 0) controller.enqueue(encoder.encode(buffer));
        controller.close();
      },
    });

    const fileName = "transactions-" + new Date().toISOString().slice(0, 10) + ".csv";
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + fileName + '"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Transaction export failed", error);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
