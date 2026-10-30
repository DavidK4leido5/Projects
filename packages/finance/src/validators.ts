import { z } from "zod";

export const ACCOUNT_TYPES = [
  "cash",
  "bank",
  "ewallet",
  "credit_card",
  "savings",
  "investment",
] as const;

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export const PAYMENT_METHODS = [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "ewallet",
  "other",
] as const;

export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly", "custom"] as const;

export const REPORT_TYPES = [
  "monthly_summary",
  "custom_range",
  "category_spending",
  "cash_flow",
  "budget_performance",
  "annual_summary",
] as const;

export const CATEGORY_KINDS = ["income", "expense"] as const;

const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like PHP");

const uuid = (label: string) => z.uuid(`Choose a valid ${label}`);

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-30");

export const accountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter an account name")
    .max(80, "Keep the name under 80 characters"),
  type: z.enum(ACCOUNT_TYPES, "Choose an account type"),
  startingBalance: z.int("Enter a whole amount in cents"),
  currency: currencyCode,
  color: z.string(),
  icon: z.string(),
  archived: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name")
    .max(80, "Keep the name under 80 characters"),
  kind: z.enum(CATEGORY_KINDS, "Choose a category kind"),
  parentId: uuid("parent category").nullish(),
  color: z.string(),
  icon: z.string(),
  sortOrder: z.int("Sort order must be a whole number").optional(),
});

const transactionShape = {
  type: z.enum(TRANSACTION_TYPES, "Choose a transaction type"),
  amount: z.int("Enter a whole amount in cents").positive("Amount must be greater than zero"),
  currency: currencyCode,
  accountId: uuid("account"),
  categoryId: uuid("category").nullish(),
  transferAccountId: uuid("transfer account").nullish(),
  date: z.coerce.date("Enter a valid date"),
  payee: z.string().trim().min(1, "Enter a payee").max(120, "Keep the payee under 120 characters"),
  notes: z.string().max(2000, "Keep notes under 2000 characters").nullish(),
  paymentMethod: z.enum(PAYMENT_METHODS, "Choose a payment method"),
  isRecurring: z.boolean().optional(),
  exchangeRate: z.number().positive("Exchange rate must be greater than zero").nullish(),
  baseAmount: z.int("Base amount must be a whole number of cents").nullish(),
  tagIds: z.array(uuid("tag"), "Tags must be valid").max(20, "Use 20 tags or fewer").optional(),
};

type TransactionRulesInput = {
  type?: (typeof TRANSACTION_TYPES)[number];
  accountId?: string;
  transferAccountId?: string | null;
  categoryId?: string | null;
};

function transactionIssues(
  value: TransactionRulesInput,
  requireCategory: boolean,
): { path: string[]; message: string }[] {
  const issues: { path: string[]; message: string }[] = [];

  if (value.type === "transfer") {
    if (!value.transferAccountId) {
      issues.push({ path: ["transferAccountId"], message: "Choose the account money moves to" });
    } else if (value.transferAccountId === value.accountId) {
      issues.push({ path: ["transferAccountId"], message: "Transfer accounts must be different" });
    }
    if (value.categoryId != null) {
      issues.push({ path: ["categoryId"], message: "Transfers cannot have a category" });
    }
    return issues;
  }

  if (requireCategory && value.categoryId == null) {
    issues.push({ path: ["categoryId"], message: "Choose a category" });
  }
  return issues;
}

export const transactionInputSchema = z.object(transactionShape).superRefine((value, ctx) => {
  for (const issue of transactionIssues(value, true)) {
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
});

export const transactionUpdateSchema = z
  .object(transactionShape)
  .partial()
  .extend({ id: uuid("transaction") })
  .superRefine((value, ctx) => {
    for (const issue of transactionIssues(value, false)) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

export const budgetInputSchema = z.object({
  categoryId: uuid("category").nullish(),
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month like 2026-10"),
  amount: z.int("Enter a whole amount in cents").positive("Budget must be greater than zero"),
  currency: currencyCode,
  rollover: z.boolean(),
});

export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a goal name").max(80, "Keep the name under 80 characters"),
  targetAmount: z.int("Enter a whole amount in cents").positive("Target must be greater than zero"),
  currency: currencyCode,
  targetDate: z.string().nullish(),
  linkedAccountId: uuid("account").nullish(),
  note: z.string().max(1000, "Keep the note under 1000 characters").nullish(),
  color: z.string(),
});

export const goalContributionSchema = z.object({
  goalId: uuid("goal"),
  amount: z.int("Enter a whole amount in cents").positive("Contribution must be greater than zero"),
  date: z.coerce.date("Enter a valid date"),
  accountId: uuid("account").nullish(),
  note: z.string().max(500, "Keep the note under 500 characters").nullish(),
});

export const recurringRuleSchema = z.object({
  accountId: uuid("account"),
  categoryId: uuid("category").nullish(),
  type: z.enum(TRANSACTION_TYPES, "Choose a transaction type"),
  amount: z.int("Enter a whole amount in cents").positive("Amount must be greater than zero"),
  currency: currencyCode,
  payee: z.string().trim().min(1, "Enter a payee").max(120, "Keep the payee under 120 characters"),
  notes: z.string().max(2000, "Keep notes under 2000 characters").nullish(),
  paymentMethod: z.enum(PAYMENT_METHODS, "Choose a payment method"),
  frequency: z.enum(FREQUENCIES, "Choose a frequency"),
  interval: z
    .int("Interval must be a whole number")
    .min(1, "Interval must be at least 1")
    .max(365, "Interval must be 365 or less"),
  dayOfMonth: z
    .int("Day of month must be a whole number")
    .min(1, "Day of month must be 1 to 31")
    .max(31, "Day of month must be 1 to 31")
    .nullish(),
  weekday: z
    .int("Weekday must be a whole number")
    .min(0, "Weekday must be 0 to 6")
    .max(6, "Weekday must be 0 to 6")
    .nullish(),
  startDate: dateInput,
  endDate: dateInput.nullish(),
});

export const settingsSchema = z.object({
  currency: currencyCode,
  locale: z.string().min(2, "Enter a locale like en-PH").max(20, "Locale is too long"),
  dateFormat: z.string().min(1, "Choose a date format"),
  firstDayOfWeek: z
    .int("First day of week must be a whole number")
    .min(0, "First day of week must be 0 to 6")
    .max(6, "First day of week must be 0 to 6"),
  financialMonthStart: z
    .int("Financial month start must be a whole number")
    .min(1, "Financial month start must be 1 to 28")
    .max(28, "Financial month start must be 1 to 28"),
  theme: z.enum(["light", "dark", "system"], "Choose a theme"),
});

export const reportRequestSchema = z.object({
  type: z.enum(REPORT_TYPES, "Choose a report type"),
  dateFrom: dateInput,
  dateTo: dateInput,
  accountIds: z.array(uuid("account"), "Accounts must be valid").optional(),
  categoryIds: z.array(uuid("category"), "Categories must be valid").optional(),
  includeTransactions: z.boolean(),
  includeCharts: z.boolean(),
  paperSize: z.enum(["A4", "Letter"], "Choose a paper size"),
});

export const csvRowSchema = z.object({
  date: z.string().min(1, "Row is missing a date"),
  payee: z.string().min(1, "Row is missing a payee"),
  amount: z.string(),
  type: z.enum(TRANSACTION_TYPES, "Unknown transaction type").optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  notes: z.string().optional(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type GoalInput = z.infer<typeof goalInputSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type ReportType = (typeof REPORT_TYPES)[number];
export type CsvRow = z.infer<typeof csvRowSchema>;
