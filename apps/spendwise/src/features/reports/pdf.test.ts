import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildReportDocument } from "@/lib/pdf/document";
import type { ReportData, ReportTransaction } from "@/lib/report-data";

function expense(
  index: number,
  payee: string,
  amount: number,
  categoryName: string,
  day: number,
): ReportTransaction {
  return {
    id: "expense-" + index,
    date: new Date(2026, 8 + (index % 3), day, 10, 0, 0),
    type: "expense",
    amount,
    payee,
    notes: null,
    accountName: index % 2 === 0 ? "BPI Savings" : "Cash",
    categoryName,
  };
}

const categoryNames = [
  "Groceries",
  "Rent",
  "Transport",
  "Dining",
  "Utilities",
  "Health",
  "Shopping",
  "Subscriptions",
];

const transactions: ReportTransaction[] = Array.from({ length: 44 }, (_, index) => {
  const category = categoryNames[index % categoryNames.length] ?? "Groceries";
  return expense(index, "Payee " + (index + 1), 45_000 + index * 7_250, category, (index % 28) + 1);
});

const income: ReportTransaction = {
  id: "income-1",
  date: new Date(2026, 8, 1, 9, 0, 0),
  type: "income",
  amount: 1_250_000,
  payee: "Monthly salary",
  notes: null,
  accountName: "BPI Savings",
  categoryName: "Salary",
};

const fixture: ReportData = {
  request: {
    type: "annual_summary",
    dateFrom: "2026-09-01",
    dateTo: "2026-11-30",
    includeTransactions: true,
    includeCharts: true,
    paperSize: "A4",
  },
  type: "annual_summary",
  title: "Annual summary - Sep 1, 2026 to Nov 30, 2026",
  userName: "Maria Santos",
  generatedAt: new Date(2026, 11, 1, 8, 30, 0),
  settings: { currency: "PHP", locale: "en-PH", logoUrl: null },
  range: {
    from: new Date(2026, 8, 1),
    to: new Date(2026, 11, 0, 23, 59, 59),
    label: "Sep 1, 2026 to Nov 30, 2026",
  },
  previous: {
    from: new Date(2026, 5, 1),
    to: new Date(2026, 7, 31, 23, 59, 59),
    label: "Jun 1, 2026 to Aug 31, 2026",
  },
  summary: {
    income: 1_250_000,
    expense: 830_450,
    net: 419_550,
    savingsRate: 33.6,
    count: 45,
  },
  previousSummary: {
    income: 1_150_000,
    expense: 860_200,
    net: 289_800,
    savingsRate: 25.2,
    count: 41,
  },
  change: { income: 8.7, expense: -3.5, net: 44.8 },
  months: [
    { key: "2026-09", label: "Sep 2026", income: 430_000, expense: 280_150, net: 149_850 },
    { key: "2026-10", label: "Oct 2026", income: 410_000, expense: 295_300, net: 114_700 },
    { key: "2026-11", label: "Nov 2026", income: 410_000, expense: 255_000, net: 155_000 },
  ],
  categories: categoryNames.map((name, index) => ({
    categoryId: "category-" + index,
    name,
    amount: 100_000 + index * 12_500,
    count: 3 + index,
    share: 12.1 + index,
  })),
  budgets: [
    {
      id: "budget-1",
      categoryName: "Groceries",
      monthLabel: "Sep 2026",
      budget: 150_000,
      spent: 142_300,
      remaining: 7_700,
      percent: 94.9,
      state: "near_limit",
    },
    {
      id: "budget-2",
      categoryName: "Dining",
      monthLabel: "Oct 2026",
      budget: 60_000,
      spent: 71_200,
      remaining: -11_200,
      percent: 118.7,
      state: "exceeded",
    },
  ],
  topExpenses: transactions.slice(0, 10),
  transactions: [income, ...transactions],
  transactionCount: 45,
  truncated: false,
  filterLabels: { accounts: ["BPI Savings", "Cash"], categories: [] },
  recurring: [
    {
      id: "rule-1",
      payee: "Apartment rent",
      amount: 250_000,
      frequency: "monthly",
      type: "expense",
      nextRunAt: new Date(2026, 11, 1, 8, 0, 0),
    },
    {
      id: "rule-2",
      payee: "Music streaming",
      amount: 22_900,
      frequency: "monthly",
      type: "expense",
      nextRunAt: new Date(2026, 11, 4, 8, 0, 0),
    },
  ],
};

describe("buildReportDocument", () => {
  it("renders a PDF buffer larger than 5KB", async () => {
    const buffer = await renderToBuffer(buildReportDocument(fixture));

    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(5 * 1024);
  }, 30_000);

  it("renders without charts or transaction detail", async () => {
    const buffer = await renderToBuffer(
      buildReportDocument({
        ...fixture,
        request: {
          ...fixture.request,
          type: "budget_performance",
          includeCharts: false,
          includeTransactions: false,
        },
        type: "budget_performance",
      }),
    );

    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1024);
  }, 30_000);
});
