import Link from "next/link";
import { Button, Input } from "@repo/ui";

type Option = { id: string; name: string };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TransactionFiltersForm({
  accounts,
  categories,
  values,
}: {
  accounts: Option[];
  categories: Option[];
  values: {
    q: string;
    type: string;
    account: string;
    category: string;
    from: string;
    to: string;
    sort: string;
  };
}) {
  const active =
    Number(Boolean(values.q)) +
    Number(Boolean(values.type)) +
    Number(Boolean(values.account)) +
    Number(Boolean(values.category)) +
    Number(Boolean(values.from)) +
    Number(Boolean(values.to));

  return (
    <form method="get" className="rounded-lg border border-border bg-card p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="sr-only">
            Search transactions
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={values.q}
            placeholder="Search payee or notes"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="type" className="sr-only">
            Type
          </label>
          <select id="type" name="type" defaultValue={values.type} className={selectClass}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div>
          <label htmlFor="account" className="sr-only">
            Account
          </label>
          <select id="account" name="account" defaultValue={values.account} className={selectClass}>
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={values.category}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="from" className="sr-only">
            From date
          </label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={values.from}
            aria-label="From date"
          />
        </div>

        <div>
          <label htmlFor="to" className="sr-only">
            To date
          </label>
          <Input id="to" name="to" type="date" defaultValue={values.to} aria-label="To date" />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          name="sort"
          defaultValue={values.sort}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Sort"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Largest amount</option>
          <option value="amount_asc">Smallest amount</option>
        </select>
        <Button type="submit" variant="outline" size="sm">
          Apply filters
        </Button>
        {active > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">
              Clear {active} filter{active === 1 ? "" : "s"}
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
