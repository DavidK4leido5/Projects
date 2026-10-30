"use client";

import { Archive, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";

export function AccountActions({
  name,
  archived,
  onEdit,
  onToggleArchived,
}: {
  name: string;
  archived: boolean;
  onEdit: () => void;
  onToggleArchived: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={"Actions for " + name}>
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem icon={<Pencil />} onSelect={onEdit}>
          Edit account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={archived ? <RotateCcw /> : <Archive />} onSelect={onToggleArchived}>
          {archived ? "Restore account" : "Archive account"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
