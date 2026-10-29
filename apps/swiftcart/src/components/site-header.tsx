import Link from "next/link";
import { Button } from "@repo/ui";
import { signOut } from "@/features/stores/actions";
import { getCurrentStore } from "@/lib/auth";

export async function SiteHeader() {
  const store = await getCurrentStore();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          SwiftCart
        </Link>
        <nav className="flex items-center gap-5 text-sm text-neutral-600">
          <Link href="/" className="transition-colors hover:text-neutral-900">
            Shop
          </Link>
          {store ? (
            <>
              <Link href="/dashboard" className="transition-colors hover:text-neutral-900">
                Dashboard
              </Link>
              <form action={signOut}>
                <Button variant="ghost" type="submit" className="px-2 py-1">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="transition-colors hover:text-neutral-900">
                Sign in
              </Link>
              <Link href="/signup">
                <Button className="px-3 py-1.5">Start selling</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
