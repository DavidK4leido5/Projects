"use client";

import {
  ArrowLeftRight,
  ChevronDown,
  MoreHorizontal,
  Receipt,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  AmountText,
  Badge,
  Button,
  FilterBar,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { formatDate } from "@repo/finance";
import {
  DEMO_CURRENCY,
  DEMO_LOCALE,
  type MockTransaction,
  recentTransactions,
} from "@/features/landing/mock-data";

const EXTRA_TRANSACTIONS: MockTransaction[] = [
  {
    id: "t7",
    date: "2026-10-11",
    payee: "Fitness First",
    category: "Other",
    account: "BPI Credit Card",
    type: "expense",
    amount: 1_499_00,
  },
  {
    id: "t8",
    date: "2026-10-08",
    payee: "Spotify",
    category: "Streaming",
    account: "BPI Credit Card",
    type: "expense",
    amount: 149_00,
  },
  {
    id: "t9",
    date: "2026-10-02",
    payee: "Converge ICT",
    category: "Internet",
    account: "BPI Credit Card",
    type: "expense",
    amount: 1_699_00,
  },
  {
    id: "t10",
    date: "2026-10-01",
    payee: "Rent · Makati apartment",
    category: "Rent",
    account: "BPI Savings",
    type: "expense",
    amount: 25_000_00,
  },
];

const rows = [...recentTransactions, ...EXTRA_TRANSACTIONS].sort((a, b) =>
  b.date.localeCompare(a.date),
);

function TypeIcon({ type }: { type: MockTransaction["type"] }) {
  if (type === "income") return <TrendingUp className="size-3.5" aria-hidden="true" />;
  if (type === "transfer") return <ArrowLeftRight className="size-3.5" aria-hidden="true" />;
  return <Receipt className="size-3.5" aria-hidden="true" />;
}

export function TourTransactions() {
  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Transactions</h2>
          <p className="text-xs text-muted-foreground">October 2026 · {rows.length} entries</p>
        </div>
        <Button type="button" variant="outline" size="sm">
          Export CSV
        </Button>
      </div>

      <FilterBar actions={<span className="text-[11px] text-muted-foreground">Demo data</span>}>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            readOnly
            aria-label="Search transactions"
            placeholder="Search payee or note"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button type="button" variant="outline" size="sm" aria-haspopup="listbox">
          All types
          <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="sm" aria-haspopup="listbox">
          All accounts
          <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </FilterBar>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden lg:table-cell">Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-10 pr-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(row.date, DEMO_LOCALE, "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <TypeIcon type={row.type} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.payee}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.type === "transfer" && row.transferAccount
                          ? row.account + " to " + row.transferAccount
                          : row.account}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {row.category ? (
                    <Badge variant="outline" className="max-w-[9rem] truncate">
                      {row.category}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Transfer</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                  {row.account}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <AmountText
                    amount={row.amount}
                    currency={DEMO_CURRENCY}
                    locale={DEMO_LOCALE}
                    type={row.type}
                    signed={row.type !== "transfer"}
                    className="text-sm font-medium"
                  />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={"Actions for " + row.payee}
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 p-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <TypeIcon type={row.type} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.payee}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatDate(row.date, DEMO_LOCALE, "MMM d")} · {row.account}
                </p>
                <div className="mt-1">
                  {row.category ? (
                    <Badge variant="outline" className="max-w-[9rem] truncate text-[10px]">
                      {row.category}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Transfer</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <AmountText
                amount={row.amount}
                currency={DEMO_CURRENCY}
                locale={DEMO_LOCALE}
                type={row.type}
                signed={row.type !== "transfer"}
                className="text-sm font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={"Actions for " + row.payee}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-muted-foreground">
        Showing {rows.length} of {rows.length} transactions
      </p>
    </div>
  );
}
