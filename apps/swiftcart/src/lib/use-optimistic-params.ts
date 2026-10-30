"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useRef } from "react";
import { useSettlePending, useUrlCommit } from "@/lib/hooks";
import { beginPending, useNavigationPending } from "@/lib/navigation-pending";
import {
  CATALOGUE_PATH,
  catalogueHref,
  readCatalogueParams,
  type CatalogueParams,
} from "@/lib/search-params";

/**
 * One navigation primitive for catalogue controls. The URL is the state, so the
 * hook only builds the next href, raises the shared pending flag, and drops it
 * once the URL it asked for is the URL in use.
 */
export function useOptimisticParams(): {
  navigate: (params: CatalogueParams, mode?: "push" | "replace") => void;
  pending: boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pending = useNavigationPending();
  // The router may land the new URL with the window back at the top. The user
  // was reading the list, not asking to go home, so the offset is restored once
  // the new rows exist.
  const keptScroll = useRef<number | null>(null);

  const urlKey = searchParams.toString();
  // Keyed on the URL, not on the values that produced it: the skeleton is up
  // until the router lands, whether the server was fast or never answered.
  useSettlePending(urlKey);

  useUrlCommit(urlKey, () => {
    const restore = keptScroll.current;
    keptScroll.current = null;
    if (restore === null) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: restore, behavior: "auto" });
    });
  });

  function navigate(params: CatalogueParams, mode: "push" | "replace" = "push") {
    const href = catalogueHref(params);
    // A no-op push on the catalogue starts a skeleton no URL change can clear.
    // Elsewhere the path itself is the change, so the same href still navigates.
    if (pathname === CATALOGUE_PATH && href === catalogueHref(readCatalogueParams(searchParams))) {
      return;
    }

    keptScroll.current = window.scrollY;
    beginPending();
    startTransition(() => {
      router[mode](href, { scroll: false });
    });
  }

  return { navigate, pending };
}
