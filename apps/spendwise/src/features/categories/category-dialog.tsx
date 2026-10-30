"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  categoryColors,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { categoryInputSchema } from "@repo/finance";
import { cn } from "@repo/shared";
import type { CategoryKind } from "@repo/db/schema";
import { descendantCategoryIds, type FlatCategory } from "@/features/categories/category-tree";

const schema = categoryInputSchema
  .pick({ name: true, kind: true, color: true })
  .extend({ parentId: z.string() });

type Values = z.infer<typeof schema>;

export type CategoryFormValues = {
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  color: string;
  icon: string;
};

const DOT_CLASSES: Record<string, string> = {
  emerald: "bg-chart-1",
  teal: "bg-primary",
  sky: "bg-chart-4",
  indigo: "bg-chart-2",
  violet: "bg-chart-5",
  rose: "bg-negative",
  amber: "bg-chart-3",
  orange: "bg-destructive",
  slate: "bg-muted-foreground",
};

export function CategoryDialog({
  categories,
  category,
  defaultKind = "expense",
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSubmit: onCategorySubmit,
}: {
  categories: FlatCategory[];
  category?: FlatCategory;
  defaultKind?: CategoryKind;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (values: CategoryFormValues) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const formId = useId();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? {
          name: category.name,
          kind: category.kind,
          parentId: category.parentId ?? "",
          color: category.color,
        }
      : { name: "", kind: defaultKind, parentId: "", color: "slate" },
  });

  const kind = useWatch({ control: form.control, name: "kind" });
  const excluded = category ? descendantCategoryIds(categories, category.id) : new Set<string>();
  const parentOptions = categories.filter(
    (node) =>
      node.kind === kind && node.parentId === null && !excluded.has(node.id) && !node.archived,
  );

  function submit(values: Values) {
    setOpen(false);
    if (!category) {
      form.reset({ name: "", kind: values.kind, parentId: "", color: "slate" });
    }
    onCategorySubmit({
      name: values.name,
      kind: values.kind,
      parentId: values.parentId || null,
      color: values.color,
      icon: category?.icon ?? "tag",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Group transactions so budgets and reports can tell them apart.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(submit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Groceries" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(next) => {
                        field.onChange(next);
                        form.setValue("parentId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent (optional)</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No parent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent</SelectItem>
                        {parentOptions.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div
                    role="radiogroup"
                    aria-label="Category color"
                    className="flex flex-wrap gap-2"
                  >
                    {categoryColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={field.value === color}
                        aria-label={color}
                        onClick={() => field.onChange(color)}
                        className={cn(
                          "grid size-8 place-items-center rounded-full border transition-colors",
                          field.value === color
                            ? "border-foreground ring-2 ring-ring"
                            : "border-border hover:border-foreground/40",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn("size-3.5 rounded-full", DOT_CLASSES[color])}
                        />
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form={formId}>
            {category ? "Save changes" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
