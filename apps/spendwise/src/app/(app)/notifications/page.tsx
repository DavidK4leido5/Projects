import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@repo/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { NotificationList } from "@/features/notifications/notification-list";
import { listNotifications } from "@/features/notifications/queries";
import { syncReminders } from "@/features/notifications/sync";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotificationsBody />
    </Suspense>
  );
}

async function NotificationsBody() {
  const user = await requireUser();
  // The header sync runs in parallel with this page; wait for it so the list
  // and the bell see the same generated reminders.
  await syncReminders(user.id);
  const [items, settings] = await Promise.all([
    listNotifications(user.id, 50),
    getSettings(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Bills due soon, budgets over their limit, and system notes."
      />
      <NotificationList initial={items} locale={settings.locale} />
    </div>
  );
}
