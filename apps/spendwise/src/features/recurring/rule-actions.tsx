"use client";

import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
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
import type { RecurringRuleRow } from "@/features/recurring/queries";
import { RuleDialog, type RuleFormValues } from "@/features/recurring/rule-dialog";
import { toFormSource } from "@/features/recurring/rule-meta";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

export function RuleActions({
  rule,
  accounts,
  categories,
  currency,
  locale,
  onSave,
  onToggle,
  onDelete,
}: {
  rule: RecurringRuleRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
  onSave: (values: RuleFormValues) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={"Actions for " + rule.payee}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)} icon={<Pencil aria-hidden />}>
            Edit rule
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onToggle}
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
          onSave={onSave}
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
        onConfirm={onDelete}
      />
    </>
  );
}
