import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  CURRENCY_CODES,
  currencySymbol,
  formatMoney,
  formatMoneyCompact,
  moneyToInput,
  parseMoneyInput,
} from "./currency";

describe("CURRENCIES", () => {
  it("lists the supported currencies", () => {
    expect(CURRENCY_CODES).toEqual([
      "PHP",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "AUD",
      "CAD",
      "SGD",
      "INR",
      "AED",
    ]);
    expect(CURRENCIES).toHaveLength(10);
  });
});

describe("parseMoneyInput", () => {
  it("parses grouped decimals into minor units", () => {
    expect(parseMoneyInput("1,234.56")).toBe(123456);
  });

  it("strips currency symbols and whitespace", () => {
    expect(parseMoneyInput("₱1,234.56")).toBe(123456);
    expect(parseMoneyInput(" $ 99.9 ")).toBe(9990);
  });

  it("parses negative amounts", () => {
    expect(parseMoneyInput("-12.50")).toBe(-1250);
  });

  it("parses a single decimal digit", () => {
    expect(parseMoneyInput("0.1")).toBe(10);
  });

  it("returns null for empty input", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("   ")).toBeNull();
  });

  it("rejects more than two meaningful decimals", () => {
    expect(parseMoneyInput("12.345")).toBeNull();
  });

  it("allows extra decimals when they are trailing zeros", () => {
    expect(parseMoneyInput("12.340")).toBe(1234);
    expect(parseMoneyInput("12.000")).toBe(1200);
  });

  it("uses string math, not float rounding", () => {
    expect(parseMoneyInput("0.29")).toBe(29);
    expect(parseMoneyInput("4.35")).toBe(435);
    expect(parseMoneyInput("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("clamps to the safe integer range", () => {
    expect(parseMoneyInput("999999999999999999999")).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMoneyInput("-999999999999999999999")).toBe(-Number.MAX_SAFE_INTEGER);
  });
});

describe("moneyToInput", () => {
  it("formats minor units without grouping", () => {
    expect(moneyToInput(123456)).toBe("1234.56");
    expect(moneyToInput(5)).toBe("0.05");
    expect(moneyToInput(-1250)).toBe("-12.50");
  });
});

describe("formatMoney", () => {
  it("formats PHP with the peso symbol", () => {
    const formatted = formatMoney(123456, "PHP");
    expect(formatted).toContain("₱");
    expect(formatted).toContain("1,234.56");
  });

  it("defaults to PHP", () => {
    expect(formatMoney(100)).toContain("₱");
  });

  it("guards NaN", () => {
    expect(formatMoney(Number.NaN, "PHP")).toBe("—");
    expect(formatMoney(Number.POSITIVE_INFINITY, "PHP")).toBe("—");
  });

  it("formats compact currency", () => {
    expect(formatMoneyCompact(123456, "PHP")).toContain("K");
  });
});

describe("currencySymbol", () => {
  it("returns the symbol for a known code", () => {
    expect(currencySymbol("PHP")).toBe("₱");
    expect(currencySymbol("usd")).toBe("$");
  });

  it("falls back to the code", () => {
    expect(currencySymbol("XYZ")).toBe("XYZ");
  });
});
