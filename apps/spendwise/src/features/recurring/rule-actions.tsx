"use client";

import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
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
import { deleteRule, toggleRule } from "@/features/recurring/actions";
import { RuleDialog } from "@/features/recurring/rule-dialog";
import { toFormSource } from "@/features/recurring/rule-meta";
import type { RecurringRuleRow } from "@/features/recurring/queries";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

export function RuleActions({
  rule,
  accounts,
  categories,
  currency,
  locale,
}: {
  rule: RecurringRuleRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function toggle(): void {
    startTransition(async () => {
      const result = await toggleRule(rule.id, !rule.active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((rule.active ? "Paused " : "Resumed ") + rule.payee);
      router.refresh();
    });
  }

  async function remove(): Promise<void> {
    const result = await deleteRule(rule.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Deleted " + rule.payee);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={"Actions for " + rule.payee}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)} icon={<Pencil aria-hidden />}>
            Edit rule
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={toggle}
            icon={rule.active ? <Pause aria-hidden /> : <Play aria-hidden />}
          >
            {rule.active ? "Pause rule" : "Resume rule"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => setConfirming(true)}
            icon={<Trash2 aria-hidden />}
          >
            Delete rule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editing ? (
        <RuleDialog
          open
          onOpenChange={(open) => setEditing(open)}
          rule={toFormSource(rule)}
          accounts={accounts}
          categories={categories}
          currency={currency}
          locale={locale}
        />
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this rule?"
        description={
          "Transactions already posted stay in your history. " +
          rule.payee +
          " will stop appearing in upcoming bills."
        }
        confirmLabel="Delete rule"
        onConfirm={remove}
        pending={pending}
      />
    </>
  );
}
