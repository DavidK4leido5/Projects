"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
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
import { createCategory, updateCategory } from "@/features/categories/actions";
import type { CategoryNode } from "@/features/categories/queries";

const schema = categoryInputSchema
  .pick({ name: true, kind: true, color: true })
  .extend({ parentId: z.string() });

type Values = z.infer<typeof schema>;

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

function descendantIds(node: CategoryNode): string[] {
  return node.children.flatMap((child) => [child.id, ...descendantIds(child)]);
}

export function CategoryDialog({
  categories,
  category,
  defaultKind = "expense",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  categories: CategoryNode[];
  category?: CategoryNode;
  defaultKind?: CategoryKind;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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
  const excluded = category ? [category.id, ...descendantIds(category)] : [];
  const parentOptions = categories.filter(
    (node) => node.kind === kind && !excluded.includes(node.id) && !node.archived,
  );

  function onSubmit(values: Values) {
    startTransition(async () => {
      const payload = {
        name: values.name,
        kind: values.kind,
        parentId: values.parentId || null,
        color: values.color,
        icon: category?.icon ?? "tag",
      };
      const result = category
        ? await updateCategory({ ...payload, id: category.id })
        : await createCategory(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(category ? "Category updated" : "Category added");
      if (!category) form.reset({ name: "", kind: values.kind, parentId: "", color: "slate" });
      setOpen(false);
      router.refresh();
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
            id="category-form"
            onSubmit={form.handleSubmit(onSubmit)}
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
                      disabled={Boolean(category)}
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
          <Button type="submit" form="category-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : category ? "Save changes" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
