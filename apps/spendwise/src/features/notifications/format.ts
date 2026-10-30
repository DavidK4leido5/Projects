const LOCALES: Record<string, string> = {
  "en-ph": "en-PH",
  "en-us": "en-US",
  "en-gb": "en-GB",
};

/**
 * Notification timestamps are rendered on the server and hydrated on the
 * client. Pin both to UTC so a Manila browser and a UTC server agree.
 */
export function formatNotificationDate(value: Date | string, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(LOCALES[locale.toLowerCase()] ?? "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
