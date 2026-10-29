"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button, Checkbox } from "@repo/ui";
import type { ProductProperty } from "@/lib/db/schema";

type LeafFields = { price: string; stock: string; sku: string; imageKey: string };
type Child = LeafFields & { id: string; name: string };
type Parent = LeafFields & { id: string; name: string; children: Child[] };

type InitialVariant = {
  options: Record<string, string>;
  priceCents: number | null;
  stock: number;
  sku: string | null;
  imageKey: string | null;
};

const EMPTY: LeafFields = { price: "", stock: "0", sku: "", imageKey: "" };

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fieldsOf(variant: InitialVariant): LeafFields {
  return {
    price: variant.priceCents ? (variant.priceCents / 100).toFixed(2) : "",
    stock: String(variant.stock),
    sku: variant.sku ?? "",
    imageKey: variant.imageKey ?? "",
  };
}

/**
 * Values are nodes. Each one owns its own children, so Bone can carry three
 * sizes while Black carries two. The table shows those attachments; every leaf
 * is one purchasable combination with its own price, stock, and preview.
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
  const [childName, setChildName] = useState(initialProperties[1]?.name ?? "Size");

  const [parents, setParents] = useState<Parent[]>(() => {
    const first = initialProperties[0];
    const second = initialProperties[1];
    if (!first) return [];

    const byValue = new Map<string, Parent>();
    for (const name of first.values) {
      byValue.set(name, { id: uid(), name, ...EMPTY, children: [] });
    }

    for (const variant of initialVariants) {
      const parent = byValue.get(variant.options[first.name] ?? "");
      if (!parent) continue;
      const childValue = second ? (variant.options[second.name] ?? "") : "";
      if (childValue) {
        parent.children.push({ id: uid(), name: childValue, ...fieldsOf(variant) });
      } else {
        Object.assign(parent, fieldsOf(variant));
      }
    }

    return [...byValue.values()];
  });

  const [draftParent, setDraftParent] = useState("");
  const [openChildFor, setOpenChildFor] = useState<string | null>(null);
  const [draftChild, setDraftChild] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const patchParent = (id: string, patch: Partial<Parent>) =>
    setParents((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const patchChild = (parentId: string, childId: string, patch: Partial<Child>) =>
    setParents((current) =>
      current.map((row) =>
        row.id === parentId
          ? {
              ...row,
              children: row.children.map((child) =>
                child.id === childId ? { ...child, ...patch } : child,
              ),
            }
          : row,
      ),
    );

  function addParent() {
    const name = draftParent.trim();
    if (!name) return;
    if (parents.some((row) => row.name.toLowerCase() === name.toLowerCase())) return;
    setParents((current) => [...current, { id: uid(), name, ...EMPTY, children: [] }]);
    setDraftParent("");
  }

  function addChild(parentId: string) {
    const name = draftChild.trim();
    if (!name) return;
    setParents((current) =>
      current.map((row) => {
        if (row.id !== parentId) return row;
        if (row.children.some((child) => child.name.toLowerCase() === name.toLowerCase()))
          return row;
        return { ...row, children: [...row.children, { id: uid(), name, ...EMPTY }] };
      }),
    );
    setDraftChild("");
  }

  async function upload(key: string, file: File | undefined, apply: (imageKey: string) => void) {
    if (!file) return;
    setBusy(key);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string };
      if (payload.key) apply(payload.key);
    } finally {
      setBusy(null);
    }
  }

  const childValues = [
    ...new Set(parents.flatMap((row) => row.children.map((child) => child.name))),
  ];
  const group = groupName.trim() || "Option";
  const subGroup = childName.trim() || "Size";

  const properties: ProductProperty[] = enabled
    ? [
        { name: group, values: parents.map((row) => row.name) },
        ...(childValues.length > 0 ? [{ name: subGroup, values: childValues }] : []),
      ]
    : [];

  const payload = enabled
    ? parents.flatMap((row) =>
        row.children.length === 0
          ? [
              {
                options: { [group]: row.name },
                price: row.price,
                stock: Number(row.stock || 0),
                sku: row.sku,
                imageKey: row.imageKey,
              },
            ]
          : row.children.map((child) => ({
              options: { [group]: row.name, [subGroup]: child.name },
              price: child.price,
              stock: Number(child.stock || 0),
              sku: child.sku,
              imageKey: child.imageKey || row.imageKey,
            })),
      )
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
            Add values, then attach sub-values to the ones that have them. Each combination gets its
            own price and stock.
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Variation"
              className="h-8 w-32 rounded-md border border-border px-2 text-sm font-medium"
            />
            <input
              value={draftParent}
              onChange={(event) => setDraftParent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addParent();
                }
              }}
              placeholder="Add value, press Enter"
              className="h-8 w-48 rounded-md border border-border px-2 text-xs"
            />
            <Button type="button" size="sm" variant="ghost" onClick={addParent}>
              <Plus />
              Add
            </Button>
            {childValues.length > 0 ? (
              <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                sub-values are
                <input
                  value={childName}
                  onChange={(event) => setChildName(event.target.value)}
                  className="h-7 w-24 rounded-md border border-border px-2 text-xs"
                />
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">{group}</th>
                  <th className="px-2 py-2 font-medium">Price</th>
                  <th className="px-2 py-2 font-medium">Stock</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">Preview</th>
                  <th className="w-12 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {parents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      Add a value like Bone or Black.
                    </td>
                  </tr>
                ) : null}
              </tbody>

              {parents.map((row) => {
                const hasChildren = row.children.length > 0;
                return (
                  <tbody key={row.id} className="border-t border-border">
                    <tr className="bg-muted/20">
                      <td className="px-2 py-2 font-medium">{row.name}</td>
                      {hasChildren ? (
                        <td className="px-2 py-2 text-muted-foreground" colSpan={3}>
                          {row.children.length}{" "}
                          {row.children.length === 1 ? "combination" : "combinations"}
                        </td>
                      ) : (
                        <>
                          <td className="px-2 py-2">
                            <Field
                              label="Variant price"
                              value={row.price}
                              onChange={(v) => patchParent(row.id, { price: v })}
                              placeholder="base"
                              width="w-20"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Field
                              label="Variant stock"
                              value={row.stock}
                              onChange={(v) => patchParent(row.id, { stock: v })}
                              width="w-16"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Field
                              label="Variant SKU"
                              value={row.sku}
                              onChange={(v) => patchParent(row.id, { sku: v })}
                              width="w-24"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        <Preview
                          value={row.imageKey}
                          busy={busy === row.id}
                          onPick={(file) =>
                            void upload(row.id, file, (key) =>
                              patchParent(row.id, { imageKey: key }),
                            )
                          }
                          onClear={() => patchParent(row.id, { imageKey: "" })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={"Add sub-value to " + row.name}
                            onClick={() => {
                              setOpenChildFor(openChildFor === row.id ? null : row.id);
                              setDraftChild("");
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={"Remove " + row.name}
                            onClick={() =>
                              setParents((current) =>
                                current.filter((entry) => entry.id !== row.id),
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {openChildFor === row.id ? (
                      <tr className="border-t border-border">
                        <td className="px-2 py-2" colSpan={6}>
                          <div className="flex items-center gap-2 pl-4">
                            <input
                              autoFocus
                              value={draftChild}
                              onChange={(event) => setDraftChild(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addChild(row.id);
                                }
                                if (event.key === "Escape") setOpenChildFor(null);
                              }}
                              placeholder={subGroup + " for " + row.name + ", press Enter"}
                              className="h-7 w-64 rounded-md border border-border px-2 text-xs"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => addChild(row.id)}
                            >
                              Add
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {row.children.map((child) => (
                      <tr key={child.id} className="border-t border-border">
                        <td className="py-2 pl-6 pr-2 text-muted-foreground">{child.name}</td>
                        <td className="px-2 py-2">
                          <Field
                            label="Variant price"
                            value={child.price}
                            onChange={(v) => patchChild(row.id, child.id, { price: v })}
                            placeholder="base"
                            width="w-20"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Field
                            label="Variant stock"
                            value={child.stock}
                            onChange={(v) => patchChild(row.id, child.id, { stock: v })}
                            width="w-16"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Field
                            label="Variant SKU"
                            value={child.sku}
                            onChange={(v) => patchChild(row.id, child.id, { sku: v })}
                            width="w-24"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Preview
                            value={child.imageKey}
                            busy={busy === child.id}
                            onPick={(file) =>
                              void upload(child.id, file, (key) =>
                                patchChild(row.id, child.id, { imageKey: key }),
                              )
                            }
                            onClear={() => patchChild(row.id, child.id, { imageKey: "" })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            aria-label={"Remove " + child.name}
                            onClick={() =>
                              setParents((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? {
                                        ...entry,
                                        children: entry.children.filter(
                                          (item) => item.id !== child.id,
                                        ),
                                      }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            A row with no sub-values sells on its own. Sub-values belong to that row only, so Black
            can offer two sizes while Bone offers three.
          </p>
        </>
      ) : null}
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  width,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width: string;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={"h-7 rounded-md border border-border px-2 text-xs " + width}
    />
  );
}

function Preview({
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
