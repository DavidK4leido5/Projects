"use client";

import { Archive, MoreHorizontal, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { setAccountArchived } from "@/features/accounts/actions";

export function AccountActions({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setAccountArchived(id, !archived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((archived ? "Restored " : "Archived ") + name);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label={"Actions for " + name}>
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={toggle}>
          {archived ? (
            <RotateCcw className="size-4" aria-hidden />
          ) : (
            <Archive className="size-4" aria-hidden />
          )}
          {archived ? "Restore account" : "Archive account"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
