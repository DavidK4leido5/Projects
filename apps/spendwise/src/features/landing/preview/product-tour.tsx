"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BrowserFrame, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { site, tour } from "@/features/landing/content";

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

const TourTransactions = dynamic(
  () => import("./tour-transactions").then((module) => module.TourTransactions),
  { loading: PanelSkeleton },
);

const TourCashFlow = dynamic(
  () => import("./tour-cash-flow").then((module) => module.TourCashFlow),
  { loading: PanelSkeleton },
);

const TourBudgets = dynamic(() => import("./tour-budgets").then((module) => module.TourBudgets), {
  loading: PanelSkeleton,
});

const TourReports = dynamic(() => import("./tour-reports").then((module) => module.TourReports), {
  loading: PanelSkeleton,
});

const PANEL_URL: Record<string, string> = {
  dashboard: site.domain + "/dashboard",
  transactions: site.domain + "/transactions",
  "cash-flow": site.domain + "/cash-flow",
  budgets: site.domain + "/budgets",
  reports: site.domain + "/reports",
};

export function ProductTour({ dashboard }: { dashboard: React.ReactNode }) {
  const [active, setActive] = useState("dashboard");
  const caption = tour.tabs.find((tab) => tab.id === active)?.caption ?? tour.description;

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full gap-3">
      <div className="w-full overflow-x-auto">
        <TabsList className="w-max" aria-label="Product tour">
          {tour.tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <BrowserFrame
        url={PANEL_URL[active] ?? PANEL_URL.dashboard ?? site.domain + "/dashboard"}
        className="w-full"
        fade
      >
        <TabsContent value="dashboard" className="m-0">
          {dashboard}
        </TabsContent>
        <TabsContent value="transactions" className="m-0">
          <TourTransactions />
        </TabsContent>
        <TabsContent value="cash-flow" className="m-0">
          <TourCashFlow />
        </TabsContent>
        <TabsContent value="budgets" className="m-0">
          <TourBudgets />
        </TabsContent>
        <TabsContent value="reports" className="m-0">
          <TourReports />
        </TabsContent>
      </BrowserFrame>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground" aria-live="polite">
          {caption}
        </p>
      </div>
    </Tabs>
  );
}
