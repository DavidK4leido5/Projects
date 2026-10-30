import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  SectionHeading,
} from "@repo/ui";
import { faqs } from "@/features/landing/content";
import { Section } from "@/features/landing/section";

export function FaqSection() {
  return (
    <Section id="faq" labelledBy="faq-title" className="bg-muted/20">
      <SectionHeading
        id="faq-title"
        title="Questions, answered plainly."
        description="If something is still unclear, the app is the fastest way to see how it works."
      />
      <div className="mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={"faq-" + String(index)}>
              <AccordionTrigger className="text-left text-sm font-medium sm:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
