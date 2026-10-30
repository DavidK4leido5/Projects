"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Settles on a value only after it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

/** True after hydration, without an effect-driven second render. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Tailwind's md breakpoint, synced straight from matchMedia. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Object URL for a freshly picked file. The URL is revoked when it is replaced
 * or the component unmounts, so previews never leak blob memory.
 */
export function useObjectUrl(): [string | null, (file: File | null) => void] {
  const [url, setUrl] = useState<string | null>(null);
  const active = useRef<string | null>(null);

  const select = useCallback((file: File | null) => {
    if (active.current) URL.revokeObjectURL(active.current);
    active.current = file ? URL.createObjectURL(file) : null;
    setUrl(active.current);
  }, []);

  useEffect(() => {
    return () => {
      if (active.current) URL.revokeObjectURL(active.current);
      active.current = null;
    };
  }, []);

  return [url, select];
}

/** Calls back on a bare key press unless the user is typing in a field. */
export function useKeyboardShortcut(key: string, onTrigger: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        onTrigger();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, onTrigger]);
}

/**
 * Opens when a URL flag is present (for example ?new=1). Closing removes the
 * flag, so a refresh does not reopen the dialog. No effect needed: the URL is
 * the source of truth.
 */
export function useOpenFromParam(param: string): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [manualOpen, setManualOpen] = useState(false);
  const fromUrl = params.get(param) === "1";

  const setOpen = useCallback(
    (next: boolean) => {
      setManualOpen(next);
      if (!next && fromUrl) {
        const query = new URLSearchParams(params.toString());
        query.delete(param);
        const rest = query.toString();
        router.replace(rest ? pathname + "?" + rest : pathname, { scroll: false });
      }
    },
    [fromUrl, param, params, pathname, router],
  );

  return [manualOpen || fromUrl, setOpen];
}
/** Registers the offline shell once in production. */
export function useServiceWorker(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
}
let unreadCount: number | null = null;
const unreadListeners = new Set<() => void>();

/** Shared optimistic unread count for the header bell and the inbox. */
export function setNotificationUnread(count: number): void {
  unreadCount = Math.max(0, count);
  for (const listener of unreadListeners) listener();
}

export function incrementNotificationUnread(): void {
  if (unreadCount === null) return;
  setNotificationUnread(unreadCount + 1);
}

export function useNotificationUnread(initial: number): number {
  const value = useSyncExternalStore(
    (listener) => {
      unreadListeners.add(listener);
      return () => unreadListeners.delete(listener);
    },
    () => unreadCount ?? initial,
    () => initial,
  );

  useEffect(() => {
    // Initialize once. After an optimistic clear, remounting the header must
    // not resurrect the stale server count from a cached RSC payload.
    if (unreadCount === null) setNotificationUnread(initial);
  }, [initial]);

  return value;
}
/** Subscribes to one named SSE event and keeps the latest handler. */
export function useServerSentEvent<T>(
  url: string,
  eventName: string,
  onEvent: (data: T) => void,
): void {
  const latest = useRef(onEvent);

  useEffect(() => {
    latest.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(url);
    const handler = (event: MessageEvent) => {
      try {
        latest.current(JSON.parse(event.data) as T);
      } catch {
        // ignore malformed frames
      }
    };
    source.addEventListener(eventName, handler);
    return () => {
      source.removeEventListener(eventName, handler);
      source.close();
    };
  }, [url, eventName]);
}
