import { landingIcons } from "@/features/landing/icons";
import { trust } from "@/features/landing/content";

export function TrustStrip() {
  return (
    <section aria-label="What you can expect" className="border-y border-border/70 bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-px px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {trust.map((item) => {
          const Icon = landingIcons[item.icon];
          return (
            <div key={item.title} className="flex items-start gap-3 px-0 py-3 sm:px-6 lg:px-0">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
