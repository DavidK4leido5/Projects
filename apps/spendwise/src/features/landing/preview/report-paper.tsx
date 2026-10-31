import { cn } from "@repo/shared";
import { AmountText } from "@repo/ui";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";
import { DEMO_CURRENCY, DEMO_LOCALE, reportPreview } from "@/features/landing/mock-data";

type ReportPaperProps = {
  title?: string;
  period?: string;
  income?: number;
  expenses?: number;
  net?: number;
  savingsRate?: number;
  categories?: readonly { name: string; amount: number }[];
  topExpenses?: readonly { label: string; amount: number }[];
  currency?: string;
  locale?: string;
  className?: string;
};

const VIEW_WIDTH = 120;
const VIEW_HEIGHT = 44;
const BASELINE = 40;
const BAR_WIDTH = 14;
const BAR_GAP = 8;

export function ReportPaper({
  title = reportPreview.title,
  period = reportPreview.period,
  income = reportPreview.income,
  expenses = reportPreview.expenses,
  net = reportPreview.net,
  savingsRate = reportPreview.savingsRate,
  categories = reportPreview.categories,
  topExpenses = reportPreview.topExpenses,
  currency = DEMO_CURRENCY,
  locale = DEMO_LOCALE,
  className,
}: ReportPaperProps) {
  const max = Math.max(1, ...categories.map((category) => category.amount));
  const chartWidth = categories.length * BAR_WIDTH + Math.max(0, categories.length - 1) * BAR_GAP;
  const left = Math.max(0, (VIEW_WIDTH - chartWidth) / 2);

  return (
    <article
      aria-label={title + " report preview"}
      className={cn(
        "mx-auto flex aspect-[210/297] w-full max-w-[420px] flex-col gap-3 overflow-hidden rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Logo variant="mark" size="sm" className="shrink-0" markClassName="size-5" />
          <div className="min-w-0">
            <p className="text-[12px] leading-tight font-semibold tracking-tight">{brand.name}</p>
            <p className="text-[8px] tracking-wider text-muted-foreground uppercase">
              Personal finance
            </p>
          </div>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-[12px] leading-tight font-semibold">{title}</p>
          <p className="truncate text-[8px] text-muted-foreground">{period}</p>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/40 p-2 sm:p-3">
        <div className="min-w-0">
          <dt className="text-[8px] tracking-wide text-muted-foreground uppercase">Income</dt>
          <dd className="mt-0.5 truncate text-[11px] font-semibold sm:text-[12px]">
            <AmountText amount={income} currency={currency} locale={locale} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[8px] tracking-wide text-muted-foreground uppercase">Expenses</dt>
          <dd className="mt-0.5 truncate text-[11px] font-semibold sm:text-[12px]">
            <AmountText amount={expenses} currency={currency} locale={locale} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[8px] tracking-wide text-muted-foreground uppercase">Net</dt>
          <dd className="mt-0.5 truncate text-[11px] font-semibold text-positive sm:text-[12px]">
            <AmountText amount={net} currency={currency} locale={locale} signed />
          </dd>
        </div>
      </dl>

      <section aria-label="Top categories" className="flex flex-col gap-1">
        <h3 className="text-[8px] font-medium tracking-wider text-muted-foreground uppercase">
          Spending by category
        </h3>
        <svg
          viewBox={"0 0 " + VIEW_WIDTH + " " + VIEW_HEIGHT}
          role="img"
          aria-label="Bar chart of the top five spending categories"
          className="h-16 w-full sm:h-24"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1="0"
            y1={BASELINE}
            x2={VIEW_WIDTH}
            y2={BASELINE}
            stroke="var(--border)"
            strokeWidth="0.75"
          />
          {categories.map((category, index) => {
            const ratio = category.amount / max;
            const height = 6 + ratio * (BASELINE - 10);
            const x = left + index * (BAR_WIDTH + BAR_GAP);
            return (
              <rect
                key={category.name}
                x={x}
                y={BASELINE - height}
                width={BAR_WIDTH}
                height={height}
                rx="1.5"
                fill={"var(--chart-" + ((index % 5) + 1) + ")"}
              />
            );
          })}
        </svg>
        <div
          className="grid gap-1 text-[7px] text-muted-foreground sm:text-[8px]"
          style={{ gridTemplateColumns: "repeat(" + categories.length + ", minmax(0, 1fr))" }}
        >
          {categories.map((category) => (
            <span key={category.name} className="truncate text-center">
              {category.name}
            </span>
          ))}
        </div>
      </section>

      <section aria-label="Largest expenses" className="flex flex-col gap-1">
        <h3 className="text-[8px] font-medium tracking-wider text-muted-foreground uppercase">
          Largest expenses
        </h3>
        <table className="w-full table-fixed border-collapse text-[9px] sm:text-[10px]">
          <tbody>
            {topExpenses.slice(0, 4).map((row) => (
              <tr key={row.label} className="border-b border-border last:border-b-0">
                <td className="w-[68%] truncate py-1.5 pr-2 text-foreground">{row.label}</td>
                <td className="w-[32%] py-1.5 text-right tabular-nums text-muted-foreground">
                  <AmountText amount={row.amount} currency={currency} locale={locale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-2 text-[7px] text-muted-foreground sm:text-[8px]">
        <span className="truncate">
          Generated by {brand.name} · {brand.domain}
        </span>
        <span className="shrink-0 tabular-nums">{savingsRate}% saved</span>
      </footer>
    </article>
  );
}
