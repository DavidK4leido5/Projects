import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@repo/ui";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { getNotificationBellData } from "@/features/notifications/queries";
import { syncReminders } from "@/features/notifications/sync";
import { QuickAddTransaction } from "@/features/transactions/quick-add";
import { listTransactionOptions } from "@/features/transactions/queries";
import { ensureUserSetup } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const settings = await ensureUserSetup(user.id);
  await syncReminders(user.id);

  const [options, notifications] = await Promise.all([
    listTransactionOptions(user.id),
    getNotificationBellData(user.id),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12"
        >
          {children}
        </main>
      </SidebarInset>
      <BottomNav />
      <QuickAddTransaction
        accounts={options.accounts}
        categories={options.categories}
        currency={settings.currency}
      />
    </SidebarProvider>
  );
}
