import { ArrowLeftRight, FileText, Receipt, TrendingUp } from "lucide-react";
import { AmountText, Progress, ProgressRing } from "@repo/ui";
import { Logo } from "@/components/logo";
import { budgetProgress, formatMoney } from "@repo/finance";
import {
  DEMO_CURRENCY,
  DEMO_LOCALE,
  accounts,
  bills,
  budgets,
  cashFlow,
  goals,
  insights,
  recentTransactions,
  summary,
  type MockTransaction,
} from "@/features/landing/mock-data";

function RowIcon({ type }: { type: MockTransaction["type"] }) {
  if (type === "income") return <TrendingUp className="size-3.5" aria-hidden="true" />;
  if (type === "transfer") return <ArrowLeftRight className="size-3.5" aria-hidden="true" />;
  return <Receipt className="size-3.5" aria-hidden="true" />;
}

export function TransactionsVisual() {
  const rows = recentTransactions.filter((row) => ["t1", "t3", "t5"].includes(row.id));

  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <RowIcon type={row.type} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{row.payee}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {row.category ?? "Transfer"}
              </p>
            </div>
          </div>
          <AmountText
            amount={row.amount}
            currency={DEMO_CURRENCY}
            locale={DEMO_LOCALE}
            type={row.type}
            signed={row.type !== "transfer"}
            className="shrink-0 text-xs font-medium"
          />
        </div>
      ))}
    </div>
  );
}

export function CashFlowVisual() {
  const months = cashFlow.slice(-4);
  const max = Math.max(1, ...months.map((month) => Math.max(month.income, month.expense)));
  const height = (value: number) => Math.max(8, Math.round((value / max) * 100)) + "%";

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Jul – Oct
        </p>
        <p className="text-[11px] font-medium text-positive">{summary.savingsRate}% saved</p>
      </div>
      <div className="flex h-20 items-end gap-3" aria-hidden="true">
        {months.map((month) => (
          <div key={month.key} className="flex h-full flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div className="w-3 rounded-sm bg-income" style={{ height: height(month.income) }} />
              <div
                className="w-3 rounded-sm bg-expense"
                style={{ height: height(month.expense) }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{month.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="size-2 rounded-sm bg-income" />
          Income
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="size-2 rounded-sm bg-expense" />
          Expenses
        </span>
      </div>
    </div>
  );
}

export function BudgetsVisual() {
  const rows = budgets.filter((budget) =>
    ["food", "entertainment", "shopping"].includes(budget.id),
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {rows.map((budget) => {
        const progress = budgetProgress(budget.spent, budget.limit);
        const tone =
          progress.state === "exceeded"
            ? "text-negative"
            : progress.state === "near_limit"
              ? "text-warning"
              : "text-positive";
        const indicator =
          progress.state === "exceeded"
            ? "[&_[data-slot=progress-indicator]]:bg-negative"
            : progress.state === "near_limit"
              ? "[&_[data-slot=progress-indicator]]:bg-warning"
              : "[&_[data-slot=progress-indicator]]:bg-positive";
        return (
          <div key={budget.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{budget.name}</span>
              <span className={"shrink-0 text-[10px] tabular-nums " + tone}>
                {progress.percent}%
              </span>
            </div>
            <Progress value={Math.min(progress.percent, 100)} className={"h-1.5 " + indicator} />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatMoney(budget.spent, DEMO_CURRENCY, DEMO_LOCALE)} of{" "}
              {formatMoney(budget.limit, DEMO_CURRENCY, DEMO_LOCALE)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function GoalsVisual() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {goals.map((goal) => {
        const percent = Math.min(100, Math.round((goal.contributed / goal.target) * 100));
        return (
          <div key={goal.id} className="flex items-center gap-2.5">
            <ProgressRing value={percent} size={36} strokeWidth={5} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{goal.name}</p>
              <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                {formatMoney(goal.contributed, DEMO_CURRENCY, DEMO_LOCALE)} of{" "}
                {formatMoney(goal.target, DEMO_CURRENCY, DEMO_LOCALE)}
              </p>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {percent}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BillsVisual() {
  return (
    <div className="flex w-full flex-col gap-2">
      {bills.slice(0, 3).map((bill) => (
        <div key={bill.id} className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <Receipt className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{bill.payee}</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">{bill.dueDate}</p>
            </div>
          </div>
          <AmountText
            amount={bill.amount}
            currency={DEMO_CURRENCY}
            locale={DEMO_LOCALE}
            type="expense"
            className="shrink-0 text-xs font-medium"
          />
        </div>
      ))}
    </div>
  );
}

export function AccountsVisual() {
  const rows = accounts.filter((account) => ["bpi", "card", "index"].includes(account.id));

  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map((account) => (
        <div key={account.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">
            {account.name}
            <span className="ml-1.5 text-[10px]">{account.type}</span>
          </span>
          <AmountText
            amount={account.balance}
            currency={DEMO_CURRENCY}
            locale={DEMO_LOCALE}
            className={
              "shrink-0 text-xs font-medium" + (account.balance < 0 ? " text-negative" : "")
            }
          />
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
        <span className="font-medium">Net worth</span>
        <span className="shrink-0 font-semibold tabular-nums">
          {formatMoney(summary.totalBalance, DEMO_CURRENCY, DEMO_LOCALE)}
        </span>
      </div>
    </div>
  );
}

const INSIGHT_DOT = {
  warning: "bg-warning",
  danger: "bg-negative",
  neutral: "bg-muted-foreground",
} as const;

export function InsightsVisual() {
  return (
    <div className="flex w-full flex-col gap-3">
      {insights.slice(0, 2).map((insight) => (
        <div key={insight.id} className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={"mt-1.5 size-2 shrink-0 rounded-full " + INSIGHT_DOT[insight.tone]}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{insight.title}</p>
            <p className="line-clamp-2 text-[10px] text-muted-foreground">{insight.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsVisual() {
  return (
    <div className="w-full rounded-md border border-border bg-card p-3" aria-hidden="true">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Logo variant="mark" size="sm" markClassName="size-5" />
          <div>
            <p className="text-[10px] font-semibold leading-tight">Monthly Summary</p>
            <p className="text-[8px] text-muted-foreground">October 2026</p>
          </div>
        </div>
        <span className="text-[8px] tracking-wide text-muted-foreground">PDF · A4</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[8px]">
        <div>
          <p className="text-muted-foreground">Income</p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums">₱65,000.00</p>
        </div>
        <div>
          <p className="text-muted-foreground">Expenses</p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums">₱51,236.00</p>
        </div>
        <div>
          <p className="text-muted-foreground">Net</p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-positive">
            +{formatMoney(13_764_00, DEMO_CURRENCY, DEMO_LOCALE)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex h-12 items-end gap-1.5">
        {[62, 78, 54, 88, 46, 70, 58, 82, 49, 66].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-sm bg-chart-1/80"
            style={{ height: height + "%" }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[7px] text-muted-foreground">
        <span>Spending by category</span>
        <span>6 categories · 32 transactions</span>
      </div>
    </div>
  );
}

export function CsvVisual() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-muted/40 p-2.5">
      <p className="font-mono text-[10px] text-muted-foreground">transactions.csv</p>
      <div className="flex flex-col gap-0.5 overflow-hidden font-mono text-[10px] leading-relaxed">
        <span className="truncate text-foreground">date,payee,amount</span>
        <span className="truncate text-muted-foreground">
          2026-10-28,Salary - Acme Corp,32500.00
        </span>
        <span className="truncate text-muted-foreground">2026-10-27,Joyride,-214.00</span>
      </div>
      <span className="mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium">
        <FileText className="size-3" aria-hidden="true" />
        Export CSV
      </span>
    </div>
  );
}
