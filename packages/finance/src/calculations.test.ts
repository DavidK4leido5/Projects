import { describe, expect, it } from "vitest";
import {
  budgetProgress,
  cashFlowSeries,
  categoryBreakdown,
  detectRecurring,
  forecastCashFlow,
  goalProjection,
  netWorth,
  percentChange,
  runningBalance,
  summarize,
  topExpenses,
} from "./calculations";
import type { TxnLike } from "./calculations";

const day = (month: number, date: number, year: number = 2026): Date =>
  new Date(year, month - 1, date);

function txn(partial: Partial<TxnLike> & Pick<TxnLike, "type" | "amount" | "date">): TxnLike {
  return partial;
}

describe("summarize", () => {
  it("excludes transfers from income, expense and count", () => {
    const summary = summarize([
      txn({ type: "income", amount: 50000, date: day(1, 2) }),
      txn({ type: "expense", amount: 20000, date: day(1, 3) }),
      txn({ type: "transfer", amount: 30000, date: day(1, 4) }),
    ]);

    expect(summary.income).toBe(50000);
    expect(summary.expense).toBe(20000);
    expect(summary.net).toBe(30000);
    expect(summary.count).toBe(2);
  });

  it("computes savings rate to one decimal", () => {
    const summary = summarize([
      txn({ type: "income", amount: 100000, date: day(1, 1) }),
      txn({ type: "expense", amount: 40000, date: day(1, 2) }),
    ]);

    expect(summary.savingsRate).toBe(60);
  });

  it("reports zero savings rate without income", () => {
    const summary = summarize([txn({ type: "expense", amount: 40000, date: day(1, 2) })]);
    expect(summary.savingsRate).toBe(0);
  });
});

describe("cashFlowSeries", () => {
  it("buckets by month and skips transfers", () => {
    const months = [
      { key: "2026-01", label: "Jan 2026", from: day(1, 1), to: day(1, 31) },
      { key: "2026-02", label: "Feb 2026", from: day(2, 1), to: day(2, 28) },
    ];
    const series = cashFlowSeries(
      [
        txn({ type: "income", amount: 50000, date: day(1, 5) }),
        txn({ type: "expense", amount: 10000, date: day(1, 9) }),
        txn({ type: "transfer", amount: 20000, date: day(1, 10) }),
        txn({ type: "income", amount: 60000, date: day(2, 5) }),
      ],
      months,
    );

    expect(series).toEqual([
      { key: "2026-01", label: "Jan 2026", income: 50000, expense: 10000, net: 40000 },
      { key: "2026-02", label: "Feb 2026", income: 60000, expense: 0, net: 60000 },
    ]);
  });
});

describe("categoryBreakdown", () => {
  it("sorts descending and shares sum to 100", () => {
    const rows = categoryBreakdown([
      txn({
        type: "expense",
        amount: 3000,
        date: day(1, 1),
        categoryId: "b",
        categoryName: "Food",
      }),
      txn({
        type: "expense",
        amount: 5000,
        date: day(1, 2),
        categoryId: "a",
        categoryName: "Rent",
      }),
      txn({ type: "expense", amount: 2000, date: day(1, 3) }),
      txn({
        type: "income",
        amount: 9000,
        date: day(1, 4),
        categoryId: "c",
        categoryName: "Salary",
      }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["Rent", "Food", "Uncategorized"]);
    expect(rows.map((row) => row.share)).toEqual([50, 30, 20]);
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBe(100);
    expect(rows[2]?.categoryId).toBeNull();
    expect(rows[0]?.count).toBe(1);
  });

  it("respects the limit", () => {
    const rows = categoryBreakdown(
      [
        txn({
          type: "expense",
          amount: 5000,
          date: day(1, 1),
          categoryId: "a",
          categoryName: "Rent",
        }),
        txn({
          type: "expense",
          amount: 3000,
          date: day(1, 2),
          categoryId: "b",
          categoryName: "Food",
        }),
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Rent");
  });
});

describe("topExpenses", () => {
  it("returns expenses only, largest first", () => {
    const rows = topExpenses([
      txn({ type: "expense", amount: 1000, date: day(1, 1), payee: "Coffee" }),
      txn({ type: "expense", amount: 9000, date: day(1, 2), payee: "Rent" }),
      txn({ type: "income", amount: 90000, date: day(1, 3), payee: "Salary" }),
      txn({ type: "transfer", amount: 5000, date: day(1, 4), payee: "Savings" }),
    ]);

    expect(rows.map((row) => row.payee)).toEqual(["Rent", "Coffee"]);
  });
});

describe("runningBalance", () => {
  it("sorts ascending and leaves transfers untouched", () => {
    const rows = runningBalance(10000, [
      txn({ type: "income", amount: 5000, date: day(1, 2) }),
      txn({ type: "expense", amount: 2000, date: day(1, 1) }),
      txn({ type: "transfer", amount: 3000, date: day(1, 3) }),
    ]);

    expect(rows.map((row) => row.balance)).toEqual([8000, 13000, 13000]);
    expect(rows[0]?.date.getTime()).toBe(day(1, 1).getTime());
  });
});

describe("budgetProgress", () => {
  it("uses on_track below 80 percent", () => {
    const result = budgetProgress(79000, 100000);
    expect(result.percent).toBe(79);
    expect(result.state).toBe("on_track");
  });

  it("uses near_limit at 80 percent", () => {
    const result = budgetProgress(80000, 100000);
    expect(result.percent).toBe(80);
    expect(result.state).toBe("near_limit");
  });

  it("uses near_limit at 100 percent", () => {
    const result = budgetProgress(100000, 100000);
    expect(result.percent).toBe(100);
    expect(result.state).toBe("near_limit");
    expect(result.remaining).toBe(0);
  });

  it("uses exceeded above 100 percent", () => {
    const result = budgetProgress(101000, 100000);
    expect(result.percent).toBe(101);
    expect(result.state).toBe("exceeded");
  });

  it("adds rollover carry to the effective limit", () => {
    const result = budgetProgress(90000, 100000, 20000);
    expect(result.effectiveLimit).toBe(120000);
    expect(result.remaining).toBe(30000);
    expect(result.percent).toBe(75);
  });
});

describe("percentChange", () => {
  it("is zero when both values are zero", () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it("is 100 when growing from zero", () => {
    expect(percentChange(5000, 0)).toBe(100);
  });

  it("handles growth and decline", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it("rounds to one decimal", () => {
    expect(percentChange(110, 90)).toBe(22.2);
  });
});

describe("netWorth", () => {
  it("treats credit cards as liabilities", () => {
    const result = netWorth([
      { type: "checking", balance: 100000 },
      { type: "savings", balance: 50000 },
      { type: "credit_card", balance: -20000 },
    ]);

    expect(result.assets).toBe(150000);
    expect(result.liabilities).toBe(20000);
    expect(result.net).toBe(130000);
  });
});

describe("detectRecurring", () => {
  const now = day(6, 1);

  it("detects a monthly subscription", () => {
    const candidates = detectRecurring(
      [
        txn({ type: "expense", amount: 54900, date: day(1, 5), payee: "Netflix" }),
        txn({ type: "expense", amount: 54900, date: day(2, 5), payee: "NETFLIX" }),
        txn({ type: "expense", amount: 54900, date: day(3, 5), payee: "Netflix" }),
        txn({ type: "income", amount: 54900, date: day(3, 5), payee: "Netflix" }),
      ],
      now,
    );

    expect(candidates).toHaveLength(1);
    const candidate = candidates[0];
    expect(candidate?.frequency).toBe("monthly");
    expect(candidate?.occurrences).toBe(3);
    expect(candidate?.amount).toBe(54900);
    expect(candidate?.confidence).toBeGreaterThan(0);
    expect(candidate?.confidence).toBeLessThanOrEqual(1);
    expect(candidate?.nextDate.getTime()).toBeGreaterThan(candidate?.lastDate.getTime() ?? 0);
  });

  it("detects a weekly habit", () => {
    const candidates = detectRecurring(
      [
        txn({ type: "expense", amount: 15000, date: day(1, 5), payee: "Lunch" }),
        txn({ type: "expense", amount: 15000, date: day(1, 12), payee: "Lunch" }),
        txn({ type: "expense", amount: 15000, date: day(1, 19), payee: "Lunch" }),
      ],
      now,
    );

    expect(candidates[0]?.frequency).toBe("weekly");
  });

  it("ignores payees with fewer than three occurrences", () => {
    const candidates = detectRecurring(
      [
        txn({ type: "expense", amount: 54900, date: day(1, 5), payee: "Netflix" }),
        txn({ type: "expense", amount: 54900, date: day(2, 5), payee: "Netflix" }),
      ],
      now,
    );

    expect(candidates).toHaveLength(0);
  });
});

describe("goalProjection", () => {
  it("projects from the last 90 days of contributions", () => {
    const now = day(4, 1);
    const result = goalProjection(
      [
        { date: day(1, 15), amount: 30000 },
        { date: day(2, 15), amount: 30000 },
        { date: day(3, 15), amount: 30000 },
      ],
      300000,
      now,
    );

    expect(result.contributed).toBe(90000);
    expect(result.monthlyPace).toBe(30000);
    expect(result.percent).toBe(30);
    expect(result.projectedDate).not.toBeNull();
    expect(result.projectedDate?.getTime()).toBeGreaterThan(now.getTime());
  });

  it("returns a null projection without a pace", () => {
    const result = goalProjection([], 300000, day(4, 1));
    expect(result.monthlyPace).toBe(0);
    expect(result.projectedDate).toBeNull();
  });
});

describe("forecastCashFlow", () => {
  it("applies average daily flow plus recurring runs", () => {
    const result = forecastCashFlow({
      today: day(1, 1),
      days: 30,
      currentBalance: 100000,
      recentIncome: 30000,
      recentExpense: 15000,
      recurring: [
        { amount: 5000, type: "income", nextRunAt: day(1, 10), frequency: "weekly" },
        { amount: 1000, type: "expense", nextRunAt: day(1, 15), frequency: "monthly" },
      ],
    });

    expect(result.projectedIncome).toBe(50000);
    expect(result.projectedExpense).toBe(16000);
    expect(result.projectedNet).toBe(34000);
    expect(result.endingBalance).toBe(134000);
  });
});
