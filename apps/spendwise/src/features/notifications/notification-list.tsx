"use client";

import { useOptimistic, useTransition } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  Check,
  Info,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, EmptyState } from "@repo/ui";
import { setNotificationUnread } from "@/lib/hooks";
import { formatNotificationDate } from "@/features/notifications/format";
import { cn } from "@repo/shared";
import type { NotificationType } from "@repo/db/schema";
import { deleteNotification, markAllRead, markRead } from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/queries";

const TYPE_ICONS: Record<NotificationType, typeof Info> = {
  budget_alert: AlertTriangle,
  bill_due: CalendarClock,
  bill_overdue: AlertOctagon,
  goal_milestone: Target,
  system: Info,
};

type NotificationMutation =
  | { type: "read"; id: string; readAt: Date }
  | { type: "readAll"; readAt: Date }
  | { type: "remove"; id: string };

function reduce(items: NotificationItem[], action: NotificationMutation): NotificationItem[] {
  switch (action.type) {
    case "read":
      return items.map((item) =>
        item.id === action.id && item.readAt === null ? { ...item, readAt: action.readAt } : item,
      );
    case "readAll":
      return items.map((item) => (item.readAt ? item : { ...item, readAt: action.readAt }));
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

export function NotificationList({
  initial,
  locale = "en-PH",
}: {
  initial: NotificationItem[];
  locale?: string;
}) {
  const [items, apply] = useOptimistic(initial, reduce);
  const [, startMutation] = useTransition();
  const unread = items.filter((item) => item.readAt === null).length;

  function readOne(item: NotificationItem): void {
    if (item.readAt) return;
    const readAt = new Date();

    startMutation(async () => {
      apply({ type: "read", id: item.id, readAt });
      setNotificationUnread(unread - 1);
      const result = await markRead(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
    });
  }

  function readAll(): void {
    const readAt = new Date();

    startMutation(async () => {
      apply({ type: "readAll", readAt });
      setNotificationUnread(0);
      const result = await markAllRead();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
    });
  }

  function remove(item: NotificationItem): void {
    const wasUnread = item.readAt === null;

    startMutation(async () => {
      apply({ type: "remove", id: item.id });
      if (wasUnread) setNotificationUnread(unread - 1);
      const result = await deleteNotification(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Notification deleted");
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Info}
        title="Nothing here yet"
        description="Budget alerts and bills due show up here."
      />
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <p className="text-sm text-muted-foreground">
          {unread === 0 ? "All caught up" : unread + " unread"}
        </p>
        <Button variant="outline" size="sm" onClick={readAll} disabled={unread === 0}>
          <Check className="size-4" aria-hidden />
          Mark all read
        </Button>
      </div>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? Info;
            const isUnread = item.readAt === null;
            return (
              <li
                key={item.id}
                className={cn("flex items-start gap-3 p-4", isUnread && "bg-muted/40")}
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {isUnread ? (
                      <span className="size-2 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatNotificationDate(item.createdAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isUnread ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => readOne(item)}
                      aria-label={"Mark read: " + item.title}
                    >
                      <Check className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(item)}
                    aria-label={"Delete notification: " + item.title}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
