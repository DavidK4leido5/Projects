import type { ReportRequest } from "@repo/finance";

export type ReportType = ReportRequest["type"];

export const REPORT_TYPE_META = {
  monthly_summary: {
    label: "Monthly summary",
    description: "Income, spending, budgets, and the largest expenses for the month.",
  },
  custom_range: {
    label: "Custom range",
    description: "Any two dates, with the same summary, charts, and category detail.",
  },
  category_spending: {
    label: "Category spending",
    description: "Where every peso went, category by category, with the largest expenses.",
  },
  cash_flow: {
    label: "Cash flow",
    description: "Income and expenses month by month, with the running net.",
  },
  budget_performance: {
    label: "Budget performance",
    description: "Monthly limits against what was actually spent in each category.",
  },
  annual_summary: {
    label: "Annual summary",
    description: "A full year at a glance: cash flow, categories, budgets, and top expenses.",
  },
} as const satisfies Record<ReportType, { label: string; description: string }>;

export const REPORT_PAPER_SIZES = ["A4", "Letter"] as const;

export type ReportPaperSize = (typeof REPORT_PAPER_SIZES)[number];

export type ReportHistoryItem = {
  id: string;
  type: ReportType;
  title: string;
  dateFrom: string;
  dateTo: string;
  createdAt: Date;
  options: {
    accountIds?: string[];
    categoryIds?: string[];
    includeTransactions?: boolean;
    includeCharts?: boolean;
    paperSize?: ReportPaperSize;
  };
};

export function reportFileName(
  type: ReportType,
  dateFrom: string,
  dateTo: string,
  extension: "pdf" | "csv",
): string {
  return (
    "spendwise-" + type.replace(/_/g, "-") + "-" + dateFrom + "-to-" + dateTo + "." + extension
  );
}

export function toReportRequest(item: ReportHistoryItem) {
  return {
    type: item.type,
    dateFrom: item.dateFrom,
    dateTo: item.dateTo,
    accountIds: item.options.accountIds,
    categoryIds: item.options.categoryIds,
    includeTransactions: item.options.includeTransactions ?? false,
    includeCharts: item.options.includeCharts ?? true,
    paperSize: item.options.paperSize ?? "A4",
  };
}
