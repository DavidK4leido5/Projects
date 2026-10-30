import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import {
  accounts,
  attachments,
  budgets,
  categories,
  goalContributions,
  goals,
  notifications,
  recurringRules,
  reports,
  tags,
  transactionTags,
  transactions,
  userSettings,
} from "../src/schema";
import { getDbPool } from "../src/client";

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("Missing DATABASE_URL. Run: neon env pull");
  process.exit(1);
}

const emailArg = process.argv.find((arg) => arg.startsWith("--email="))?.slice(8);
const email = emailArg ?? process.env.SEED_EMAIL;

const sql = neon(url);
const userRows = (
  email
    ? await sql`select id, name, email from neon_auth.user where email = ${email} limit 1`
    : await sql`select id, name, email from neon_auth.user order by created_at desc limit 1`
) as {
  id: string;
  name: string;
  email: string;
}[];

const user = userRows[0];
if (!user) {
  console.error(
    email
      ? "No Neon Auth user with email " + email + ". Sign up in the app first, then rerun."
      : "No Neon Auth user yet. Sign up in the app once, then rerun: pnpm --filter @repo/db db:seed",
  );
  process.exit(1);
}

const userId: string = user.id;

// Deterministic PRNG so the demo looks the same on every machine.
let state = 0x2f6e2b1;
function random(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}
function between(min: number, max: number): number {
  return Math.floor(min + random() * (max - min + 1));
}
function money(amount: number): number {
  return Math.round(amount * 100);
}
function at(year: number, month: number, day: number, hour = 12, minute = 0): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), hour, minute, 0, 0);
}

const today = new Date();
const startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
const currency = "PHP";

const db = getDbPool();

await db.transaction(async (tx) => {
  // Fresh demo data for this user only.
  await tx.delete(attachments).where(eq(attachments.userId, userId));
  await tx.delete(goalContributions).where(eq(goalContributions.userId, userId));
  await tx.delete(goals).where(eq(goals.userId, userId));
  await tx.delete(budgets).where(eq(budgets.userId, userId));
  await tx.delete(transactions).where(eq(transactions.userId, userId));
  await tx.delete(recurringRules).where(eq(recurringRules.userId, userId));
  await tx.delete(tags).where(eq(tags.userId, userId));
  await tx.delete(categories).where(eq(categories.userId, userId));
  await tx.delete(accounts).where(eq(accounts.userId, userId));
  await tx.delete(reports).where(eq(reports.userId, userId));
  await tx.delete(notifications).where(eq(notifications.userId, userId));

  await tx
    .insert(userSettings)
    .values({
      userId: userId,
      currency,
      locale: "en-PH",
      dateFormat: "MMM d, yyyy",
      firstDayOfWeek: 1,
      financialMonthStart: 1,
      theme: "system",
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { currency, locale: "en-PH", theme: "system", updatedAt: new Date() },
    });

  const accountRows = await tx
    .insert(accounts)
    .values([
      {
        userId: userId,
        name: "Cash",
        type: "cash",
        startingBalance: money(4500),
        currency,
        color: "amber",
        icon: "banknote",
        sortOrder: 0,
      },
      {
        userId: userId,
        name: "BPI Savings",
        type: "savings",
        startingBalance: money(86500),
        currency,
        color: "sky",
        icon: "piggy-bank",
        sortOrder: 1,
      },
      {
        userId: userId,
        name: "GCash",
        type: "ewallet",
        startingBalance: money(3200),
        currency,
        color: "teal",
        icon: "smartphone",
        sortOrder: 2,
      },
      {
        userId: userId,
        name: "BPI Credit Card",
        type: "credit_card",
        startingBalance: money(-4200),
        currency,
        color: "violet",
        icon: "credit-card",
        sortOrder: 3,
      },
      {
        userId: userId,
        name: "Index Fund",
        type: "investment",
        startingBalance: money(52000),
        currency,
        color: "emerald",
        icon: "trending-up",
        sortOrder: 4,
      },
    ])
    .returning({ id: accounts.id, name: accounts.name, type: accounts.type });

  const accountId = new Map(accountRows.map((row) => [row.name, row.id]));
  const cash = accountId.get("Cash") ?? accountRows[0]!.id;
  const bank = accountId.get("BPI Savings") ?? accountRows[1]!.id;
  const gcash = accountId.get("GCash") ?? accountRows[2]!.id;
  const card = accountId.get("BPI Credit Card") ?? accountRows[3]!.id;
  const fund = accountId.get("Index Fund") ?? accountRows[4]!.id;

  const parentCategories: {
    name: string;
    kind: "income" | "expense";
    color: string;
    icon: string;
  }[] = [
    { name: "Food", kind: "expense", color: "amber", icon: "utensils" },
    { name: "Transport", kind: "expense", color: "sky", icon: "bus" },
    { name: "Housing", kind: "expense", color: "indigo", icon: "house" },
    { name: "Utilities", kind: "expense", color: "teal", icon: "plug" },
    { name: "Health", kind: "expense", color: "rose", icon: "heart-pulse" },
    { name: "Entertainment", kind: "expense", color: "violet", icon: "clapperboard" },
    { name: "Shopping", kind: "expense", color: "orange", icon: "shopping-bag" },
    { name: "Education", kind: "expense", color: "emerald", icon: "graduation-cap" },
    { name: "Personal", kind: "expense", color: "slate", icon: "user" },
    { name: "Savings", kind: "expense", color: "emerald", icon: "piggy-bank" },
    { name: "Salary", kind: "income", color: "emerald", icon: "banknote" },
    { name: "Freelance", kind: "income", color: "teal", icon: "laptop" },
    { name: "Business", kind: "income", color: "sky", icon: "store" },
    { name: "Gifts", kind: "income", color: "rose", icon: "gift" },
    { name: "Other Income", kind: "income", color: "slate", icon: "plus-circle" },
  ];

  const parentRows = await tx
    .insert(categories)
    .values(
      parentCategories.map((category, index) => ({
        userId: userId,
        ...category,
        sortOrder: index,
      })),
    )
    .returning({ id: categories.id, name: categories.name });

  const parentId = new Map(parentRows.map((row) => [row.name, row.id]));

  const children: { parent: string; name: string; icon: string }[] = [
    { parent: "Food", name: "Groceries", icon: "shopping-basket" },
    { parent: "Food", name: "Dining out", icon: "utensils" },
    { parent: "Food", name: "Coffee", icon: "coffee" },
    { parent: "Transport", name: "Fuel", icon: "fuel" },
    { parent: "Transport", name: "Ride hailing", icon: "car" },
    { parent: "Transport", name: "Public transit", icon: "bus" },
    { parent: "Housing", name: "Rent", icon: "house" },
    { parent: "Housing", name: "Maintenance", icon: "hammer" },
    { parent: "Utilities", name: "Electricity", icon: "zap" },
    { parent: "Utilities", name: "Water", icon: "droplets" },
    { parent: "Utilities", name: "Internet", icon: "wifi" },
    { parent: "Utilities", name: "Phone", icon: "smartphone" },
    { parent: "Health", name: "Pharmacy", icon: "pill" },
    { parent: "Health", name: "Doctor", icon: "stethoscope" },
    { parent: "Entertainment", name: "Streaming", icon: "tv" },
    { parent: "Entertainment", name: "Movies", icon: "clapperboard" },
    { parent: "Shopping", name: "Clothing", icon: "shirt" },
    { parent: "Shopping", name: "Electronics", icon: "headphones" },
    { parent: "Education", name: "Courses", icon: "book-open" },
    { parent: "Personal", name: "Grooming", icon: "scissors" },
  ];

  const childRows = await tx
    .insert(categories)
    .values(
      children.map((child, index) => ({
        userId: userId,
        name: child.name,
        kind: "expense" as const,
        parentId: parentId.get(child.parent) ?? null,
        color: "slate",
        icon: child.icon,
        sortOrder: index,
      })),
    )
    .returning({ id: categories.id, name: categories.name });

  const categoryId = new Map([...parentRows, ...childRows].map((row) => [row.name, row.id]));
  const category = (name: string): string => categoryId.get(name) ?? parentId.get("Food")!;

  const tagRows = await tx
    .insert(tags)
    .values([
      { userId: userId, name: "essential", color: "teal" },
      { userId: userId, name: "treat", color: "amber" },
      { userId: userId, name: "work", color: "sky" },
      { userId: userId, name: "family", color: "rose" },
      { userId: userId, name: "subscription", color: "violet" },
    ])
    .returning({ id: tags.id, name: tags.name });
  const tagId = new Map(tagRows.map((row) => [row.name, row.id]));

  type Txn = typeof transactions.$inferInsert;
  const rows: Txn[] = [];

  function expense(
    date: Date,
    amount: number,
    payee: string,
    account: string,
    categoryName: string,
    paymentMethod: Txn["paymentMethod"] = "debit_card",
    notes?: string,
  ) {
    rows.push({
      userId: userId,
      accountId: account,
      categoryId: category(categoryName),
      type: "expense",
      amount: money(amount),
      currency,
      date,
      payee,
      paymentMethod,
      notes: notes ?? null,
    });
  }

  function income(
    date: Date,
    amount: number,
    payee: string,
    account: string,
    categoryName: string,
  ) {
    rows.push({
      userId: userId,
      accountId: account,
      categoryId: category(categoryName),
      type: "income",
      amount: money(amount),
      currency,
      date,
      payee,
      paymentMethod: "bank_transfer",
      notes: null,
    });
  }

  for (let offset = 0; offset < 6; offset += 1) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    income(at(year, month, 15, 9), 32500, "Salary · Acme Corp", bank, "Salary");
    income(at(year, month, 28, 9), 32500, "Salary · Acme Corp", bank, "Salary");

    if (random() > 0.45) {
      income(
        at(year, month, between(8, 22), 15),
        between(6000, 14000),
        "Freelance project",
        gcash,
        "Freelance",
      );
    }

    expense(at(year, month, 1, 8), 25000, "Rent · Makati apartment", bank, "Rent", "bank_transfer");
    expense(
      at(year, month, 5, 10),
      between(1900, 2800),
      "Meralco",
      gcash,
      "Electricity",
      "ewallet",
    );
    expense(at(year, month, 8, 10), between(380, 720), "Maynilad", gcash, "Water", "ewallet");
    expense(at(year, month, 10, 10), 1699, "Converge ICT", card, "Internet", "credit_card");
    expense(at(year, month, 12, 10), 999, "Globe Postpaid", gcash, "Phone", "ewallet");

    for (let week = 0; week < 4; week += 1) {
      expense(
        at(year, month, 3 + week * 7, 18),
        between(1100, 3200),
        pick(["Robinsons", "SM Market", "Landmark", "S&R"]),
        pick([gcash, card, cash]),
        "Groceries",
        "ewallet",
      );
      expense(
        at(year, month, 6 + week * 7, 12),
        between(180, 480),
        pick(["Grab", "Angkas", "Joyride"]),
        gcash,
        "Ride hailing",
        "ewallet",
      );
    }

    for (let meal = 0; meal < between(2, 4); meal += 1) {
      expense(
        at(year, month, between(2, 27), between(11, 20)),
        between(420, 1300),
        pick(["Manam", "Wildflour", "Sarsa", "Buddha-Bar", "Kanto Freestyle"]),
        pick([card, cash]),
        "Dining out",
        "credit_card",
      );
    }

    for (let cup = 0; cup < between(3, 7); cup += 1) {
      expense(
        at(year, month, between(1, 28), between(7, 16)),
        between(120, 260),
        pick(["Starbucks", "Yardstick", "Bo's Coffee"]),
        cash,
        "Coffee",
        "cash",
      );
    }

    expense(
      at(year, month, between(4, 9), 9),
      between(1600, 2400),
      pick(["Shell", "Petron", "Caltex"]),
      card,
      "Fuel",
      "credit_card",
    );
    expense(
      at(year, month, between(18, 24), 9),
      between(1600, 2400),
      pick(["Shell", "Petron", "Caltex"]),
      card,
      "Fuel",
      "credit_card",
    );

    expense(
      at(year, month, 14, 20),
      549,
      "Netflix",
      card,
      "Streaming",
      "credit_card",
      "Monthly subscription",
    );
    expense(
      at(year, month, 16, 8),
      149,
      "Spotify",
      card,
      "Streaming",
      "credit_card",
      "Monthly subscription",
    );
    expense(at(year, month, 20, 19), 1499, "Fitness First", card, "Grooming", "credit_card");

    if (random() > 0.4) {
      expense(
        at(year, month, between(5, 26), 15),
        between(700, 4200),
        pick(["Uniqlo", "Power Mac Center", "IKEA", "Lazada"]),
        card,
        pick(["Clothing", "Electronics"]),
        "credit_card",
      );
    }

    if (random() > 0.55) {
      expense(
        at(year, month, between(2, 26), 11),
        between(220, 900),
        pick(["Mercury Drug", "Watsons"]),
        cash,
        "Pharmacy",
        "cash",
      );
    }

    if (random() > 0.7) {
      expense(
        at(year, month, between(2, 26), 18),
        between(800, 1800),
        "Theatre tickets",
        card,
        "Movies",
        "credit_card",
      );
    }

    rows.push({
      userId: userId,
      accountId: bank,
      transferAccountId: fund,
      type: "transfer",
      amount: money(5000),
      currency,
      date: at(year, month, 16, 9),
      payee: "Monthly investing",
      paymentMethod: "bank_transfer",
      notes: "Automatic transfer to index fund",
    });
  }

  await tx.insert(transactions).values(rows);

  // A handful of recent rows get a tag so filters have something to find.
  const recent = await tx
    .select({ id: transactions.id, payee: transactions.payee })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense")))
    .limit(5);

  for (const row of recent) {
    const key =
      row.payee.toLowerCase().includes("netflix") || row.payee.toLowerCase().includes("spotify")
        ? "subscription"
        : "essential";
    const id = tagId.get(key);
    if (id) {
      await tx
        .insert(transactionTags)
        .values({ transactionId: row.id, tagId: id })
        .onConflictDoNothing();
    }
  }

  const budgetValues: { name: string | null; amount: number; rollover: boolean }[] = [
    { name: null, amount: 45000, rollover: false },
    { name: "Food", amount: 12000, rollover: true },
    { name: "Transport", amount: 5000, rollover: false },
    { name: "Utilities", amount: 4500, rollover: false },
    { name: "Entertainment", amount: 2500, rollover: true },
    { name: "Shopping", amount: 4000, rollover: false },
    { name: "Health", amount: 2000, rollover: false },
  ];

  const periodMonth =
    today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-01";

  await tx.insert(budgets).values(
    budgetValues.map((budget) => ({
      userId: userId,
      categoryId: budget.name ? category(budget.name) : null,
      periodMonth,
      amount: money(budget.amount),
      currency,
      rollover: budget.rollover,
    })),
  );

  const goalRows = await tx
    .insert(goals)
    .values([
      {
        userId: userId,
        name: "Emergency fund",
        targetAmount: money(150000),
        currency,
        targetDate: new Date(today.getFullYear(), today.getMonth() + 6, 1)
          .toISOString()
          .slice(0, 10),
        linkedAccountId: bank,
        note: "Six months of essentials",
        color: "emerald",
      },
      {
        userId: userId,
        name: "Japan trip",
        targetAmount: money(80000),
        currency,
        targetDate: new Date(today.getFullYear(), today.getMonth() + 12, 1)
          .toISOString()
          .slice(0, 10),
        linkedAccountId: null,
        note: "Flights and two weeks in spring",
        color: "sky",
      },
      {
        userId: userId,
        name: "New laptop",
        targetAmount: money(60000),
        currency,
        targetDate: new Date(today.getFullYear(), today.getMonth() + 8, 1)
          .toISOString()
          .slice(0, 10),
        linkedAccountId: null,
        note: "Replace the 2019 machine",
        color: "violet",
      },
    ])
    .returning({ id: goals.id, name: goals.name });

  const contributions: (typeof goalContributions.$inferInsert)[] = [];
  for (let offset = 0; offset < 5; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 18, 9);
    contributions.push({
      userId: userId,
      goalId: goalRows[0]!.id,
      accountId: bank,
      amount: money(8000),
      date,
      note: "Monthly transfer",
    });
    if (offset < 3) {
      contributions.push({
        userId: userId,
        goalId: goalRows[1]!.id,
        accountId: gcash,
        amount: money(4000),
        date,
        note: null,
      });
    }
    if (offset < 2) {
      contributions.push({
        userId: userId,
        goalId: goalRows[2]!.id,
        accountId: bank,
        amount: money(5000),
        date,
        note: null,
      });
    }
  }
  await tx.insert(goalContributions).values(contributions);

  const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1, 9);
  const nextRuns = [
    {
      payee: "Rent · Makati apartment",
      amount: 25000,
      category: "Rent",
      account: bank,
      day: 1,
      frequency: "monthly" as const,
      next: nextMonthFirst,
    },
    {
      payee: "Converge ICT",
      amount: 1699,
      category: "Internet",
      account: card,
      day: 10,
      frequency: "monthly" as const,
      next: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10),
    },
    {
      payee: "Netflix",
      amount: 549,
      category: "Streaming",
      account: card,
      day: 14,
      frequency: "monthly" as const,
      next: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 20),
    },
    {
      payee: "Spotify",
      amount: 149,
      category: "Streaming",
      account: card,
      day: 16,
      frequency: "monthly" as const,
      next: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 8),
    },
    {
      payee: "Fitness First",
      amount: 1499,
      category: "Grooming",
      account: card,
      day: 20,
      frequency: "monthly" as const,
      next: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 19),
    },
    {
      payee: "Salary · Acme Corp",
      amount: 32500,
      category: "Salary",
      account: bank,
      day: 15,
      frequency: "monthly" as const,
      next: new Date(today.getFullYear(), today.getMonth() + 1, 15, 9),
    },
  ];

  await tx.insert(recurringRules).values(
    nextRuns.map((rule) => ({
      userId: userId,
      accountId: rule.account,
      categoryId: category(rule.category),
      type: rule.payee.startsWith("Salary") ? ("income" as const) : ("expense" as const),
      amount: money(rule.amount),
      currency,
      payee: rule.payee,
      paymentMethod: "credit_card" as const,
      frequency: rule.frequency,
      interval: 1,
      dayOfMonth: rule.day,
      startDate: new Date(today.getFullYear(), today.getMonth() - 3, rule.day)
        .toISOString()
        .slice(0, 10),
      nextRunAt: rule.next,
      active: true,
    })),
  );

  await tx.insert(notifications).values([
    {
      userId: userId,
      type: "budget_alert",
      title: "Entertainment is close to its limit",
      body: "You have used most of the Entertainment budget this month.",
      metadata: { category: "Entertainment" },
    },
    {
      userId: userId,
      type: "bill_due",
      title: "Converge ICT is due soon",
      body: "Your internet bill is due in a few days.",
      metadata: { payee: "Converge ICT" },
    },
  ]);

  await tx.insert(reports).values([
    {
      userId: userId,
      type: "monthly_summary",
      title: "Monthly summary",
      dateFrom: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10),
      dateTo: today.toISOString().slice(0, 10),
      options: { includeTransactions: true, includeCharts: true, paperSize: "A4" },
    },
  ]);
});

console.log("Seeded 6 months of demo data for " + user.email);
console.log(
  "Accounts, categories, transactions, budgets, goals, bills, and notifications are ready.",
);
