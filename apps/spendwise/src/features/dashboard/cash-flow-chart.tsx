"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui";
import { formatMoney, formatMoneyCompact } from "@repo/finance";

type Point = { key: string; label: string; income: number; expense: number; net: number };

const config = {
  income: { label: "Income", color: "var(--income)" },
  expense: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig;

export function CashFlowChart({
  data,
  currency,
  locale,
  animated = true,
  height = 240,
}: {
  data: Point[];
  currency: string;
  locale: string;
  animated?: boolean;
  height?: number;
}) {
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={4}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={8} />
        <YAxis
          width={54}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatMoneyCompact(Number(value), currency, locale)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(Number(value), currency, locale)}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="income"
          fill="var(--color-income)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          isAnimationActive={animated}
        />
        <Bar
          dataKey="expense"
          fill="var(--color-expense)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          isAnimationActive={animated}
        />
      </BarChart>
    </ChartContainer>
  );
}
