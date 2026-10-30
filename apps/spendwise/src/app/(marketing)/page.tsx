import { faqs, site } from "@/features/landing/content";
import { HeroSection } from "@/features/landing/hero-section";
import { TrustStrip } from "@/features/landing/trust-strip";
import { FeaturesSection } from "@/features/landing/features-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { TourSection } from "@/features/landing/tour-section";
import { ReportSection } from "@/features/landing/report-section";
import { SecuritySection } from "@/features/landing/security-section";
import { FaqSection } from "@/features/landing/faq-section";
import { FinalCtaSection } from "@/features/landing/final-cta";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: site.description,
  url: "/",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PHP",
  },
  featureList: [
    "Income and expense tracking",
    "Multiple accounts and net worth",
    "Monthly budgets",
    "Savings goals",
    "Recurring bills",
    "Cash flow analysis",
    "PDF reports",
    "CSV import and export",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <HowItWorksSection />
      <TourSection />
      <ReportSection />
      <SecuritySection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
