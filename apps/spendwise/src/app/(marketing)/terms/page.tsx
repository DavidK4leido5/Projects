import type { Metadata } from "next";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui";

export const metadata: Metadata = {
  title: { absolute: "Terms | SpendWise" },
  alternates: { canonical: "/terms" },
  description:
    "The terms that apply when you use SpendWise to record income, expenses, budgets, and goals.",
};

type Section = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

const sections: readonly Section[] = [
  {
    title: "The service",
    paragraphs: [
      "SpendWise is a personal record book. It stores the income, expenses, accounts, budgets, goals, and recurring bills you enter, then shows them back to you as summaries, charts, and reports.",
      "SpendWise is not a bank, a payment service, or a financial advisor. It does not move money, hold funds, connect to your bank accounts, or give investment, tax, or legal advice. Every figure in the app comes from what you enter, so the accuracy of a report depends on the accuracy of your entries.",
    ],
  },
  {
    title: "Your account",
    paragraphs: [
      "You sign in with an email address and a password. Keep the password to yourself, and use an address you can still reach, since password resets go there.",
      "You are responsible for activity under your account. If you think someone else has access, change your password and sign out of other sessions in Settings.",
      "You need to be old enough to enter a contract where you live, or have a parent or guardian agree to these terms for you.",
    ],
  },
  {
    title: "Your data",
    paragraphs: [
      "The records you enter stay yours. You give SpendWise permission to store and process them so the app can work for you, and for nothing beyond that.",
      "Keep your own copy of anything you would be sorry to lose. Settings exports every record as JSON, and filtered transactions export as CSV.",
      "You can delete your financial data or your whole account in Settings. Deletion removes your records and receipt files, and cannot be undone.",
    ],
  },
  {
    title: "Acceptable use",
    bullets: [
      "Use SpendWise for your own personal records, or for records you are allowed to keep.",
      "Do not try to reach another account's records, or probe, scan, or overload the service.",
      "Do not upload files that contain malware, or content you have no right to store.",
      "Do not resell the service or run automated scraping against it.",
    ],
  },
  {
    title: "Reports and exports",
    paragraphs: [
      "PDF reports, CSV exports, and JSON exports are generated on demand from your entries. You choose the period, the sections, and the page size.",
      "A report reflects what was in the app when you generated it. It is not an audited financial statement, and it is not a substitute for records kept by a bank or an accountant.",
    ],
  },
  {
    title: "Availability",
    paragraphs: [
      "SpendWise is provided as is. Features may change, and the service may be paused for maintenance or stopped entirely.",
      "There is no guarantee of uninterrupted or error free operation. Where the law allows, SpendWise is not liable for lost entries, lost profit, or indirect losses, so keep an export of anything that matters.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["Questions about these terms can go to support@spendwise.app."],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: October 30, 2026</p>

      <Alert className="mt-8 border-border bg-muted">
        <AlertTitle>Placeholder terms</AlertTitle>
        <AlertDescription>
          Placeholder terms. Replace this with reviewed terms of service before launch.
        </AlertDescription>
      </Alert>

      <div className="mt-12 space-y-10">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        SpendWise is a personal record book, not a bank or a financial advisor.
      </p>
    </div>
  );
}
