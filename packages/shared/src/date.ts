/** Locale-aware date formatting. UMD-safe replacement for a date library. */
export function formatDate(value: Date | string | number, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
