import type { Metadata } from "next";
import { PageHeader } from "@repo/ui";
import { NotificationList } from "@/features/notifications/notification-list";
import { listNotifications } from "@/features/notifications/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
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
