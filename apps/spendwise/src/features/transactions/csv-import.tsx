"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { importTransactions } from "@/features/transactions/actions";
import {
  csvMappingSchema,
  guessMapping,
  parseCsv,
  previewCsv,
  type CsvMapping,
  type ImportResult,
} from "@/features/transactions/csv";

const MAX_BYTES = 2 * 1024 * 1024;

type MappingState = {
  date: number;
  payee: number;
  amount: number;
  type: number;
  category: number;
  account: number;
  notes: number;
};

const EMPTY_MAPPING: MappingState = {
  date: -1,
  payee: -1,
  amount: -1,
  type: -1,
  category: -1,
  account: -1,
  notes: -1,
};

const FIELDS: { key: keyof MappingState; label: string; required?: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "payee", label: "Payee", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "account", label: "Account" },
  { key: "notes", label: "Notes" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function toCsvMapping(state: MappingState): CsvMapping | null {
  if (state.date < 0 || state.payee < 0 || state.amount < 0) return null;
  return {
    date: state.date,
    payee: state.payee,
    amount: state.amount,
    type: state.type >= 0 ? state.type : null,
    category: state.category >= 0 ? state.category : null,
    account: state.account >= 0 ? state.account : null,
    notes: state.notes >= 0 ? state.notes : null,
  };
}

export function CsvImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>(EMPTY_MAPPING);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const mapped = toCsvMapping(mapping);
    if (!text || !mapped) return null;
    return previewCsv(text, mapped, 10);
  }, [text, mapping]);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep the file under 2 MB.");
      return;
    }

    const content = await file.text();
    const table = parseCsv(content);
    const header = table[0] ?? [];
    if (table.length < 2 || header.length === 0) {
      setError("That file needs a header row and at least one data row.");
      return;
    }

    const guessed = guessMapping(header);
    setHeaders(header);
    setText(content);
    setFileName(file.name);
    setMapping({
      date: guessed.date,
      payee: guessed.payee,
      amount: guessed.amount,
      type: guessed.type ?? -1,
      category: guessed.category ?? -1,
      account: guessed.account ?? -1,
      notes: guessed.notes ?? -1,
    });
    setError("");
    setStep(2);
  }

  function runImport() {
    const mapped = toCsvMapping(mapping);
    if (!mapped) {
      setError("Map the date, payee, and amount columns first.");
      return;
    }
    const parsedMapping = csvMappingSchema.safeParse(mapped);
    if (!parsedMapping.success) {
      setError(parsedMapping.error.issues[0]?.message ?? "The mapping is not valid.");
      return;
    }

    startTransition(async () => {
      const response = await importTransactions({ csvText: text, mapping: mapped });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      setStep(3);
    });
  }

  function restart() {
    setStep(1);
    setText("");
    setFileName("");
    setHeaders([]);
    setMapping(EMPTY_MAPPING);
    setError("");
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {["Choose file", "Map columns", "Import"].map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const done = step > number;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 " +
                (active
                  ? "border-foreground text-foreground"
                  : done
                    ? "border-positive/40 text-positive"
                    : "border-border")
              }
            >
              <span className="font-medium">{done ? "✓" : number}</span>
              {label}
            </li>
          );
        })}
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Check the file</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-6">
          <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium">Choose a CSV file</p>
            <p className="text-xs text-muted-foreground">
              Up to 2 MB and 2,000 rows. The first row must be a header.
            </p>
          </div>
          <Input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            className="max-w-sm"
          />
        </div>
      ) : null}

      {step === 2 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span>{" "}
              <span className="text-muted-foreground">· {preview?.total ?? 0} rows</span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={restart}>
              Choose another file
            </Button>
          </div>

          <section
            aria-label="Column mapping"
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label htmlFor={"map-" + field.key} className="text-xs font-medium">
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </label>
                  <select
                    id={"map-" + field.key}
                    className={selectClass}
                    value={mapping[field.key]}
                    onChange={(event) =>
                      setMapping((previous) => ({
                        ...previous,
                        [field.key]: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={-1}>{field.required ? "Choose a column" : "Not mapped"}</option>
                    {headers.map((header, index) => (
                      <option key={header + "-" + index} value={index}>
                        {header || "Column " + (index + 1)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {preview ? (
            <section aria-label="Preview" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Showing the first {preview.rows.length} of {preview.total} rows. Rows with errors
                are skipped during import.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={row.row}>
                        <TableCell className="text-xs text-muted-foreground">{row.row}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{row.date}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {row.payee}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                          {row.amount}
                        </TableCell>
                        <TableCell className="text-sm">{row.type}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm">
                          {row.category}
                        </TableCell>
                        <TableCell className="text-xs text-destructive">
                          {row.errors.join(" ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Map the date, payee, and amount columns to preview the file.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={runImport} disabled={pending || !preview}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {pending ? "Importing" : "Import transactions"}
            </Button>
            <Button type="button" variant="outline" onClick={restart} disabled={pending}>
              Cancel
            </Button>
          </div>
        </>
      ) : null}

      {step === 3 && result ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <CheckCircle2 className="mt-0.5 size-5 text-positive" aria-hidden />
            <div>
              <p className="text-sm font-medium">
                Imported {result.imported} transaction{result.imported === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.skipped} skipped as duplicate{result.skipped === 1 ? "" : "s"},{" "}
                {result.errors.length} row error{result.errors.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          {result.errors.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium">Rows that were not imported</p>
              <ul className="flex flex-col gap-1 text-sm">
                {result.errors.map((row) => (
                  <li key={row.row} className="text-muted-foreground">
                    <span className="font-medium text-foreground">Row {row.row}:</span>{" "}
                    {row.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/transactions">View transactions</Link>
            </Button>
            <Button type="button" variant="outline" onClick={restart}>
              Import another file
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
