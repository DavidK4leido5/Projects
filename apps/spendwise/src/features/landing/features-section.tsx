import { FeatureCard, SectionHeading } from "@repo/ui";
import { features } from "@/features/landing/content";
import { landingIcons } from "@/features/landing/icons";
import { Section } from "@/features/landing/section";
import {
  AccountsVisual,
  BillsVisual,
  BudgetsVisual,
  CashFlowVisual,
  CsvVisual,
  GoalsVisual,
  InsightsVisual,
  ReportsVisual,
  TransactionsVisual,
} from "@/features/landing/preview/feature-visuals";

const visuals = {
  transactions: <TransactionsVisual />,
  cashflow: <CashFlowVisual />,
  budgets: <BudgetsVisual />,
  goals: <GoalsVisual />,
  recurring: <BillsVisual />,
  accounts: <AccountsVisual />,
  insights: <InsightsVisual />,
  reports: <ReportsVisual />,
  csv: <CsvVisual />,
} as const;

export function FeaturesSection() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeading
        id="features-title"
        title="Everything you need to keep a clear record."
        description="No bank connections, no payment processing. Just the parts of personal finance that help you see what happened and decide what is next."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = landingIcons[feature.icon];
          return (
            <FeatureCard
              key={feature.id}
              icon={<Icon className="size-5" aria-hidden />}
              title={feature.title}
              description={feature.description}
              className={feature.span === "wide" ? "lg:col-span-2" : undefined}
            >
              {visuals[feature.id]}
            </FeatureCard>
          );
        })}
      </div>
    </Section>
  );
}
