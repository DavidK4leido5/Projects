import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Every Dalorro table lives in its own Postgres schema. Neon Auth owns
 * "neon_auth" and is never modified here. The auth user id is stored as a
 * uuid column on each table, without a cross-schema foreign key, so the app
 * works whether Auth lives in the same database or not.
 */
export const spendwise = pgSchema("spendwise");

export const accountTypeEnum = spendwise.enum("account_type", [
  "cash",
  "bank",
  "ewallet",
  "credit_card",
  "savings",
  "investment",
]);

export const transactionTypeEnum = spendwise.enum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const categoryKindEnum = spendwise.enum("category_kind", ["income", "expense"]);

export const paymentMethodEnum = spendwise.enum("payment_method", [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "ewallet",
  "other",
]);

export const recurringFrequencyEnum = spendwise.enum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

export const goalStatusEnum = spendwise.enum("goal_status", ["active", "completed", "archived"]);

export const reportTypeEnum = spendwise.enum("report_type", [
  "monthly_summary",
  "custom_range",
  "category_spending",
  "cash_flow",
  "budget_performance",
  "annual_summary",
]);

export const notificationTypeEnum = spendwise.enum("notification_type", [
  "budget_alert",
  "bill_due",
  "bill_overdue",
  "goal_milestone",
  "system",
]);

export const themeEnum = spendwise.enum("theme", ["light", "dark", "system"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** One row per authenticated user, created lazily on first load. */
export const userSettings = spendwise.table("user_settings", {
  userId: uuid("user_id").primaryKey(),
  currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
  locale: varchar("locale", { length: 20 }).notNull().default("en-PH"),
  dateFormat: varchar("date_format", { length: 20 }).notNull().default("MMM d, yyyy"),
  firstDayOfWeek: integer("first_day_of_week").notNull().default(1),
  financialMonthStart: integer("financial_month_start").notNull().default(1),
  theme: themeEnum("theme").notNull().default("system"),
  reportLogoUrl: text("report_logo_url"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

export const accounts = spendwise.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    startingBalance: bigint("starting_balance", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
    color: varchar("color", { length: 20 }).notNull().default("slate"),
    icon: varchar("icon", { length: 40 }).notNull().default("wallet"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    index("accounts_user_archived_idx").on(t.userId, t.archived),
  ],
);

export const categories = spendwise.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    kind: categoryKindEnum("kind").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    color: varchar("color", { length: 20 }).notNull().default("slate"),
    icon: varchar("icon", { length: 40 }).notNull().default("tag"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("categories_user_idx").on(t.userId),
    index("categories_user_kind_idx").on(t.userId, t.kind),
    uniqueIndex("categories_user_parent_name_idx")
      .on(t.userId, t.parentId, t.name)
      .where(sql.raw("deleted_at is null")),
  ],
);

export const tags = spendwise.table(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("slate"),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("tags_user_name_idx").on(t.userId, t.name)],
);

export const recurringRules = spendwise.table(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    type: transactionTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
    payee: varchar("payee", { length: 120 }).notNull(),
    notes: text("notes"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("other"),
    frequency: recurringFrequencyEnum("frequency").notNull().default("monthly"),
    interval: integer("interval").notNull().default(1),
    dayOfMonth: integer("day_of_month"),
    weekday: integer("weekday"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("recurring_user_idx").on(t.userId),
    index("recurring_user_next_idx").on(t.userId, t.nextRunAt),
    check("recurring_amount_positive", sql.raw("amount > 0")),
    check("recurring_interval_positive", sql.raw("interval > 0")),
  ],
);

export const transactions = spendwise.table(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    transferAccountId: uuid("transfer_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    recurringRuleId: uuid("recurring_rule_id").references(() => recurringRules.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }),
    baseAmount: bigint("base_amount", { mode: "number" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    payee: varchar("payee", { length: 120 }).notNull(),
    notes: text("notes"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("other"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
    index("transactions_user_account_idx").on(t.userId, t.accountId),
    index("transactions_user_type_date_idx").on(t.userId, t.type, t.date),
    index("transactions_recurring_idx").on(t.recurringRuleId),
    check("transactions_amount_positive", sql.raw("amount > 0")),
    check(
      "transactions_transfer_target",
      sql.raw(
        "(type <> 'transfer') or (transfer_account_id is not null and transfer_account_id <> account_id)",
      ),
    ),
  ],
);

export const transactionTags = spendwise.table(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId], name: "transaction_tags_pk" }),
    index("transaction_tags_tag_idx").on(t.tagId),
  ],
);

export const budgets = spendwise.table(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    periodMonth: date("period_month", { mode: "string" }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
    rollover: boolean("rollover").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("budgets_user_period_idx").on(t.userId, t.periodMonth),
    uniqueIndex("budgets_category_unique_idx")
      .on(t.userId, t.categoryId, t.periodMonth)
      .where(sql.raw("category_id is not null")),
    uniqueIndex("budgets_overall_unique_idx")
      .on(t.userId, t.periodMonth)
      .where(sql.raw("category_id is null")),
    check("budgets_amount_positive", sql.raw("amount > 0")),
  ],
);

export const goals = spendwise.table(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
    targetDate: date("target_date", { mode: "string" }),
    linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    color: varchar("color", { length: 20 }).notNull().default("emerald"),
    status: goalStatusEnum("status").notNull().default("active"),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("goals_user_idx").on(t.userId),
    check("goals_target_positive", sql.raw("target_amount > 0")),
  ],
);

export const goalContributions = spendwise.table(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("goal_contributions_user_goal_idx").on(t.userId, t.goalId),
    index("goal_contributions_goal_date_idx").on(t.goalId, t.date),
    check("goal_contributions_amount_positive", sql.raw("amount > 0")),
  ],
);

export const reports = spendwise.table(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: reportTypeEnum("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    dateFrom: date("date_from", { mode: "string" }).notNull(),
    dateTo: date("date_to", { mode: "string" }).notNull(),
    options: jsonb("options")
      .$type<{
        accountIds?: string[];
        categoryIds?: string[];
        includeTransactions?: boolean;
        includeCharts?: boolean;
        paperSize?: "A4" | "Letter";
      }>()
      .notNull()
      .default({}),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("reports_user_created_idx").on(t.userId, t.createdAt)],
);

export const notifications = spendwise.table(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    index("notifications_user_read_idx").on(t.userId, t.readAt),
  ],
);

export const attachments = spendwise.table(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "cascade",
    }),
    fileName: varchar("file_name", { length: 200 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    provider: varchar("provider", { length: 20 }).notNull().default("neon"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("attachments_user_transaction_idx").on(t.userId, t.transactionId)],
);

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions, { relationName: "account" }),
  transfersIn: many(transactions, { relationName: "transferAccount" }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "account",
  }),
  transferAccount: one(accounts, {
    fields: [transactions.transferAccountId],
    references: [accounts.id],
    relationName: "transferAccount",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  recurringRule: one(recurringRules, {
    fields: [transactions.recurringRuleId],
    references: [recurringRules.id],
  }),
  tags: many(transactionTags),
  attachments: many(attachments),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, { fields: [transactionTags.tagId], references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  transactions: many(transactionTags),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one, many }) => ({
  account: one(accounts, { fields: [recurringRules.accountId], references: [accounts.id] }),
  category: one(categories, {
    fields: [recurringRules.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  linkedAccount: one(accounts, {
    fields: [goals.linkedAccountId],
    references: [accounts.id],
  }),
  contributions: many(goalContributions),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, { fields: [goalContributions.goalId], references: [goals.id] }),
  account: one(accounts, {
    fields: [goalContributions.accountId],
    references: [accounts.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type CategoryKind = (typeof categoryKindEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type RecurringFrequency = (typeof recurringFrequencyEnum.enumValues)[number];
export type ReportType = (typeof reportTypeEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
