"use client";

import { Archive, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import type { ActionResult } from "@/lib/action";
import {
  archiveGoal,
  completeGoal,
  deleteContribution,
  deleteGoal,
} from "@/features/goals/actions";
import type { GoalStatus } from "@/features/goals/queries";

export function GoalActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: GoalStatus;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label={"Actions for " + name}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "active" ? (
            <DropdownMenuItem
              onSelect={() => run(() => completeGoal(id), "Marked " + name + " complete")}
              icon={<CheckCircle2 aria-hidden />}
            >
              Mark complete
            </DropdownMenuItem>
          ) : null}
          {status !== "archived" ? (
            <DropdownMenuItem
              onSelect={() => run(() => archiveGoal(id), "Archived " + name)}
              icon={<Archive aria-hidden />}
            >
              Archive
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            destructive
            icon={<Trash2 aria-hidden />}
          >
            Delete goal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={"Delete " + name + "?"}
        description="The goal is removed from your list. Its contribution history is kept but no longer shown."
        confirmLabel="Delete goal"
        onConfirm={() => run(() => deleteGoal(id), "Deleted " + name)}
      />
    </>
  );
}

export function ContributionDelete({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteContribution(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contribution removed");
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
          aria-label="Delete contribution"
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      }
      title="Delete this contribution?"
      description="The amount is removed from this goal's total."
      confirmLabel="Delete"
      onConfirm={remove}
      pending={pending}
    />
  );
}
