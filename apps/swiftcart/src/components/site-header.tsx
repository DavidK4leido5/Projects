import Link from "next/link";
import { Button } from "@repo/ui";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth/guards";

export async function SiteHeader() {
  const actor = await getActor();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          SwiftCart
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/" className="transition-colors hover:text-neutral-900">
            Shop
          </Link>

          {actor.kind === "admin" ? (
            <Link href="/admin" className="transition-colors hover:text-neutral-900">
              Admin
            </Link>
          ) : null}

          {actor.kind === "store" ? (
            <Link href="/dashboard" className="transition-colors hover:text-neutral-900">
              Dashboard
            </Link>
          ) : null}

          {actor.kind === "user" ? (
            <>
              <Link href="/orders" className="transition-colors hover:text-neutral-900">
                Orders
              </Link>
              <Link href="/cart" className="transition-colors hover:text-neutral-900">
                Cart
              </Link>
            </>
          ) : null}

          {actor.kind === "anonymous" ? (
            <>
              <Link href="/login" className="transition-colors hover:text-neutral-900">
                Sign in
              </Link>
              <Link href="/signup/store">
                <Button className="px-3 py-1.5">Open a store</Button>
              </Link>
            </>
          ) : (
            <SignOutButton />
          )}
        </nav>
      </div>
    </header>
  );
}
