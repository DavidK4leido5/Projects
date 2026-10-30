"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@repo/ui";
import { formatMoney } from "@repo/finance";

type Row = { categoryId: string | null; name: string; amount: number; share: number };

export function CategoryDonut({
  data,
  currency,
  locale,
}: {
  data: Row[];
  currency: string;
  locale: string;
}) {
  const rows = data.map((row, index) => ({ ...row, key: "slice" + index }));
  const config: ChartConfig = Object.fromEntries(
    rows.map((row, index) => [
      row.key,
      { label: row.name, color: "var(--chart-" + ((index % 5) + 1) + ")" },
    ]),
  );
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ChartContainer config={config} className="mx-auto aspect-square h-[150px] shrink-0 sm:mx-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(Number(value), currency, locale)}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={rows}
            dataKey="amount"
            nameKey="name"
            innerRadius={44}
            outerRadius={68}
            paddingAngle={2}
            strokeWidth={0}
          >
            {rows.map((row) => (
              <Cell key={row.key} fill={"var(--color-" + row.key + ")"} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="min-w-0 flex-1">
        <dl className="flex w-full flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <dt className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--color-" + row.key + ")" }}
                />
                <span className="truncate">{row.name}</span>
              </dt>
              <dd className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(row.amount, currency, locale)}
                <span className="ml-1.5 text-xs">{row.share}%</span>
              </dd>
            </div>
          ))}
        </dl>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses in this period yet.</p>
        ) : null}
      </div>
    </div>
  );
}
