import type { Metadata } from "next";
import { ArrowLeftRight, Download, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { Button, PageHeader } from "@repo/ui";
import { TransactionFiltersForm } from "@/features/transactions/transaction-filters";
import { TransactionsTable } from "@/features/transactions/transactions-table";
import {
  listTransactionOptions,
  listTransactions,
  type TransactionSort,
} from "@/features/transactions/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Transactions" };

const SORTS: TransactionSort[] = ["date_desc", "date_asc", "amount_desc", "amount_asc"];

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const q = first(params.q).slice(0, 100);
  const typeParam = first(params.type);
  const type =
    typeParam === "income" || typeParam === "expense" || typeParam === "transfer"
      ? typeParam
      : undefined;
  const account = first(params.account);
  const category = first(params.category);
  const from = first(params.from);
  const to = first(params.to);
  const sortParam = first(params.sort);
  const sort: TransactionSort = SORTS.includes(sortParam as TransactionSort)
    ? (sortParam as TransactionSort)
    : "date_desc";
  const page = Math.max(1, Number.parseInt(first(params.page) || "1", 10) || 1);

  const [result, options, settings] = await Promise.all([
    listTransactions(user.id, {
      search: q || undefined,
      type,
      accountId: account || undefined,
      categoryId: category || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: 20,
      sort,
    }),
    listTransactionOptions(user.id),
    getSettings(user.id),
  ]);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (type) baseParams.set("type", type);
  if (account) baseParams.set("account", account);
  if (category) baseParams.set("category", category);
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
  if (sort !== "date_desc") baseParams.set("sort", sort);

  function hrefForPage(target: number): string {
    const next = new URLSearchParams(baseParams);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? "/transactions?" + query : "/transactions";
  }

  const start = result.total === 0 ? 0 : (result.page - 1) * 20 + 1;
  const end = Math.min(result.total, result.page * 20);
  const filterQuery = baseParams.toString();
  const exportHref = "/api/transactions/export" + (filterQuery ? "?" + filterQuery : "");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transactions"
        description={
          result.total === 0
            ? "Every peso in and out, in one place."
            : result.total + (result.total === 1 ? " transaction" : " transactions")
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/transactions/import">
                <Upload className="size-4" aria-hidden />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={exportHref}>
                <Download className="size-4" aria-hidden />
                Export CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/transactions?new=1">
                <Plus className="size-4" aria-hidden />
                Add transaction
              </Link>
            </Button>
          </>
        }
      />

      <TransactionFiltersForm
        accounts={options.accounts}
        categories={options.categories}
        values={{ q, type: type ?? "", account, category, from, to, sort }}
      />

      <TransactionsTable
        rows={result.rows}
        locale={settings.locale}
        currency={settings.currency}
        accounts={options.accounts}
        categories={options.categories}
        tags={options.tags}
        emptyAction
      />

      {result.total > 0 ? (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {start}–{end} of {result.total}
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefForPage(result.page - 1)} rel="prev">
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefForPage(result.page + 1)} rel="next">
                  Next
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </nav>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeftRight className="size-4" aria-hidden />
          Nothing here yet. Press{" "}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">n</kbd> anywhere to
          add one.
        </p>
      )}
    </div>
  );
}
