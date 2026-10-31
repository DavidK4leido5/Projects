import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BrowserFrame, Button } from "@repo/ui";
import { hero, site } from "@/features/landing/content";
import { GlassFold } from "@/features/landing/glass-fold";
import { DashboardPreview } from "@/features/landing/preview/dashboard-preview";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 [mask-image:linear-gradient(to_bottom,var(--foreground),transparent)]"
      />
      <GlassFold />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="landing-enter mx-auto max-w-3xl text-center">
          <h1
            id="hero-title"
            className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl"
          >
            {hero.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {hero.subheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={hero.primaryCta.href}>
                {hero.primaryCta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href={hero.secondaryCta.href}>{hero.secondaryCta.label}</Link>
            </Button>
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <Check className="mr-1.5 inline size-4 align-[-3px] text-primary" aria-hidden />
            {hero.reassurance}
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl sm:mt-20">
          <div
            role="img"
            aria-label="Preview of the Dalorro dashboard showing total balance, income, expenses, cash flow, spending by category, budgets, goals, and upcoming bills."
            className="landing-enter-late relative mx-auto max-w-5xl"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:[transform:perspective(1800px)_rotateX(1.2deg)]">
              <BrowserFrame
                url={site.domain + "/dashboard"}
                contentClassName="max-h-[560px] overflow-hidden sm:max-h-[680px]"
                fade
              >
                <DashboardPreview />
              </BrowserFrame>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            A sample six-month history. Your numbers will look like yours.
          </p>
        </div>
      </div>
    </section>
  );
}
