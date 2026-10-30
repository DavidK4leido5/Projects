import { formatDate, moneyToInput } from "@repo/finance";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { fetchReportData, reportRequestInput } from "@/lib/report-data";
import { REPORT_TYPE_META, reportFileName } from "@/features/reports/report-meta";

function cell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function line(values: (string | number)[]): string {
  return values.map(cell).join(",");
}

/** Same filtered data as the PDF, flattened into spreadsheet-friendly rows. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit("report-csv:" + user.id, 10, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many exports. Try again in " + limited.retryAfter + " seconds." },
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
    const currency = data.settings.currency;
    const locale = data.settings.locale;
    const rows: string[] = [];

    rows.push(line(["SpendWise report"]));
    rows.push(line(["Title", data.title]));
    rows.push(line(["Type", REPORT_TYPE_META[data.type].label]));
    rows.push(line(["Period", data.range.label]));
    rows.push(line(["Generated", formatDate(data.generatedAt, locale, "MMM d, yyyy HH:mm")]));
    rows.push(line(["Prepared for", data.userName || "SpendWise user"]));
    rows.push(line(["Currency", currency]));
    rows.push("");

    rows.push(line(["Summary"]));
    rows.push(line(["Metric", "Amount (" + currency + ")"]));
    rows.push(line(["Income", moneyToInput(data.summary.income)]));
    rows.push(line(["Expenses", moneyToInput(data.summary.expense)]));
    rows.push(line(["Net", moneyToInput(data.summary.net)]));
    rows.push(line(["Savings rate (%)", data.summary.savingsRate]));
    rows.push(line(["Transactions counted", data.summary.count]));
    rows.push(line(["Previous income", moneyToInput(data.previousSummary.income)]));
    rows.push(line(["Previous expenses", moneyToInput(data.previousSummary.expense)]));
    rows.push(line(["Previous net", moneyToInput(data.previousSummary.net)]));
    rows.push("");

    rows.push(line(["Monthly cash flow"]));
    rows.push(line(["Month", "Income", "Expenses", "Net"]));
    for (const month of data.months) {
      rows.push(
        line([
          month.label,
          moneyToInput(month.income),
          moneyToInput(month.expense),
          moneyToInput(month.net),
        ]),
      );
    }
    rows.push("");

    rows.push(line(["Spending by category"]));
    rows.push(line(["Category", "Amount (" + currency + ")", "Share (%)", "Transactions"]));
    for (const category of data.categories) {
      rows.push(
        line([category.name, moneyToInput(category.amount), category.share, category.count]),
      );
    }
    rows.push("");

    rows.push(line(["Budgets"]));
    rows.push(line(["Month", "Category", "Budget", "Spent", "Remaining", "Used (%)", "Status"]));
    for (const budget of data.budgets) {
      rows.push(
        line([
          budget.monthLabel,
          budget.categoryName,
          moneyToInput(budget.budget),
          moneyToInput(budget.spent),
          moneyToInput(budget.remaining),
          budget.percent,
          budget.state,
        ]),
      );
    }
    rows.push("");

    if (parsed.data.includeTransactions) {
      rows.push(line(["Transactions"]));
      rows.push(
        line([
          "Date",
          "Payee",
          "Type",
          "Category",
          "Account",
          "Amount (" + currency + ")",
          "Notes",
        ]),
      );
      for (const txn of data.transactions) {
        rows.push(
          line([
            formatDate(txn.date, locale, "yyyy-MM-dd"),
            txn.payee,
            txn.type,
            txn.categoryName ?? "",
            txn.accountName,
            moneyToInput(txn.amount),
            txn.notes ?? "",
          ]),
        );
      }
      if (data.truncated) {
        rows.push(
          line(["Note", "Showing the first 2,000 of " + data.transactionCount + " transactions"]),
        );
      }
    }

    const filename = reportFileName(
      parsed.data.type,
      parsed.data.dateFrom,
      parsed.data.dateTo,
      "csv",
    );

    return new Response("\uFEFF" + rows.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Could not export the report. Try again." }, { status: 500 });
  }
}
