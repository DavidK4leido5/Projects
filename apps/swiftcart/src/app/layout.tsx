import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Every route reads the session, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SwiftCart", template: "%s | SwiftCart" },
  description: "A storefront where independent stores list what they sell.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">
        <SiteHeader />
        {children}
        <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-neutral-500">
          SwiftCart demo. No payments, no orders, no real transactions.
        </footer>
      </body>
    </html>
  );
}
