"use client";

import { useSyncExternalStore } from "react";

/**
 * A media query as state. The browser owns the answer, so this subscribes to it
 * instead of mirroring it into state from an effect. The server snapshot is
 * always false: the narrow layout is the safe default before hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
