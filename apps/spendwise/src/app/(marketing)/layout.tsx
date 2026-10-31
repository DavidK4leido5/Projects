import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { getAuthUser } from "@/lib/auth/session";
import { MarketingFooter } from "@/features/landing/marketing-footer";
import { MarketingNavbar } from "@/features/landing/marketing-navbar";
import { site } from "@/features/landing/content";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${site.domain}`;
const pageTitle = site.name + " | " + site.tagline;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { absolute: pageTitle },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: pageTitle,
    description: site.description,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to content
      </a>
      <Suspense fallback={<MarketingNavbar signedIn={false} />}>
        <MarketingNav />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

async function MarketingNav() {
  const user = await getAuthUser();
  return <MarketingNavbar signedIn={Boolean(user)} />;
}
