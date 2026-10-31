import type { Metadata } from "next";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Privacy | ${brand.name}` },
  alternates: { canonical: "/privacy" },
  description: `What ${brand.name} stores, how your records are used, and the controls you have over your data.`,
};

type Section = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

const sections: readonly Section[] = [
  {
    title: "What we store",
    paragraphs: [
      `${brand.name} keeps an account record for you and the entries you create in the app.`,
    ],
    bullets: [
      "Your email address, used to sign in and to send account email.",
      `Your password, handled by Neon Auth. Passwords are hashed by the auth service and ${brand.name} never stores or sees a plain password.`,
      "Financial records you enter: accounts and balances, transactions, categories, budgets, goals, and recurring bills.",
      "Receipt files you attach to a transaction, stored in Neon object storage.",
      "A report logo if you upload one, stored in Cloudinary.",
      "Preferences such as currency, locale, and report layout.",
    ],
  },
  {
    title: "How it is used",
    paragraphs: [
      "Your records are used to run the app for you and for nothing else. That means rendering your dashboard, calculating cash flow and budget progress, generating reports and exports, and sending account email such as a password reset.",
      `There are no bank connections, no advertising or analytics scripts, and no sale or sharing of your data with advertisers. ${brand.name} does not build a profile of you beyond the numbers you enter.`,
    ],
  },
  {
    title: "Where it lives",
    paragraphs: [
      "Your account and financial records live in a Neon Postgres database. Receipt files live in Neon object storage, and a report logo lives in Cloudinary. Traffic is served over HTTPS.",
      "Every read and write in the app is filtered by your user id, so a screen can only load records that belong to your account.",
    ],
  },
  {
    title: "Your controls",
    paragraphs: ["You can take your data out or remove it without asking us."],
    bullets: [
      "Settings exports every record as JSON.",
      "Filtered transactions and report data export as CSV.",
      "Settings can delete your financial data, and can delete your account after confirming your password. Deleting the account removes your records and receipt files.",
      "You can change your password or sign out from any device at any time.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about your data, or a request you cannot complete in Settings, can go to ${brand.privacyEmail}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Privacy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: October 30, 2026</p>

      <Alert className="mt-8 border-border bg-muted">
        <AlertTitle>Placeholder policy</AlertTitle>
        <AlertDescription>
          Placeholder policy. Replace this with a reviewed privacy policy before launch.
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
        {brand.name} is a personal record book, not a bank or a financial advisor.
      </p>
    </div>
  );
}
