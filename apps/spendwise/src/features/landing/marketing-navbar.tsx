"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";
import { Brand } from "@/features/landing/brand";
import { nav, site } from "@/features/landing/content";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingNavbar({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.links.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={nav.dashboard.href}>
                {nav.dashboard.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={nav.login.href}>{nav.login.label}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={nav.signup.href}>{nav.signup.label}</Link>
              </Button>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={nav.menuLabel}>
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <SheetHeader className="border-b border-border px-5 py-5 text-left">
                <SheetTitle asChild>
                  <Brand />
                </SheetTitle>
                <SheetDescription className="sr-only">{site.name} navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-4">
                {nav.links.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link
                      href={link.href}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
                {signedIn ? (
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href={nav.dashboard.href}>
                        {nav.dashboard.label}
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button asChild>
                        <Link href={nav.signup.href}>{nav.signup.label}</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild variant="outline">
                        <Link href={nav.login.href}>{nav.login.label}</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
