"use client";

import Image from "next/image";
import { Fragment, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button, Checkbox } from "@repo/ui";
import type { ProductProperty } from "@/lib/db/schema";

type ValueRow = { id: string; name: string; imageKey: string };
type SubRow = { id: string; name: string };
type Leaf = { price: string; stock: string; sku: string; imageKey: string };

type InitialVariant = {
  options: Record<string, string>;
  priceCents: number | null;
  stock: number;
  sku: string | null;
  imageKey: string | null;
};

const EMPTY_LEAF: Leaf = { price: "", stock: "0", sku: "", imageKey: "" };

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * One table, typed directly. The group row names the variation ("Color"), each
 * row under it is a value, and every value can take the same second-level list
 * ("Size"). Leaves are the combinations and carry price, stock, and image.
 */
export function VariantFields({
  initialProperties,
  initialVariants,
}: {
  initialProperties: ProductProperty[];
  initialVariants: InitialVariant[];
}) {
  const [enabled, setEnabled] = useState(initialProperties.length > 0);
  const [groupName, setGroupName] = useState(initialProperties[0]?.name ?? "Color");
  const [subName, setSubName] = useState(initialProperties[1]?.name ?? "Size");
  const [hasSub, setHasSub] = useState(Boolean(initialProperties[1]));

  const [values, setValues] = useState<ValueRow[]>(() => {
    const names = initialProperties[0]?.values ?? [];
    return names.map((name) => {
      const match = initialVariants.find(
        (variant) => variant.options[initialProperties[0]!.name] === name,
      );
      return { id: uid(), name, imageKey: match?.imageKey ?? "" };
    });
  });

  const [subs, setSubs] = useState<SubRow[]>(() =>
    (initialProperties[1]?.values ?? []).map((name) => ({ id: uid(), name })),
  );

  const [leaves, setLeaves] = useState<Record<string, Leaf>>(() => {
    const map: Record<string, Leaf> = {};
    if (initialProperties.length === 0) return map;
    const first = initialProperties[0]!;
    const second = initialProperties[1];

    for (const variant of initialVariants) {
      const value = variant.options[first.name] ?? "";
      const sub = second ? (variant.options[second.name] ?? "") : "";
      const key = sub ? value + "||" + sub : value;
      map[key] = {
        price: variant.priceCents ? (variant.priceCents / 100).toFixed(2) : "",
        stock: String(variant.stock),
        sku: variant.sku ?? "",
        imageKey: variant.imageKey ?? "",
      };
    }
    return map;
  });

  const [draftValue, setDraftValue] = useState("");
  const [draftSub, setDraftSub] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function leafKey(valueName: string, subNameValue: string): string {
    return subNameValue ? valueName + "||" + subNameValue : valueName;
  }

  function leafOf(valueName: string, subNameValue: string): Leaf {
    return leaves[leafKey(valueName, subNameValue)] ?? EMPTY_LEAF;
  }

  function setLeaf(valueName: string, subNameValue: string, patch: Partial<Leaf>) {
    const key = leafKey(valueName, subNameValue);
    setLeaves((current) => ({ ...current, [key]: { ...(current[key] ?? EMPTY_LEAF), ...patch } }));
  }

  function addValue() {
    const name = draftValue.trim();
    if (!name) return;
    if (values.some((value) => value.name.toLowerCase() === name.toLowerCase())) return;
    setValues((current) => [...current, { id: uid(), name, imageKey: "" }]);
    setDraftValue("");
  }

  function addSub() {
    const name = draftSub.trim();
    if (!name) return;
    if (subs.some((sub) => sub.name.toLowerCase() === name.toLowerCase())) return;
    setSubs((current) => [...current, { id: uid(), name }]);
    setDraftSub("");
  }

  async function uploadValue(valueId: string, file: File | undefined) {
    if (!file) return;
    setBusy(valueId);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string };
      if (payload.key) {
        setValues((current) =>
          current.map((value) =>
            value.id === valueId ? { ...value, imageKey: payload.key! } : value,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function uploadLeaf(valueName: string, subNameValue: string, file: File | undefined) {
    if (!file) return;
    setBusy(leafKey(valueName, subNameValue));
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string };
      if (payload.key) setLeaf(valueName, subNameValue, { imageKey: payload.key });
    } finally {
      setBusy(null);
    }
  }

  const properties: ProductProperty[] = enabled
    ? [
        { name: groupName.trim() || "Option", values: values.map((value) => value.name) },
        ...(hasSub && subs.length > 0
          ? [{ name: subName.trim() || "Size", values: subs.map((sub) => sub.name) }]
          : []),
      ]
    : [];

  const payload = enabled
    ? values.flatMap((value) => {
        const combos = hasSub && subs.length > 0 ? subs.map((sub) => sub.name) : [""];
        return combos.map((sub) => {
          const leaf = leafOf(value.name, sub);
          const options: Record<string, string> = { [groupName.trim() || "Option"]: value.name };
          if (sub) options[subName.trim() || "Size"] = sub;
          return {
            options,
            price: leaf.price,
            stock: Number(leaf.stock || 0),
            sku: leaf.sku,
            imageKey: leaf.imageKey || value.imageKey,
          };
        });
      })
    : [];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border px-3 py-3">
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
            Type the rows directly. Each combination gets its own price, stock, and preview.
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <div className="flex items-center gap-2">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Variation name"
              className="h-8 w-40 rounded-md border border-border px-2 text-sm font-medium"
            />
            <div className="flex items-center gap-2">
              <input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addValue();
                  }
                }}
                placeholder="Add value, press Enter"
                className="h-8 w-48 rounded-md border border-border px-2 text-xs"
              />
              <Button type="button" size="sm" variant="ghost" onClick={addValue}>
                <Plus />
                Add
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">{groupName || "Option"}</th>
                  <th className="px-2 py-2 font-medium">Price</th>
                  <th className="px-2 py-2 font-medium">Stock</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">Preview</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {values.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      Add a value like Bone or Black.
                    </td>
                  </tr>
                ) : null}

                {values.map((value) => {
                  const single = !hasSub || subs.length === 0;
                  return (
                    <Fragment key={value.id}>
                      <tr className="border-t border-border bg-muted/20">
                        <td className="px-2 py-2 font-medium">{value.name}</td>
                        {single ? (
                          <>
                            <td className="px-2 py-2">
                              <PriceInput
                                value={leafOf(value.name, "").price}
                                onChange={(price) => setLeaf(value.name, "", { price })}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <StockInput
                                value={leafOf(value.name, "").stock}
                                onChange={(stock) => setLeaf(value.name, "", { stock })}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <SkuInput
                                value={leafOf(value.name, "").sku}
                                onChange={(sku) => setLeaf(value.name, "", { sku })}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 text-muted-foreground" colSpan={3}>
                              {subs.length} {subs.length === 1 ? "combination" : "combinations"}{" "}
                              below
                            </td>
                          </>
                        )}
                        <td className="px-2 py-2">
                          <PreviewCell
                            value={value.imageKey}
                            busy={busy === value.id}
                            onPick={(file) => void uploadValue(value.id, file)}
                            onClear={() =>
                              setValues((current) =>
                                current.map((row) =>
                                  row.id === value.id ? { ...row, imageKey: "" } : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            aria-label={"Remove " + value.name}
                            onClick={() =>
                              setValues((current) => current.filter((row) => row.id !== value.id))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>

                      {!single
                        ? subs.map((sub) => {
                            const leaf = leafOf(value.name, sub.name);
                            return (
                              <tr key={value.id + sub.id} className="border-t border-border">
                                <td className="py-2 pl-6 pr-2 text-muted-foreground">{sub.name}</td>
                                <td className="px-2 py-2">
                                  <PriceInput
                                    value={leaf.price}
                                    onChange={(price) => setLeaf(value.name, sub.name, { price })}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <StockInput
                                    value={leaf.stock}
                                    onChange={(stock) => setLeaf(value.name, sub.name, { stock })}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <SkuInput
                                    value={leaf.sku}
                                    onChange={(sku) => setLeaf(value.name, sub.name, { sku })}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <PreviewCell
                                    value={leaf.imageKey}
                                    busy={busy === leafKey(value.name, sub.name)}
                                    onPick={(file) => void uploadLeaf(value.name, sub.name, file)}
                                    onClear={() => setLeaf(value.name, sub.name, { imageKey: "" })}
                                  />
                                </td>
                                <td />
                              </tr>
                            );
                          })
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setHasSub((current) => {
                  const next = !current;
                  if (next && subName.trim().toLowerCase() === groupName.trim().toLowerCase()) {
                    setSubName(groupName.trim().toLowerCase() === "color" ? "Size" : "Color");
                  }
                  return next;
                })
              }
            >
              {hasSub ? "Remove second variation" : "Add a second variation"}
            </Button>

            {hasSub ? (
              <>
                <input
                  value={subName}
                  onChange={(event) => setSubName(event.target.value)}
                  placeholder="Size"
                  className="h-8 w-28 rounded-md border border-border px-2 text-xs font-medium"
                />
                {subs.map((sub) => (
                  <span
                    key={sub.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  >
                    {sub.name}
                    <button
                      type="button"
                      aria-label={"Remove " + sub.name}
                      onClick={() =>
                        setSubs((current) => current.filter((row) => row.id !== sub.id))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={draftSub}
                  onChange={(event) => setDraftSub(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSub();
                    }
                  }}
                  placeholder="Add size, press Enter"
                  className="h-8 w-40 rounded-md border border-border px-2 text-xs"
                />
              </>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Blank price uses the item price. The second variation is shared by every value above it,
            so the buyer never sees a combination that does not exist.
          </p>
        </>
      ) : null}
    </div>
  );
}

function PriceInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="base"
      inputMode="decimal"
      className="h-7 w-20 rounded-md border border-border px-2 text-xs"
    />
  );
}

function StockInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode="numeric"
      className="h-7 w-16 rounded-md border border-border px-2 text-xs"
    />
  );
}

function SkuInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-24 rounded-md border border-border px-2 text-xs"
    />
  );
}

function PreviewCell({
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
