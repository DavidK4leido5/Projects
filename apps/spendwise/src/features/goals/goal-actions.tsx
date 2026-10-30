"use client";

import { Archive, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import type { GoalStatus } from "@/features/goals/queries";

export function GoalActions({
  name,
  status,
  onComplete,
  onArchive,
  onDelete,
}: {
  name: string;
  status: GoalStatus;
  onComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={"Actions for " + name}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "active" ? (
            <DropdownMenuItem onSelect={onComplete} icon={<CheckCircle2 aria-hidden />}>
              Mark complete
            </DropdownMenuItem>
          ) : null}
          {status !== "archived" ? (
            <DropdownMenuItem onSelect={onArchive} icon={<Archive aria-hidden />}>
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
        onConfirm={onDelete}
      />
    </>
  );
}

export function ContributionDelete({ onDelete }: { onDelete: () => void }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete contribution"
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      }
      title="Delete this contribution?"
      description="The amount is removed from this goal's total."
      confirmLabel="Delete"
      onConfirm={onDelete}
    />
  );
}
