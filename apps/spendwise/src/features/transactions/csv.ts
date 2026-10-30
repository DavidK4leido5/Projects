import { z } from "zod";
import { csvRowSchema, parseMoneyInput } from "@repo/finance";

export const csvMappingSchema = z.object({
  date: z.int().min(0, "Map a date column"),
  payee: z.int().min(0, "Map a payee column"),
  amount: z.int().min(0, "Map an amount column"),
  type: z.int().min(0).nullable(),
  category: z.int().min(0).nullable(),
  account: z.int().min(0).nullable(),
  notes: z.int().min(0).nullable(),
});

export type CsvMapping = z.infer<typeof csvMappingSchema>;

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export type CsvPreviewRow = {
  row: number;
  date: string;
  payee: string;
  amount: string;
  type: string;
  category: string;
  errors: string[];
};

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (!last || !last.every((cell) => cell.trim() === "")) break;
    rows.pop();
  }

  return rows;
}

export function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

function normalizedHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HEADER_ALIASES: Record<keyof CsvMapping, string[]> = {
  date: ["date", "transaction date", "posted date", "posting date", "time", "day"],
  payee: ["payee", "merchant", "description", "details", "particulars"],
  amount: ["amount", "value", "total", "amount php", "amount in php"],
  type: ["type", "transaction type", "kind", "direction"],
  category: ["category", "category name"],
  account: ["account", "account name", "from account", "source account"],
  notes: ["notes", "note", "memo", "remarks", "comment"],
};

/** First header matching each field's aliases, or -1 when there is no match. */
export function guessMapping(headers: string[]): CsvMapping {
  const normalized = headers.map(normalizedHeader);
  const pick = (field: keyof CsvMapping): number => {
    for (const alias of HEADER_ALIASES[field]) {
      const exact = normalized.findIndex((header) => header === alias);
      if (exact !== -1) return exact;
      const partial = normalized.findIndex(
        (header) => header.startsWith(alias + " ") || header.endsWith(" " + alias),
      );
      if (partial !== -1) return partial;
    }
    return -1;
  };

  return {
    date: pick("date"),
    payee: pick("payee"),
    amount: pick("amount"),
    type: pick("type"),
    category: pick("category"),
    account: pick("account"),
    notes: pick("notes"),
  };
}

/** "$1,234.56", "(45.00)", "-12.30", "₱500" -> integer minor units. */
export function parseCsvAmount(raw: string): number | null {
  let text = raw.trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/-$/.test(text)) {
    negative = true;
    text = text.slice(0, -1);
  }

  const minor = parseMoneyInput(text);
  if (minor === null) return null;
  return negative ? -Math.abs(minor) : minor;
}

/** ISO, M/D/YYYY, or anything Date can parse. Local noon so the day never shifts. */
export function parseCsvDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const year = Number(slash[3]);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeCsvType(value: string): "income" | "expense" | "transfer" | null {
  switch (value.trim().toLowerCase()) {
    case "income":
    case "credit":
    case "deposit":
    case "inflow":
      return "income";
    case "expense":
    case "debit":
    case "withdrawal":
    case "payment":
    case "outflow":
      return "expense";
    case "transfer":
      return "transfer";
    default:
      return null;
  }
}

export function normalizePayee(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

/** Same user, account, day, amount, and normalized payee means duplicate. */
export function duplicateKey(accountId: string, date: Date, amount: number, payee: string): string {
  return [accountId, dayKey(date), Math.abs(amount), normalizePayee(payee)].join("|");
}

function cell(cells: string[], index: number | null): string {
  if (index === null || index < 0 || index >= cells.length) return "";
  return cells[index] ?? "";
}

type RawRow = {
  date: string;
  payee: string;
  amount: string;
  type: string;
  category: string;
  account: string;
  notes: string;
};

export function readMappedRow(cells: string[], mapping: CsvMapping): RawRow {
  return {
    date: cell(cells, mapping.date).trim(),
    payee: cell(cells, mapping.payee).trim(),
    amount: cell(cells, mapping.amount).trim(),
    type: cell(cells, mapping.type).trim(),
    category: cell(cells, mapping.category).trim(),
    account: cell(cells, mapping.account).trim(),
    notes: cell(cells, mapping.notes).trim(),
  };
}

/** Schema plus date/amount checks, shared by the preview and the import action. */
export function validateMappedRow(row: RawRow): string[] {
  const errors: string[] = [];
  const type = row.type ? normalizeCsvType(row.type) : null;
  const candidate: Record<string, string> = {
    date: row.date,
    payee: row.payee,
    amount: row.amount,
  };
  if (row.type) candidate.type = type ?? row.type;
  if (row.category) candidate.category = row.category;
  if (row.account) candidate.account = row.account;
  if (row.notes) candidate.notes = row.notes;

  const parsed = csvRowSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(issue.message);
  }
  if (row.date && !parseCsvDate(row.date)) errors.push("Date is not valid.");
  const minor = parseCsvAmount(row.amount);
  if (minor === null) errors.push("Amount is not a number.");
  else if (minor === 0) errors.push("Amount cannot be zero.");
  if (type === "transfer") errors.push("Transfers cannot be imported from CSV.");
  return errors;
}

export function previewCsv(
  text: string,
  mapping: CsvMapping,
  limit = 10,
): { headers: string[]; rows: CsvPreviewRow[]; total: number } {
  const table = parseCsv(text);
  const headers = table[0] ?? [];
  const data = table.slice(1).filter((cells) => !isBlankRow(cells));

  return {
    headers,
    total: data.length,
    rows: data.slice(0, limit).map((cells, index) => {
      const mapped = readMappedRow(cells, mapping);
      return {
        row: index + 2,
        ...mapped,
        errors: validateMappedRow(mapped),
      };
    }),
  };
}

export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}
