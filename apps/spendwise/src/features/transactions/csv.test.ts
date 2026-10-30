import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  guessMapping,
  parseCsv,
  parseCsvAmount,
  parseCsvDate,
  previewCsv,
  validateMappedRow,
} from "./csv";

describe("parseCsv", () => {
  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('Date,Payee,Amount\n2026-01-01,"Store, Inc",12.50');
    expect(rows[1]).toEqual(["2026-01-01", "Store, Inc", "12.50"]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('payee\n"He said ""hi"""');
    expect(rows[1]).toEqual(['He said "hi"']);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps newlines inside quoted fields", () => {
    const rows = parseCsv('payee,notes\n"Store","line one\nline two"');
    expect(rows[1]).toEqual(["Store", "line one\nline two"]);
  });

  it("drops trailing blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvAmount", () => {
  it("reads currency symbols and thousands separators", () => {
    expect(parseCsvAmount("$1,234.56")).toBe(123456);
    expect(parseCsvAmount("₱500")).toBe(50000);
    expect(parseCsvAmount("1,234")).toBe(123400);
  });

  it("reads signs, parentheses, and trailing minus", () => {
    expect(parseCsvAmount("-12.30")).toBe(-1230);
    expect(parseCsvAmount("(45.00)")).toBe(-4500);
    expect(parseCsvAmount("45.00-")).toBe(-4500);
    expect(parseCsvAmount("+8")).toBe(800);
  });

  it("returns null for junk", () => {
    expect(parseCsvAmount("")).toBeNull();
    expect(parseCsvAmount("abc")).toBeNull();
    expect(parseCsvAmount("1.234")).toBeNull();
  });
});

describe("parseCsvDate", () => {
  it("keeps the calendar day for ISO and slash dates", () => {
    const iso = parseCsvDate("2026-01-31");
    expect(iso?.getFullYear()).toBe(2026);
    expect(iso?.getMonth()).toBe(0);
    expect(iso?.getDate()).toBe(31);

    const slash = parseCsvDate("1/31/2026");
    expect(slash?.getDate()).toBe(31);
  });

  it("rejects impossible dates", () => {
    expect(parseCsvDate("2026-02-31")).toBeNull();
    expect(parseCsvDate("not a date")).toBeNull();
  });
});

describe("duplicateKey", () => {
  it("ignores payee case, padding, and amount sign", () => {
    const a = duplicateKey("acct", new Date(2026, 0, 5, 12), 1500, "Coffee Shop");
    const b = duplicateKey("acct", new Date(2026, 0, 5, 20), -1500, "  coffee   shop ");
    expect(a).toBe(b);
  });

  it("changes with account, day, or amount", () => {
    const base = duplicateKey("acct", new Date(2026, 0, 5, 12), 1500, "Coffee");
    expect(duplicateKey("other", new Date(2026, 0, 5, 12), 1500, "Coffee")).not.toBe(base);
    expect(duplicateKey("acct", new Date(2026, 0, 6, 12), 1500, "Coffee")).not.toBe(base);
    expect(duplicateKey("acct", new Date(2026, 0, 5, 12), 1600, "Coffee")).not.toBe(base);
  });
});

describe("guessMapping", () => {
  it("maps common bank headers without stealing account for payee", () => {
    const mapping = guessMapping(["Transaction Date", "Description", "Amount", "Account Name"]);
    expect(mapping).toMatchObject({ date: 0, payee: 1, amount: 2, account: 3 });
  });

  it("marks missing required columns", () => {
    const mapping = guessMapping(["Foo", "Bar"]);
    expect(mapping.date).toBe(-1);
    expect(mapping.payee).toBe(-1);
    expect(mapping.amount).toBe(-1);
  });
});

describe("validateMappedRow", () => {
  it("accepts a clean row", () => {
    expect(
      validateMappedRow({
        date: "2026-01-31",
        payee: "Store",
        amount: "$12.50",
        type: "",
        category: "Food",
        account: "",
        notes: "",
      }),
    ).toEqual([]);
  });

  it("reports missing and invalid values", () => {
    const errors = validateMappedRow({
      date: "2026-02-31",
      payee: "Store",
      amount: "0",
      type: "",
      category: "",
      account: "",
      notes: "",
    });
    expect(errors).toContain("Date is not valid.");
    expect(errors).toContain("Amount cannot be zero.");
  });
});

describe("previewCsv", () => {
  it("limits preview rows and numbers them from the data start", () => {
    const csv = "Date,Payee,Amount\n2026-01-01,A,1\n2026-01-02,B,2\n2026-01-03,C,3";
    const preview = previewCsv(
      csv,
      { date: 0, payee: 1, amount: 2, type: null, category: null, account: null, notes: null },
      2,
    );
    expect(preview.total).toBe(3);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows[0]?.row).toBe(2);
    expect(preview.rows[1]?.row).toBe(3);
  });
});
