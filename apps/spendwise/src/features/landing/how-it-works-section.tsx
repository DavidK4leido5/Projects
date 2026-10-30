import { SectionHeading, StepCard } from "@repo/ui";
import { steps } from "@/features/landing/content";
import { Section } from "@/features/landing/section";
import {
  AccountsVisual,
  ReportsVisual,
  TransactionsVisual,
} from "@/features/landing/preview/feature-visuals";

const visuals = [
  <AccountsVisual key="accounts" />,
  <TransactionsVisual key="transactions" />,
  <ReportsVisual key="reports" />,
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" labelledBy="how-title" className="bg-muted/20">
      <SectionHeading
        id="how-title"
        title="Three steps to a record you can trust."
        description="The app stays out of the way. Add what happened, set a few limits, and let the totals do the rest."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <StepCard
            key={step.number}
            number={step.number}
            title={step.title}
            description={step.description}
          >
            {visuals[index]}
          </StepCard>
        ))}
      </div>
    </Section>
  );
}
