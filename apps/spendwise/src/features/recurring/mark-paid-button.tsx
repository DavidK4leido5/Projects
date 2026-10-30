"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { markPaid } from "@/features/recurring/actions";

export function MarkPaidButton({ ruleId, payee }: { ruleId: string; payee: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pay(): void {
    startTransition(async () => {
      const result = await markPaid(ruleId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked " + payee + " as paid");
      router.refresh();
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={pay} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Check className="size-4" aria-hidden />
      )}
      Mark as paid
    </Button>
  );
}
