"use client";

import type { ReactNode } from "react";
import { useNavigationPending } from "@/lib/navigation-pending";

type ResultsRegionProps = {
  id?: string;
  className?: string;
  skeleton: ReactNode;
  children: ReactNode;
};

/**
 * The one place a list becomes its skeleton. The wrapper keeps the same id and
 * classes in both states, so starting a navigation never reflows the page.
 */
export function ResultsRegion({ id, className, skeleton, children }: ResultsRegionProps) {
  const pending = useNavigationPending();

  return (
    <div id={id} className={className} aria-busy={pending}>
      {pending ? skeleton : children}
    </div>
  );
}
