"use client";

import { Copy, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, ConfirmDialog } from "@repo/ui";
import { copyBudgetsFromPreviousMonth, deleteBudget } from "@/features/budgets/actions";

export function BudgetDelete({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteBudget(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted the " + name + " budget");
      router.refresh();
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={"Delete the " + name + " budget"}
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      }
      title={"Delete the " + name + " budget?"}
      description="Spending and transactions stay. Only the monthly limit is removed."
      confirmLabel="Delete budget"
      onConfirm={remove}
      pending={pending}
    />
  );
}

export function CopyBudgetsButton({ month }: { month: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const result = await copyBudgetsFromPreviousMonth(month);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.count === 0) {
        toast.info("Nothing left to copy from last month.");
        return;
      }
      toast.success(
        "Copied " + result.data.count + (result.data.count === 1 ? " budget" : " budgets"),
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" onClick={copy} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      Copy last month
    </Button>
  );
}
