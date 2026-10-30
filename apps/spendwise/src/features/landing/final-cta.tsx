import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@repo/ui";
import { finalCta } from "@/features/landing/content";
import { Section } from "@/features/landing/section";

export function FinalCtaSection() {
  return (
    <Section labelledBy="cta-title" className="border-t-0">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full border border-primary-foreground/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full border border-primary-foreground/10"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2
            id="cta-title"
            className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
            {finalCta.description}
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-7">
            <Link href={finalCta.cta.href}>
              {finalCta.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-primary-foreground/75">
            <Check className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
            {finalCta.reassurance}
          </p>
        </div>
      </div>
    </Section>
  );
}
