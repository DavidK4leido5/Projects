"use client";

import type { ReactNode } from "react";
import {
  AmountText,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { formatMoney } from "@repo/finance";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { DEMO_CURRENCY, DEMO_LOCALE, cashFlow, summary } from "@/features/landing/mock-data";

function Figure({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-3">
      <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold sm:text-lg">{children}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TourCashFlow() {
  const totals = cashFlow.reduce(
    (acc, point) => ({ income: acc.income + point.income, expense: acc.expense + point.expense }),
    { income: 0, expense: 0 },
  );
  const net = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? Math.round((net / totals.income) * 1000) / 10 : 0;
  const firstMonth = cashFlow[0];
  const lastMonth = cashFlow[cashFlow.length - 1];

  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Cash flow</h2>
          <p className="truncate text-xs text-muted-foreground">
            {firstMonth ? firstMonth.label : ""} – {lastMonth ? lastMonth.label : ""} 2026
          </p>
        </div>
        <Badge variant="secondary">6 months</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Figure label="Income" hint="Six-month total">
          <AmountText amount={totals.income} currency={DEMO_CURRENCY} locale={DEMO_LOCALE} />
        </Figure>
        <Figure label="Expenses" hint="Six-month total">
          <AmountText amount={totals.expense} currency={DEMO_CURRENCY} locale={DEMO_LOCALE} />
        </Figure>
        <Figure label="Net" hint="Income minus expenses">
          <AmountText
            amount={net}
            currency={DEMO_CURRENCY}
            locale={DEMO_LOCALE}
            className="text-positive"
          />
        </Figure>
        <Figure label="Savings rate" hint={"Oct: " + summary.savingsRate + "%"}>
          <span className="tabular-nums">{savingsRate}%</span>
        </Figure>
      </div>

      <Card className="min-w-0">
        <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
          <CardTitle className="text-sm">Income and expenses</CardTitle>
          <p className="text-xs text-muted-foreground">Transfers are excluded from both sides</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <CashFlowChart data={cashFlow} currency={DEMO_CURRENCY} locale={DEMO_LOCALE} />
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-3">Month</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Net</TableHead>
              <TableHead className="hidden pr-3 text-right md:table-cell">Saved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlow.map((point) => {
              const monthRate =
                point.income > 0 ? Math.round((point.net / point.income) * 1000) / 10 : 0;
              return (
                <TableRow key={point.key}>
                  <TableCell className="pl-3 text-xs font-medium whitespace-nowrap">
                    {point.label}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <AmountText
                      amount={point.income}
                      currency={DEMO_CURRENCY}
                      locale={DEMO_LOCALE}
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <AmountText
                      amount={point.expense}
                      currency={DEMO_CURRENCY}
                      locale={DEMO_LOCALE}
                      className="text-xs text-muted-foreground"
                    />
                  </TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap sm:table-cell">
                    <AmountText
                      amount={point.net}
                      currency={DEMO_CURRENCY}
                      locale={DEMO_LOCALE}
                      signed
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell className="hidden pr-3 text-right text-xs tabular-nums text-muted-foreground md:table-cell">
                    {monthRate}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="pl-3 text-xs">Total</TableCell>
              <TableCell className="text-right text-xs whitespace-nowrap">
                {formatMoney(totals.income, DEMO_CURRENCY, DEMO_LOCALE)}
              </TableCell>
              <TableCell className="text-right text-xs whitespace-nowrap">
                {formatMoney(totals.expense, DEMO_CURRENCY, DEMO_LOCALE)}
              </TableCell>
              <TableCell className="hidden text-right text-xs whitespace-nowrap sm:table-cell">
                {formatMoney(net, DEMO_CURRENCY, DEMO_LOCALE)}
              </TableCell>
              <TableCell className="hidden pr-3 text-right text-xs tabular-nums md:table-cell">
                {savingsRate}%
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
