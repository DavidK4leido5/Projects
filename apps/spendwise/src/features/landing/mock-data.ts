import type { TransactionType } from "@repo/db/schema";

export const DEMO_CURRENCY = "PHP";
export const DEMO_LOCALE = "en-PH";
export const DEMO_MONTH = "October 2026";

export type CashFlowPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

const monthly = [
  { key: "2026-05", label: "May", income: 64_000_00, expense: 49_200_00 },
  { key: "2026-06", label: "Jun", income: 65_000_00, expense: 48_300_00 },
  { key: "2026-07", label: "Jul", income: 64_500_00, expense: 50_100_00 },
  { key: "2026-08", label: "Aug", income: 65_000_00, expense: 49_900_00 },
  { key: "2026-09", label: "Sep", income: 65_000_00, expense: 53_158_00 },
  { key: "2026-10", label: "Oct", income: 65_000_00, expense: 51_236_00 },
] as const;

export const cashFlow: CashFlowPoint[] = monthly.map((point) => ({
  ...point,
  net: point.income - point.expense,
}));

export const summary = {
  totalBalance: 243_508_00,
  income: 65_000_00,
  expenses: 51_236_00,
  net: 13_764_00,
  savingsRate: 21.2,
  previousIncome: 65_000_00,
  previousExpenses: 53_158_00,
  accountCount: 5,
} as const;

export type CategorySlice = {
  categoryId: string;
  name: string;
  amount: number;
  share: number;
  color: string;
};

export const spendingByCategory: CategorySlice[] = [
  { categoryId: "rent", name: "Rent", amount: 25_000_00, share: 48.8, color: "var(--chart-1)" },
  {
    categoryId: "groceries",
    name: "Groceries",
    amount: 7_942_00,
    share: 15.5,
    color: "var(--chart-2)",
  },
  { categoryId: "fuel", name: "Fuel", amount: 4_258_00, share: 8.3, color: "var(--chart-3)" },
  {
    categoryId: "dining",
    name: "Dining out",
    amount: 3_617_00,
    share: 7.1,
    color: "var(--chart-4)",
  },
  {
    categoryId: "electricity",
    name: "Electricity",
    amount: 2_608_00,
    share: 5.1,
    color: "var(--chart-5)",
  },
  {
    categoryId: "internet",
    name: "Internet",
    amount: 1_699_00,
    share: 3.3,
    color: "var(--chart-2)",
  },
  { categoryId: "other", name: "Other", amount: 6_112_00, share: 11.9, color: "var(--chart-3)" },
];

export type MockTransaction = {
  id: string;
  date: string;
  payee: string;
  category: string | null;
  account: string;
  type: TransactionType;
  amount: number;
  transferAccount?: string;
};

export const recentTransactions: MockTransaction[] = [
  {
    id: "t1",
    date: "2026-10-28",
    payee: "Salary · Acme Corp",
    category: "Salary",
    account: "BPI Savings",
    type: "income",
    amount: 32_500_00,
  },
  {
    id: "t2",
    date: "2026-10-27",
    payee: "Joyride",
    category: "Ride hailing",
    account: "GCash",
    type: "expense",
    amount: 214_00,
  },
  {
    id: "t3",
    date: "2026-10-25",
    payee: "Kanto Freestyle",
    category: "Dining out",
    account: "Cash",
    type: "expense",
    amount: 871_00,
  },
  {
    id: "t4",
    date: "2026-10-24",
    payee: "S&R",
    category: "Groceries",
    account: "BPI Credit Card",
    type: "expense",
    amount: 1_441_00,
  },
  {
    id: "t5",
    date: "2026-10-16",
    payee: "Monthly investing",
    category: null,
    account: "BPI Savings",
    type: "transfer",
    amount: 5_000_00,
    transferAccount: "Index Fund",
  },
  {
    id: "t6",
    date: "2026-10-14",
    payee: "Netflix",
    category: "Streaming",
    account: "BPI Credit Card",
    type: "expense",
    amount: 549_00,
  },
];

export const budgets = [
  { id: "overall", name: "Overall", spent: 51_236_00, limit: 45_000_00 },
  { id: "food", name: "Food", spent: 12_317_00, limit: 12_000_00 },
  { id: "transport", name: "Transport", spent: 5_625_00, limit: 5_000_00 },
  { id: "utilities", name: "Utilities", spent: 5_723_00, limit: 4_500_00 },
  { id: "entertainment", name: "Entertainment", spent: 2_100_00, limit: 2_500_00 },
  { id: "shopping", name: "Shopping", spent: 1_670_00, limit: 4_000_00 },
] as const;

export const goals = [
  {
    id: "emergency",
    name: "Emergency fund",
    contributed: 4_050_000,
    target: 15_000_000,
    projected: "Dec 2027",
  },
  {
    id: "japan",
    name: "Japan trip",
    contributed: 1_200_000,
    target: 8_000_000,
    projected: "Sep 2027",
  },
  {
    id: "laptop",
    name: "New laptop",
    contributed: 1_000_000,
    target: 6_000_000,
    projected: "Mar 2028",
  },
] as const;

export const accounts = [
  { id: "cash", name: "Cash", type: "Cash", balance: 12_500_00 },
  { id: "bpi", name: "BPI Savings", type: "Bank", balance: 124_000_00 },
  { id: "gcash", name: "GCash", type: "E-wallet", balance: 3_200_00 },
  { id: "card", name: "BPI Credit Card", type: "Credit card", balance: -8_450_00 },
  { id: "index", name: "Index Fund", type: "Investment", balance: 112_258_00 },
] as const;

export const bills = [
  {
    id: "rent",
    payee: "Rent · Makati apartment",
    dueDate: "Nov 1",
    amount: 25_000_00,
    account: "BPI Savings",
  },
  {
    id: "converge",
    payee: "Converge ICT",
    dueDate: "Nov 2",
    amount: 1_699_00,
    account: "BPI Credit Card",
  },
  { id: "netflix", payee: "Netflix", dueDate: "Nov 5", amount: 549_00, account: "BPI Credit Card" },
  { id: "spotify", payee: "Spotify", dueDate: "Nov 8", amount: 149_00, account: "BPI Credit Card" },
  {
    id: "fitness",
    payee: "Fitness First",
    dueDate: "Nov 11",
    amount: 1_499_00,
    account: "BPI Credit Card",
  },
] as const;

export const insights = [
  {
    id: "dining",
    title: "Dining out is up 58%",
    detail: "You spent ₱3,617 this month against ₱2,290 last month.",
    tone: "warning" as const,
  },
  {
    id: "utilities",
    title: "Utilities is over budget",
    detail: "You are at 127% of the ₱4,500 limit with a week left.",
    tone: "danger" as const,
  },
  {
    id: "subscriptions",
    title: "Six recurring charges",
    detail: "They add up to ₱28,896 a month across three accounts.",
    tone: "neutral" as const,
  },
];

export const reportPreview = {
  title: "Monthly Summary",
  period: "October 1 to October 31, 2026",
  income: 65_000_00,
  expenses: 51_236_00,
  net: 13_764_00,
  savingsRate: 21.2,
  categories: spendingByCategory.slice(0, 5),
  topExpenses: [
    { label: "Rent · Makati apartment", amount: 25_000_00 },
    { label: "S&R", amount: 2_754_00 },
    { label: "Shell", amount: 2_080_00 },
    { label: "Converge ICT", amount: 1_699_00 },
  ],
} as const;

export const reportTypes = [
  "Monthly Summary",
  "Custom Range",
  "Category Spending",
  "Cash Flow Statement",
  "Budget Performance",
  "Annual Summary",
] as const;

export const demoUser = {
  name: "Demo User",
  initials: "DU",
  email: "demo@dalorro.app",
} as const;
