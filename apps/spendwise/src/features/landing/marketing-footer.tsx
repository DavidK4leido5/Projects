import Link from "next/link";
import { Brand } from "@/features/landing/brand";
import { footer, site } from "@/features/landing/content";

const COPYRIGHT_YEAR = 2026;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_2fr]">
        <div className="max-w-xs">
          <Brand />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{footer.tagline}</p>
          <p className="mt-6 text-xs text-muted-foreground">{footer.note}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {COPYRIGHT_YEAR} {site.name}. All rights reserved.
          </p>
          <p>Email and password only. No bank or payment connections.</p>
        </div>
      </div>
    </footer>
  );
}
