import { formatMoney, formatMoneyCompact } from "@repo/finance";

/**
 * Helvetica's WinAnsi encoding has no peso, rupee, or dirham glyph. Fall back to
 * the ISO code so the amount is still readable instead of a blank box.
 */
const GLYPH_FALLBACKS: Record<string, string> = {
  "₱": "PHP ",
  "₹": "INR ",
  "د.إ": "AED ",
};

function asciiSafe(text: string): string {
  return text.replace(/₱|₹|د\.إ/g, (symbol) => GLYPH_FALLBACKS[symbol] ?? symbol);
}

export function pdfMoney(minor: number, currency: string, locale: string): string {
  return asciiSafe(formatMoney(minor, currency, locale));
}

export function pdfMoneyCompact(minor: number, currency: string, locale: string): string {
  return asciiSafe(formatMoneyCompact(minor, currency, locale));
}
