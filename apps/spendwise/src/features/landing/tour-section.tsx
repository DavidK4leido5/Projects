import { SectionHeading } from "@repo/ui";
import { tour } from "@/features/landing/content";
import { Section } from "@/features/landing/section";
import { ProductTour } from "@/features/landing/preview/product-tour";
import { DashboardPreview } from "@/features/landing/preview/dashboard-preview";

export function TourSection() {
  return (
    <Section id="tour" labelledBy="tour-title">
      <SectionHeading
        id="tour-title"
        title="A closer look at the product."
        description={tour.description}
      />
      <div className="mt-12">
        <ProductTour dashboard={<DashboardPreview />} />
      </div>
    </Section>
  );
}
