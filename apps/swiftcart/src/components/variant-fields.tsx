"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button, Checkbox } from "@repo/ui";
import type { ProductProperty } from "@/lib/db/schema";

type Group = { id: string; name: string; values: { id: string; name: string }[] };
type Row = {
  id: string;
  picks: Record<string, string>;
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

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Two steps, in the order a seller thinks: declare the groups, then match them
 * in the table. One row is one combination you actually sell.
 */
export function VariantFields({
  initialProperties,
  initialVariants,
}: {
  initialProperties: ProductProperty[];
  initialVariants: InitialVariant[];
}) {
  const [enabled, setEnabled] = useState(initialProperties.length > 0);

  const [groups, setGroups] = useState<Group[]>(() =>
    initialProperties.map((property) => ({
      id: uid(),
      name: property.name,
      values: property.values.map((value) => ({ id: uid(), name: value })),
    })),
  );

  const [rows, setRows] = useState<Row[]>(() =>
    initialVariants.map((variant) => ({
      id: uid(),
      picks: Object.fromEntries(
        initialProperties.map((property) => [property.name, variant.options[property.name] ?? ""]),
      ),
      price: variant.priceCents ? (variant.priceCents / 100).toFixed(2) : "",
      stock: String(variant.stock),
      sku: variant.sku ?? "",
      imageKey: variant.imageKey ?? "",
    })),
  );

  const [draftGroup, setDraftGroup] = useState("");
  const [draftValue, setDraftValue] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const patchRow = (id: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  function addGroup() {
    const name = draftGroup.trim();
    if (!name || groups.length >= 3) return;
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) return;
    setGroups((current) => [...current, { id: uid(), name, values: [] }]);
    setDraftGroup("");
  }

  function addValue(groupId: string) {
    const name = (draftValue[groupId] ?? "").trim();
    if (!name) return;
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        if (group.values.some((value) => value.name.toLowerCase() === name.toLowerCase()))
          return group;
        return { ...group, values: [...group.values, { id: uid(), name }] };
      }),
    );
    setDraftValue((current) => ({ ...current, [groupId]: "" }));
  }

  function removeValue(group: Group, valueId: string) {
    const removed = group.values.find((entry) => entry.id === valueId);
    setGroups((current) =>
      current.map((entry) =>
        entry.id === group.id
          ? { ...entry, values: entry.values.filter((item) => item.id !== valueId) }
          : entry,
      ),
    );
    if (removed)
      setRows((current) => current.filter((row) => row.picks[group.name] !== removed.name));
  }

  function addRow() {
    const ready = groups.filter((group) => group.values.length > 0);
    if (ready.length === 0) return;

    // Offer the first pairing that is not already in the table.
    for (let index = 0; index < 64; index += 1) {
      const picks: Record<string, string> = {};
      groups.forEach((group, position) => {
        const size = Math.max(group.values.length, 1);
        picks[group.name] =
          group.values[Math.floor(index / Math.pow(size, position)) % size]?.name ?? "";
      });
      const key = groups.map((group) => group.name + "=" + picks[group.name]).join("|");
      const taken = rows.some(
        (row) => groups.map((group) => group.name + "=" + row.picks[group.name]).join("|") === key,
      );
      if (!taken && Object.values(picks).every(Boolean)) {
        setRows((current) => [
          ...current,
          { id: uid(), picks, price: "", stock: "0", sku: "", imageKey: "" },
        ]);
        return;
      }
    }
  }

  async function upload(rowId: string, file: File | undefined) {
    if (!file) return;
    setBusy(rowId);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string };
      if (payload.key) patchRow(rowId, { imageKey: payload.key });
    } finally {
      setBusy(null);
    }
  }

  const active = groups.filter((group) => group.values.length > 0);
  const properties: ProductProperty[] = enabled
    ? active.map((group) => ({ name: group.name, values: group.values.map((value) => value.name) }))
    : [];

  // A row may cover only some groups: "Olive" with no size is a valid combination.
  const payload = enabled
    ? rows
        .filter((row) => active.some((group) => Boolean(row.picks[group.name])))
        .map((row) => ({
          options: Object.fromEntries(
            active
              .filter((group) => row.picks[group.name])
              .map((group) => [group.name, row.picks[group.name]!]),
          ),
          price: row.price,
          stock: Number(row.stock || 0),
          sku: row.sku,
          imageKey: row.imageKey,
        }))
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border px-3 py-3">
      <input type="hidden" name="properties" value={JSON.stringify(properties)} />
      <input type="hidden" name="variants" value={enabled ? JSON.stringify(payload) : ""} />

      <label className="flex items-start gap-3">
        <Checkbox
          checked={enabled}
          onCheckedChange={(value) => setEnabled(value === true)}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">This item has variations</span>
          <span className="text-xs text-muted-foreground">
            Create the groups first, then match them in the table below.
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <section className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              1. Groups
            </h4>

            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col gap-2 rounded-md border border-border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={group.name}
                    onChange={(event) => {
                      const next = event.target.value;
                      setGroups((current) =>
                        current.map((entry) =>
                          entry.id === group.id ? { ...entry, name: next } : entry,
                        ),
                      );
                      setRows((current) =>
                        current.map((row) => {
                          const picks = { ...row.picks };
                          const value = picks[group.name];
                          delete picks[group.name];
                          if (value) picks[next] = value;
                          return { ...row, picks };
                        }),
                      );
                    }}
                    placeholder="Group name"
                    className="h-10 min-w-0 flex-1 rounded-md border border-border px-2 text-sm font-medium sm:h-8 sm:w-32 sm:flex-none"
                  />
                  {groups.length > 1 ? (
                    <button
                      type="button"
                      aria-label={"Remove " + group.name}
                      onClick={() =>
                        setGroups((current) => current.filter((entry) => entry.id !== group.id))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {group.values.map((value) => (
                    <span
                      key={value.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                    >
                      {value.name}
                      <button
                        type="button"
                        aria-label={"Remove " + value.name}
                        onClick={() => removeValue(group, value.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <span className="flex w-full items-center gap-1.5 sm:w-auto">
                    <input
                      value={draftValue[group.id] ?? ""}
                      onChange={(event) =>
                        setDraftValue((current) => ({ ...current, [group.id]: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addValue(group.id);
                        }
                      }}
                      placeholder="Add value"
                      enterKeyHint="done"
                      className="h-10 min-w-0 flex-1 rounded-md border border-border px-2 text-sm sm:h-8 sm:w-44 sm:flex-none sm:text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addValue(group.id)}
                      className="h-10 shrink-0 px-3 sm:h-8"
                    >
                      <Plus />
                      Add
                    </Button>
                  </span>
                </div>
              </div>
            ))}

            {groups.length < 3 ? (
              <div className="flex items-center gap-2">
                <input
                  value={draftGroup}
                  onChange={(event) => setDraftGroup(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addGroup();
                    }
                  }}
                  placeholder="New group, e.g. Color"
                  enterKeyHint="done"
                  className="h-10 min-w-0 flex-1 rounded-md border border-border px-2 text-sm sm:h-8 sm:w-44 sm:flex-none sm:text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addGroup}
                  className="h-10 shrink-0 px-3 sm:h-8"
                >
                  <Plus />
                  Add group
                </Button>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                2. Combinations
              </h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRow}
                disabled={active.length === 0}
              >
                <Plus />
                Add combination
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    {groups.map((group) => (
                      <th key={group.id} className="px-1 py-2 font-medium sm:px-2">
                        {group.name || "Group"}
                      </th>
                    ))}
                    <th className="px-1 py-2 font-medium sm:px-2">Price</th>
                    <th className="px-1 py-2 font-medium sm:px-2">Stock</th>
                    <th className="hidden px-2 py-2 font-medium sm:table-cell">SKU</th>
                    <th className="px-1 py-2 font-medium sm:px-2">Preview</th>
                    <th className="w-8 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={groups.length + 5}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No combinations yet. Add the pairings you actually sell.
                      </td>
                    </tr>
                  ) : null}

                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      {groups.map((group) => (
                        <td key={group.id} className="relative px-1 py-1.5 sm:px-2">
                          <select
                            aria-label={group.name}
                            value={row.picks[group.name] ?? ""}
                            onChange={(event) =>
                              patchRow(row.id, {
                                picks: { ...row.picks, [group.name]: event.target.value },
                              })
                            }
                            className="h-9 w-24 appearance-none truncate rounded-md bg-transparent pr-4 text-sm font-medium hover:bg-muted/50 sm:h-7 sm:text-xs"
                          >
                            <option value="">none</option>
                            {group.values.map((value) => (
                              <option key={value.id} value={value.name}>
                                {value.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </td>
                      ))}

                      <td className="px-1 py-2 sm:px-2">
                        <input
                          aria-label="Variant price"
                          value={row.price}
                          onChange={(event) => patchRow(row.id, { price: event.target.value })}
                          placeholder="base"
                          className="h-10 w-14 rounded-md border border-border px-2 text-sm sm:h-7 sm:w-20 sm:text-xs"
                        />
                      </td>
                      <td className="px-1 py-2 sm:px-2">
                        <input
                          aria-label="Variant stock"
                          value={row.stock}
                          onChange={(event) => patchRow(row.id, { stock: event.target.value })}
                          className="h-10 w-12 rounded-md border border-border px-2 text-sm sm:h-7 sm:w-16 sm:text-xs"
                        />
                      </td>
                      <td className="hidden px-2 py-2 sm:table-cell">
                        <input
                          aria-label="Variant SKU"
                          value={row.sku}
                          onChange={(event) => patchRow(row.id, { sku: event.target.value })}
                          className="h-10 w-20 rounded-md border border-border px-2 text-sm sm:h-7 sm:text-xs"
                        />
                      </td>
                      <td className="px-1 py-2 sm:px-2">
                        <RowImage
                          value={row.imageKey}
                          busy={busy === row.id}
                          onPick={(file) => void upload(row.id, file)}
                          onClear={() => patchRow(row.id, { imageKey: "" })}
                        />
                      </td>
                      <td className="px-1 py-2 sm:px-2">
                        <button
                          type="button"
                          aria-label="Remove combination"
                          onClick={() =>
                            setRows((current) => current.filter((entry) => entry.id !== row.id))
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Add only the pairings you sell. Blank price uses the item price.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function RowImage({
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
