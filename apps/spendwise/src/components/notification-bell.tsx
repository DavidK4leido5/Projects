"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { formatNotificationDate } from "@/features/notifications/format";
import { cn } from "@repo/shared";
import { markAllRead, markRead } from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/queries";
import { setNotificationUnread, useNotificationUnread } from "@/lib/hooks";

/**
 * Bell + unread badge. Renders from server-supplied data, then keeps its own
 * copy so marking read updates instantly without a full page refresh.
 */
export function NotificationBell({
  initialUnreadCount,
  recent,
  locale = "en-PH",
}: {
  initialUnreadCount: number;
  recent: NotificationItem[];
  locale?: string;
}) {
  const [open, setOpen] = useState(false);
  const unread = useNotificationUnread(initialUnreadCount);
  const [items, setItems] = useState(recent);
  const [pending, startTransition] = useTransition();

  function readOne(item: NotificationItem): void {
    setOpen(false);
    if (item.readAt) return;

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date() } : entry)),
    );
    setNotificationUnread(unread - 1);

    void markRead(item.id).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  function readAll(): void {
    startTransition(async () => {
      const result = await markAllRead();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems((current) =>
        current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date() })),
      );
      setNotificationUnread(0);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? "Notifications, " + unread + " unread" : "Notifications"}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 tabular-nums text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" aria-label="Notifications" className="w-[min(20rem,90vw)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={readAll}
            disabled={pending || unread === 0}
            aria-label="Mark all notifications read"
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link
                  href="/notifications"
                  onClick={() => readOne(item)}
                  className="flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      item.readAt ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="line-clamp-2 block text-xs text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                      {formatNotificationDate(item.createdAt, locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-1">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
