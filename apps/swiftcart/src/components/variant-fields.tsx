"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button, Checkbox, Input } from "@repo/ui";
import type { ProductProperty } from "@/lib/db/schema";

type Row = {
  options: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  imageKey: string;
};

type InitialVariant = {
  options: Record<string, string>;
  priceCents: number | null;
  stock: number;
  sku: string | null;
  imageKey: string | null;
};

const MAX_PROPERTIES = 3;

function keyOf(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((name) => name + "=" + options[name])
    .join("|");
}

function mergeRows(combos: Record<string, string>[], rows: Row[]): Row[] {
  const byKey = new Map(rows.map((row) => [keyOf(row.options), row]));
  return combos.map(
    (options) =>
      byKey.get(keyOf(options)) ?? { options, price: "", stock: "0", sku: "", imageKey: "" },
  );
}

function combinations(properties: ProductProperty[]): Record<string, string>[] {
  if (properties.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const property of properties) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of property.values) next.push({ ...combo, [property.name]: value });
    }
    combos = next;
  }
  return combos;
}

const PRESETS = ["Size", "Color", "Material", "Fit", "Length", "Roast"];

export function VariantFields({
  initialProperties,
  initialVariants,
}: {
  initialProperties: ProductProperty[];
  initialVariants: InitialVariant[];
}) {
  const [enabled, setEnabled] = useState(initialProperties.length > 0);
  const [properties, setProperties] = useState<ProductProperty[]>(initialProperties);
  const [rows, setRows] = useState<Row[]>(() =>
    initialVariants.map((variant) => ({
      options: variant.options,
      price: variant.priceCents ? (variant.priceCents / 100).toFixed(2) : "",
      stock: String(variant.stock),
      sku: variant.sku ?? "",
      imageKey: variant.imageKey ?? "",
    })),
  );
  const [draftValue, setDraftValue] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Keep typed values when the option set changes; new combos start blank.
  const merged = mergeRows(combinations(properties), rows);

  function commit(next: Row[]) {
    setRows(next);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    const next = merged.map((row, position) => (position === index ? { ...row, ...patch } : row));
    commit(next);
  }

  function addOption() {
    if (properties.length >= MAX_PROPERTIES) return;
    setProperties((current) => [...current, { name: "", values: [] }]);
  }

  function renameOption(index: number, name: string) {
    setProperties((current) =>
      current.map((property, position) => (position === index ? { ...property, name } : property)),
    );
  }

  function addValue(index: number) {
    const value = (draftValue[index] ?? "").trim();
    if (!value) return;
    setProperties((current) =>
      current.map((property, position) =>
        position === index && !property.values.includes(value)
          ? { ...property, values: [...property.values, value] }
          : property,
      ),
    );
    setDraftValue((current) => ({ ...current, [index]: "" }));
  }

  function removeValue(index: number, value: string) {
    setProperties((current) =>
      current.map((property, position) =>
        position === index
          ? { ...property, values: property.values.filter((entry) => entry !== value) }
          : property,
      ),
    );
  }

  async function upload(index: number, file: File | undefined) {
    if (!file) return;
    setBusy(keyOf(merged[index]!.options));
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string };
      const key = payload.key;
      if (!key) return;

      // A colour usually looks the same in every size: copy it across.
      const first = properties[0];
      const shared = first ? merged[index]!.options[first.name] : undefined;

      commit(
        merged.map((row, position) => {
          if (position === index) return { ...row, imageKey: key };
          if (first && shared && row.options[first.name] === shared && !row.imageKey) {
            return { ...row, imageKey: key };
          }
          return row;
        }),
      );
    } finally {
      setBusy(null);
    }
  }

  const payload = merged.map((row) => ({
    options: row.options,
    price: row.price,
    stock: Number(row.stock || 0),
    sku: row.sku,
    imageKey: row.imageKey,
  }));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border px-3 py-3">
      <input type="hidden" name="properties" value={JSON.stringify(enabled ? properties : [])} />
      <input type="hidden" name="variants" value={enabled ? JSON.stringify(payload) : ""} />

      <label className="flex items-start gap-3">
        <Checkbox
          checked={enabled}
          onCheckedChange={(value) => setEnabled(value === true)}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">This item has options</span>
          <span className="text-xs text-muted-foreground">
            Sizes, colours, or anything else the buyer picks. Each combination gets its own stock.
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <div className="flex flex-col gap-3">
            {properties.map((property, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={property.name}
                    onChange={(event) => renameOption(index, event.target.value)}
                    placeholder="Option name"
                    list="variant-presets"
                    className="h-8 max-w-40 text-xs"
                  />
                  <datalist id="variant-presets">
                    {PRESETS.map((preset) => (
                      <option key={preset} value={preset} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setProperties((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <X />
                    Remove
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {property.values.map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                    >
                      {value}
                      <button
                        type="button"
                        aria-label={"Remove " + value}
                        onClick={() => removeValue(index, value)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={draftValue[index] ?? ""}
                    onChange={(event) =>
                      setDraftValue((current) => ({ ...current, [index]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addValue(index);
                      }
                    }}
                    placeholder="Add value, press Enter"
                    className="h-7 w-40 rounded-md border border-border px-2 text-xs"
                  />
                </div>
              </div>
            ))}

            {properties.length < MAX_PROPERTIES ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addOption}
                className="self-start"
              >
                <Plus />
                Add option
              </Button>
            ) : null}
          </div>

          {merged.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    {properties.map((property) => (
                      <th key={property.name} className="px-2 py-2 font-medium">
                        {property.name || "Option"}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium">Price</th>
                    <th className="px-2 py-2 font-medium">Stock</th>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {merged.map((row, index) => (
                    <tr key={keyOf(row.options)} className="border-t border-border">
                      {properties.map((property) => (
                        <td key={property.name} className="px-2 py-2">
                          {row.options[property.name]}
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <input
                          value={row.price}
                          onChange={(event) => updateRow(index, { price: event.target.value })}
                          placeholder="base"
                          inputMode="decimal"
                          className="h-7 w-20 rounded-md border border-border px-2 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.stock}
                          onChange={(event) => updateRow(index, { stock: event.target.value })}
                          inputMode="numeric"
                          className="h-7 w-16 rounded-md border border-border px-2 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.sku}
                          onChange={(event) => updateRow(index, { sku: event.target.value })}
                          className="h-7 w-28 rounded-md border border-border px-2 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <VariantImage
                          value={row.imageKey}
                          busy={busy === keyOf(row.options)}
                          onPick={(file) => void upload(index, file)}
                          onClear={() => updateRow(index, { imageKey: "" })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Blank price uses the item price. Stock is per combination. An image set on one row is
            copied to the other rows sharing the first option value.
          </p>
        </>
      ) : null}
    </div>
  );
}

function VariantImage({
  value,
  busy,
  onPick,
  onClear,
}: {
  value: string;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1">
      {value ? (
        <>
          <Image
            src={value}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded border border-border object-cover"
          />
          <button type="button" aria-label="Remove image" onClick={onClear}>
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button
          type="button"
          aria-label="Add preview image"
          onClick={() => inputRef.current?.click()}
          className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:border-muted-foreground"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}