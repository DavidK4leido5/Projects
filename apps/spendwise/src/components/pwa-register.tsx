"use client";

import { useServiceWorker } from "@/lib/hooks";

/** Registers the offline shell in production builds. No UI. */
export function PwaRegister() {
  useServiceWorker();
  return null;
}
