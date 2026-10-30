"use client";

import { ChevronDown, FileText } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Separator } from "@repo/ui";
import { reportPreview } from "@/features/landing/mock-data";
import { ReportPaper } from "./report-paper";

const DATE_CHIPS = ["This month", "Last month", "Last 3 months", "Last 6 months", "Year to date"];

const SECTIONS = [
  {
    id: "summary",
    label: "Executive summary",
    hint: "Income, expenses, net, savings rate",
    checked: true,
  },
  {
    id: "categories",
    label: "Category breakdown",
    hint: "Top categories and their shares",
    checked: true,
  },
  {
    id: "cash-flow",
    label: "Cash flow chart",
    hint: "Six months of income and expenses",
    checked: true,
  },
  {
    id: "budgets",
    label: "Budget performance",
    hint: "Limit, spent, and state per budget",
    checked: true,
  },
  { id: "goals", label: "Goals progress", hint: "Contributed against each target", checked: false },
  { id: "transactions", label: "Transaction detail", hint: "Capped at 2,000 rows", checked: false },
];

export function TourReports() {
  return (
    <div className="grid min-w-0 gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <Card className="min-w-0">
        <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
          <CardTitle className="text-sm">Build a report</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a period and the sections you need, then preview the PDF.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Report type</span>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
              aria-label="Report type"
              aria-haspopup="listbox"
            >
              <span className="truncate">{reportPreview.title}</span>
              <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Date range</span>
            <div className="flex flex-wrap gap-1.5">
              {DATE_CHIPS.map((chip, index) => (
                <Button
                  key={chip}
                  type="button"
                  size="sm"
                  variant={index === 0 ? "secondary" : "outline"}
                  aria-pressed={index === 0}
                >
                  {chip}
                </Button>
              ))}
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">{reportPreview.period}</p>
          </div>

          <Separator />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium">Sections</legend>
            {SECTIONS.map((section) => (
              <label
                key={section.id}
                htmlFor={"report-section-" + section.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 hover:bg-muted/60"
              >
                <Checkbox
                  id={"report-section-" + section.id}
                  defaultChecked={section.checked}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{section.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {section.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">Paper size</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Paper size">
              <Button type="button" size="sm" variant="secondary" aria-pressed>
                A4
              </Button>
              <Button type="button" size="sm" variant="outline" aria-pressed={false}>
                Letter
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {reportPreview.categories.length} categories · A4
              </p>
              <Button
                type="button"
                disabled
                aria-describedby="report-preview-note"
                title="Available in the app"
                className="w-full sm:w-auto"
              >
                <FileText className="size-4" aria-hidden="true" />
                Preview PDF
              </Button>
            </div>
            <p id="report-preview-note" className="text-[11px] text-muted-foreground">
              Available in the app
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Preview</p>
          <span className="text-[11px] text-muted-foreground">PDF · A4</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
          <ReportPaper {...reportPreview} />
        </div>
      </div>
    </div>
  );
}
