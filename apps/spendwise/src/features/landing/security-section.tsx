import { SectionHeading } from "@repo/ui";
import { security } from "@/features/landing/content";
import { landingIcons } from "@/features/landing/icons";
import { Section } from "@/features/landing/section";

export function SecuritySection() {
  return (
    <Section id="security" labelledBy="security-title">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeading
          id="security-title"
          title={security.title}
          description="A record book holds sensitive numbers. The defaults should make that obvious."
          align="left"
        />

        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {security.points.map((point) => {
            const Icon = landingIcons[point.icon];
            return (
              <div key={point.title} className="border-t border-border pt-5">
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-4 text-sm font-medium">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
