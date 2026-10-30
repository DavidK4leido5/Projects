import type { ReactNode } from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider, Skeleton } from "@repo/ui";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { getNotificationBellData } from "@/features/notifications/queries";
import { syncReminders } from "@/features/notifications/sync";
import { QuickAddTransaction } from "@/features/transactions/quick-add";
import { listTransactionOptions } from "@/features/transactions/queries";
import { ensureUserSetup } from "@/features/settings/queries";
import { getAuthUser } from "@/lib/auth/session";

/**
 * Static shell: navigation, main and the mobile bar render for everyone. The
 * request-time bits (session, reminders, header menu, quick-add options) stream
 * into their own Suspense slots and never hold back page content.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Suspense fallback={<AppHeaderSkeleton />}>
          <HeaderSlot />
        </Suspense>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12"
        >
          {children}
        </main>
      </SidebarInset>
      <BottomNav />
      <Suspense fallback={null}>
        <QuickAddSlot />
      </Suspense>
    </SidebarProvider>
  );
}

async function HeaderSlot() {
  // The proxy and every page's requireUser already guard the route, so a
  // signed-out visitor simply gets no header rather than a redirect here.
  const user = await getAuthUser();
  if (!user) return null;

  // Reminders must land before the bell reads them.
  await syncReminders(user.id);

  const [settings, notifications] = await Promise.all([
    ensureUserSetup(user.id),
    getNotificationBellData(user.id),
  ]);

  return (
    <AppHeader
      name={user.name}
      email={user.email}
      notifications={
        <NotificationBell
          initialUnreadCount={notifications.unread}
          recent={notifications.recent}
          locale={settings.locale}
        />
      }
    />
  );
}

async function QuickAddSlot() {
  const user = await getAuthUser();
  if (!user) return null;

  const [options, settings] = await Promise.all([
    listTransactionOptions(user.id),
    ensureUserSetup(user.id),
  ]);

  return (
    <QuickAddTransaction
      accounts={options.accounts}
      categories={options.categories}
      currency={settings.currency}
    />
  );
}

/** Mirrors AppHeader's frame so the header never shifts when it streams in. */
function AppHeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="hidden h-7 w-7 rounded-md md:block" />
      <Skeleton className="mr-1 hidden h-4 w-px md:block" />
      <Skeleton className="h-4 w-24 md:hidden" />
      <div className="ml-auto flex items-center gap-1">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </header>
  );
}
