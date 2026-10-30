export type Currency = {
  code: string;
  name: string;
  locale: string;
  symbol: string;
};

/**
 * Supported currencies with their display locale and symbol. Money is always
 * stored in integer minor units (cents/centavos) alongside one of these codes.
 */
export const CURRENCIES = [
  { code: "PHP", name: "Philippine Peso", locale: "en-PH", symbol: "₱" },
  { code: "USD", name: "US Dollar", locale: "en-US", symbol: "$" },
  { code: "EUR", name: "Euro", locale: "de-DE", symbol: "€" },
  { code: "GBP", name: "British Pound", locale: "en-GB", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", locale: "ja-JP", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", locale: "en-AU", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", locale: "en-CA", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", locale: "en-SG", symbol: "S$" },
  { code: "INR", name: "Indian Rupee", locale: "en-IN", symbol: "₹" },
  { code: "AED", name: "UAE Dirham", locale: "en-AE", symbol: "د.إ" },
] as const satisfies readonly Currency[];

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_CODES: readonly CurrencyCode[] = CURRENCIES.map((currency) => currency.code);

const DEFAULT_CURRENCY: Currency = CURRENCIES[0];

function resolveCurrency(code?: string): Currency {
  const key = (code ?? DEFAULT_CURRENCY.code).toUpperCase();
  const match = CURRENCIES.find((currency) => currency.code === key);
  if (match) return match;
  return /^[A-Z]{3}$/.test(key)
    ? { code: key, name: key, locale: "en-US", symbol: key }
    : DEFAULT_CURRENCY;
}

/** Formats integer minor units as currency. Division by 100 is display-only. */
export function formatMoney(minor: number, currency?: string, locale?: string): string {
  if (!Number.isFinite(minor)) return "—";
  const resolved = resolveCurrency(currency);
  return new Intl.NumberFormat(locale ?? resolved.locale, {
    style: "currency",
    currency: resolved.code,
  }).format(minor / 100);
}

/** Compact currency for dashboards, e.g. ₱1.2K. */
export function formatMoneyCompact(minor: number, currency?: string, locale?: string): string {
  if (!Number.isFinite(minor)) return "—";
  const resolved = resolveCurrency(currency);
  return new Intl.NumberFormat(locale ?? resolved.locale, {
    style: "currency",
    currency: resolved.code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 100);
}

const MAX_MINOR = Number.MAX_SAFE_INTEGER;

/**
 * Parses user input like "1,234.56" into integer minor units using integer
 * string math, so no float rounding can creep in. Returns null for input that
 * has more than 2 meaningful decimals.
 */
export function parseMoneyInput(value: string): number | null {
  let text = value.replace(/[^0-9.,-]/g, "");
  if (text === "") return null;

  let negative = false;
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }
  if (text.includes("-")) return null;

  text = text.replace(/,/g, "");
  const parts = text.split(".");
  if (parts.length > 2) return null;

  const intPart = parts[0] ?? "";
  let decPart = parts[1] ?? "";
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart)) return null;
  if (intPart === "" && decPart === "") return null;

  if (decPart.length > 2) {
    if (/[^0]/.test(decPart.slice(2))) return null;
    decPart = decPart.slice(0, 2);
  }

  const total = BigInt(intPart || "0") * 100n + BigInt(decPart.padEnd(2, "0") || "0");
  const signed = negative ? -total : total;
  if (signed > BigInt(MAX_MINOR)) return MAX_MINOR;
  if (signed < -BigInt(MAX_MINOR)) return -MAX_MINOR;
  return Number(signed);
}

/** Converts integer minor units back to an editable string: 123456 -> "1234.56". */
export function moneyToInput(minor: number): string {
  if (!Number.isFinite(minor)) return "";
  const rounded = Math.trunc(minor);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function currencySymbol(code: string): string {
  const key = code.toUpperCase();
  const match = CURRENCIES.find((currency) => currency.code === key);
  return match ? match.symbol : key;
}
