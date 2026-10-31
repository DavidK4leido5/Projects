"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress } from "@repo/ui";
import { budgetProgress, formatMoney } from "@repo/finance";
import { DEMO_CURRENCY, DEMO_LOCALE, budgets } from "@/features/landing/mock-data";

const STATE_META = {
  on_track: {
    label: "On track",
    tone: "text-positive",
    indicator: "[&_[data-slot=progress-indicator]]:bg-positive",
    icon: CheckCircle2,
  },
  near_limit: {
    label: "Close",
    tone: "text-warning",
    indicator: "[&_[data-slot=progress-indicator]]:bg-warning",
    icon: AlertTriangle,
  },
  exceeded: {
    label: "Over",
    tone: "text-negative",
    indicator: "[&_[data-slot=progress-indicator]]:bg-negative",
    icon: AlertOctagon,
  },
} as const;

export function TourBudgets() {
  const overallBudget = budgets[0];
  if (!overallBudget) return null;

  const overall = budgetProgress(overallBudget.spent, overallBudget.limit);
  const overallMeta = STATE_META[overall.state];
  const OverallIcon = overallMeta.icon;
  const categoryBudgets = budgets.filter((budget) => budget.id !== "overall");

  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Budgets</h2>
        <p className="text-xs text-muted-foreground">October 2026 · monthly limits</p>
      </div>

      <section
        aria-label="Overall budget"
        className="rounded-lg border border-border bg-card p-4 shadow-none"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Overall budget</p>
            <p className="text-xs text-muted-foreground">Every category, one limit</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(overall.spent, DEMO_CURRENCY, DEMO_LOCALE)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                of {formatMoney(overall.limit, DEMO_CURRENCY, DEMO_LOCALE)}
              </span>
            </p>
            <span
              className={
                "mt-1 inline-flex items-center gap-1 text-[11px] font-medium " + overallMeta.tone
              }
            >
              <OverallIcon className="size-3.5" aria-hidden="true" />
              {overallMeta.label} · {overall.percent}%
            </span>
          </div>
        </div>
        <Progress
          value={Math.min(overall.percent, 100)}
          className={"mt-3 h-2 " + overallMeta.indicator}
        />
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
          <span>{overall.percent}% used</span>
          <span>
            {overall.remaining >= 0
              ? "Remaining " + formatMoney(overall.remaining, DEMO_CURRENCY, DEMO_LOCALE)
              : "Over by " + formatMoney(Math.abs(overall.remaining), DEMO_CURRENCY, DEMO_LOCALE)}
          </span>
        </div>
      </section>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardTitle className="text-sm">Category budgets</CardTitle>
          <p className="text-xs text-muted-foreground">
            {categoryBudgets.length} categories · limits reset on the 1st
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {categoryBudgets.map((budget) => {
            const progress = budgetProgress(budget.spent, budget.limit);
            const meta = STATE_META[progress.state];
            const StateIcon = meta.icon;
            return (
              <div key={budget.id} className="flex flex-col gap-2 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{budget.name}</span>
                    <span
                      className={
                        "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium " +
                        meta.tone
                      }
                    >
                      <StateIcon className="size-3.5" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {progress.percent}%
                  </span>
                </div>
                <Progress
                  value={Math.min(progress.percent, 100)}
                  className={"h-1.5 " + meta.indicator}
                />
                <div className="flex justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
                  <span className="truncate">
                    {formatMoney(budget.spent, DEMO_CURRENCY, DEMO_LOCALE)} spent
                  </span>
                  <span className="shrink-0">
                    {formatMoney(budget.limit, DEMO_CURRENCY, DEMO_LOCALE)} limit
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Close means 80% or more of the limit is used. Over means the limit is already passed.
      </p>
    </div>
  );
}
