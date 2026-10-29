"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { ResultsRegion } from "@/components/results-region";
import { TableSkeleton } from "@/components/table-skeleton";
import { updateVariantStock } from "@/features/store/inventory-actions";
import type { StoreItem, StoreVariant } from "@/features/products/queries";
import type { VariantOptions } from "@/lib/db/schema";

type Filter = "all" | "low" | "out";
type StockEdit = { variantId: string; stock: number };

const MAX_STOCK = 100_000;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low stock (≤3)" },
  { value: "out", label: "Out of stock" },
];

function optionLabel(options: VariantOptions): string {
  const entries = Object.entries(options);
  if (entries.length === 0) return "Standard";
  return entries.map(([name, value]) => name + ": " + value).join(" · ");
}

function matches(stock: number, filter: Filter): boolean {
  if (filter === "low") return stock <= 3;
  if (filter === "out") return stock === 0;
  return true;
}

function clearKey(state: Record<string, string>, key: string): Record<string, string> {
  if (!(key in state)) return state;
  const next = { ...state };
  delete next[key];
  return next;
}

export function InventoryTable({ items }: { items: StoreItem[] }) {
  const router = useRouter();

  const baseStocks: Record<string, number> = {};
  for (const item of items) {
    for (const variant of item.variants) baseStocks[variant.id] = variant.stock;
  }

  const [stocks, applyStock] = useOptimistic(
    baseStocks,
    (state: Record<string, number>, edit: StockEdit) => ({
      ...state,
      [edit.variantId]: edit.stock,
    }),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, start] = useTransition();

  const stockOf = (variant: StoreVariant) => stocks[variant.id] ?? variant.stock;

  function commit(variant: StoreVariant, raw: string) {
    const current = stockOf(variant);
    setDrafts((state) => clearKey(state, variant.id));
    setErrors((state) => clearKey(state, variant.id));

    const trimmed = raw.trim();
    const next = Number(trimmed);
    if (trimmed === "" || !Number.isInteger(next) || next < 0 || next > MAX_STOCK) {
      setErrors((state) => ({
        ...state,
        [variant.id]: "Enter a whole number from 0 to 100,000.",
      }));
      return;
    }
    if (next === current) return;

    start(async () => {
      applyStock({ variantId: variant.id, stock: next });
      const result = await updateVariantStock(variant.id, next);
      if (!result.ok) {
        setErrors((state) => ({ ...state, [variant.id]: result.error }));
      }
      router.refresh();
    });
  }

  const visible = items
    .map((item) => ({
      ...item,
      variants: item.variants.filter((variant) => matches(stockOf(variant), filter)),
    }))
    .filter((item) => filter === "all" || item.variants.length > 0);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? "secondary" : "ghost"}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <ResultsRegion
        id="inventory-results"
        className="scroll-mt-24"
        skeleton={<TableSkeleton rows={8} columns={3} variant="products" />}
      >
        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-5 py-10">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Nothing in the catalogue yet. Add an item from the dashboard first."
                : "No variants match this filter."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {item.variants.length} variant{item.variants.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {item.variants.reduce((total, variant) => total + stockOf(variant), 0)} in stock
                  </span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.variants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No variants yet. Add variations from the item editor.
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {item.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">
                          {optionLabel(variant.options)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {variant.sku ?? "No SKU"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-end gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={MAX_STOCK}
                              step={1}
                              inputMode="numeric"
                              disabled={pending}
                              aria-label={
                                "Stock for " + item.name + ", " + optionLabel(variant.options)
                              }
                              value={drafts[variant.id] ?? String(stockOf(variant))}
                              onChange={(event) => {
                                const value = event.target.value;
                                setDrafts((state) => ({ ...state, [variant.id]: value }));
                                setErrors((state) => clearKey(state, variant.id));
                              }}
                              onBlur={(event) => commit(variant, event.currentTarget.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                }
                                if (event.key === "Escape") {
                                  setDrafts((state) => clearKey(state, variant.id));
                                }
                              }}
                              className="h-8 w-24 text-right tabular-nums"
                            />
                            {errors[variant.id] ? (
                              <p role="alert" className="text-right text-xs text-destructive">
                                {errors[variant.id]}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </ResultsRegion>
    </section>
  );
}
