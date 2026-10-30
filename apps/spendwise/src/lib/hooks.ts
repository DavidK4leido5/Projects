"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

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
