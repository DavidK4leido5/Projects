"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Separator, SidebarTrigger } from "@repo/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { titleForPath } from "@/components/nav-items";
import { UserMenu } from "@/components/user-menu";

export function AppHeader({
  name,
  email,
  notifications,
}: {
  name: string;
  email: string;
  notifications?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="-ml-1 hidden md:inline-flex" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 md:block" />
      <p className="flex-1 truncate text-sm font-medium md:hidden">{titleForPath(pathname)}</p>
      <div className="flex items-center gap-1">
        {notifications}
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
