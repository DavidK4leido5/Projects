import Link from "next/link";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Badge, Button, SectionHeading } from "@repo/ui";
import { reportShowcase } from "@/features/landing/content";
import { Section } from "@/features/landing/section";
import { ReportPaper } from "@/features/landing/preview/report-paper";

export function ReportSection() {
  return (
    <Section id="reports" labelledBy="reports-title" className="bg-muted/20">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <SectionHeading
            id="reports-title"
            title={reportShowcase.title}
            description={reportShowcase.description}
            align="left"
          />

          <ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {reportShowcase.types.map((type) => (
              <li key={type} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {type}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-2">
            {reportShowcase.options.map((option) => (
              <Badge key={option} variant="secondary" className="font-normal">
                {option}
              </Badge>
            ))}
          </div>

          <p className="mt-7 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {reportShowcase.note}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/signup">
                <FileText className="size-4" aria-hidden />
                Build a report
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Sample data shown below.</span>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_center,var(--accent),transparent_70%)]"
          />
          <div className="lg:-rotate-1 lg:transition-transform lg:duration-500 lg:hover:rotate-0">
            <ReportPaper />
          </div>
        </div>
      </div>
    </Section>
  );
}
