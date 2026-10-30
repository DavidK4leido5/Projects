"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  formatDate,
  resolvePreset,
  toDateInput,
  type PeriodPreset,
  type ReportRequest,
} from "@repo/finance";
import {
  REPORT_PAPER_SIZES,
  REPORT_TYPE_META,
  reportFileName,
  toReportRequest,
  type ReportHistoryItem,
  type ReportType,
} from "@/features/reports/report-meta";

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_6_months", label: "Last 6 months" },
  { id: "ytd", label: "Year to date" },
];

type ReportBuilderProps = {
  accounts: { id: string; name: string; type: string }[];
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  history: ReportHistoryItem[];
  currency: string;
  locale: string;
};

function errorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const value = (body as { error?: unknown }).error;
  return typeof value === "string" ? value : null;
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export function ReportBuilder({
  accounts,
  categories,
  history,
  currency,
  locale,
}: ReportBuilderProps) {
  const router = useRouter();
  const initial = resolvePreset("this_month");
  const [type, setType] = useState<ReportType>("monthly_summary");
  const [preset, setPreset] = useState<PeriodPreset | "custom">("this_month");
  const [dateFrom, setDateFrom] = useState(toDateInput(initial.from));
  const [dateTo, setDateTo] = useState(toDateInput(initial.to));
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const [pending, setPending] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("spendwise-report.pdf");
  const previousUrl = useRef<string | null>(null);

  function currentRequest(): ReportRequest {
    return {
      type,
      dateFrom,
      dateTo,
      accountIds: accountIds.length > 0 ? accountIds : undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      includeTransactions,
      includeCharts,
      paperSize,
    };
  }

  async function fetchPdf(request: ReportRequest): Promise<{ blob: Blob; filename: string }> {
    const response = await fetch("/api/reports/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new Error(errorMessage(body) ?? "Could not generate the report. Try again.");
    }
    return {
      blob: await response.blob(),
      filename: reportFileName(request.type, request.dateFrom, request.dateTo, "pdf"),
    };
  }

  function showPreview(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    previousUrl.current = url;
    setPreviewUrl(url);
    setPreviewName(filename);
  }

  async function generate(request: ReportRequest = currentRequest()) {
    setPending(true);
    setError(null);
    try {
      const { blob, filename } = await fetchPdf(request);
      showPreview(blob, filename);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the report.");
    } finally {
      setPending(false);
    }
  }

  async function download(request: ReportRequest, key: string) {
    setDownloading(key);
    setError(null);
    try {
      const { blob, filename } = await fetchPdf(request);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download the report.");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadCsv() {
    setPending(true);
    setError(null);
    try {
      const request = currentRequest();
      const response = await fetch("/api/reports/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new Error(errorMessage(body) ?? "Could not export the report. Try again.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = reportFileName(request.type, request.dateFrom, request.dateTo, "csv");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export the report.");
    } finally {
      setPending(false);
    }
  }

  function applyPreset(next: PeriodPreset) {
    const range = resolvePreset(next);
    setPreset(next);
    setDateFrom(toDateInput(range.from));
    setDateTo(toDateInput(range.to));
  }

  function regenerate(item: ReportHistoryItem) {
    const request = toReportRequest(item);
    setType(request.type);
    setDateFrom(request.dateFrom);
    setDateTo(request.dateTo);
    setPreset("custom");
    setAccountIds(request.accountIds ?? []);
    setCategoryIds(request.categoryIds ?? []);
    setIncludeTransactions(request.includeTransactions);
    setIncludeCharts(request.includeCharts);
    setPaperSize(request.paperSize);
    setRegeneratingId(item.id);
    void generate(request).finally(() => setRegeneratingId(null));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Build a report</CardTitle>
          <CardDescription>
            Pick a period and the sections you need, then generate a print-ready PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void generate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-type">Report type</Label>
                <Select value={type} onValueChange={(value) => setType(value as ReportType)}>
                  <SelectTrigger id="report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REPORT_TYPE_META) as ReportType[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {REPORT_TYPE_META[value].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {REPORT_TYPE_META[type].description}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="paper-size">Paper size</Label>
                <Select
                  value={paperSize}
                  onValueChange={(value) => setPaperSize(value === "Letter" ? "Letter" : "A4")}
                >
                  <SelectTrigger id="paper-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_PAPER_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Both print cleanly; A4 is the default.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Date range</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={preset === item.id ? "secondary" : "outline"}
                    onClick={() => applyPreset(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-from" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="report-from"
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setPreset("custom");
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-to" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="report-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setPreset("custom");
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Accounts</legend>
                <p className="text-xs text-muted-foreground">
                  {accountIds.length === 0
                    ? "All accounts are included."
                    : accountIds.length + " selected."}
                </p>
                <div className="max-h-44 overflow-y-auto rounded-md border border-border p-2">
                  {accounts.length === 0 ? (
                    <p className="p-1 text-xs text-muted-foreground">No accounts yet.</p>
                  ) : (
                    accounts.map((account) => (
                      <label
                        key={account.id}
                        htmlFor={"report-account-" + account.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted/60"
                      >
                        <Checkbox
                          id={"report-account-" + account.id}
                          checked={accountIds.includes(account.id)}
                          onCheckedChange={() =>
                            setAccountIds((list) => toggleId(list, account.id))
                          }
                        />
                        <span className="truncate">{account.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Categories</legend>
                <p className="text-xs text-muted-foreground">
                  {categoryIds.length === 0
                    ? "All categories are included."
                    : categoryIds.length + " selected."}
                </p>
                <div className="max-h-44 overflow-y-auto rounded-md border border-border p-2">
                  {categories.length === 0 ? (
                    <p className="p-1 text-xs text-muted-foreground">No categories yet.</p>
                  ) : (
                    categories.map((category) => (
                      <label
                        key={category.id}
                        htmlFor={"report-category-" + category.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted/60"
                      >
                        <Checkbox
                          id={"report-category-" + category.id}
                          checked={categoryIds.includes(category.id)}
                          onCheckedChange={() =>
                            setCategoryIds((list) => toggleId(list, category.id))
                          }
                        />
                        <span className="truncate">{category.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="include-transactions" className="text-sm">
                    Detailed transactions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Append every transaction, capped at 2,000 rows.
                  </p>
                </div>
                <Switch
                  id="include-transactions"
                  checked={includeTransactions}
                  onCheckedChange={setIncludeTransactions}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="include-charts" className="text-sm">
                    Charts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add the cash flow bars and the category donut.
                  </p>
                </div>
                <Switch
                  id="include-charts"
                  checked={includeCharts}
                  onCheckedChange={setIncludeCharts}
                />
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Report not generated</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Generated on demand for {currency}; nothing is cached.
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void downloadCsv()}
                  disabled={pending}
                  className="w-full sm:w-auto"
                >
                  <Download className="size-4" aria-hidden />
                  Download CSV
                </Button>
                <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="size-4" aria-hidden />
                  )}
                  {pending ? "Generating" : "Generate PDF"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review the PDF before downloading it.</CardDescription>
          </div>
          {previewUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={previewUrl} download={previewName}>
                <Download className="size-4" aria-hidden />
                Download
              </a>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-[420px] w-full" />
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title="Report preview"
              className="h-[60vh] min-h-[360px] w-full rounded-md border border-border bg-card"
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No report yet"
              description="Choose a period above and generate a PDF to preview it here."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report history</CardTitle>
          <CardDescription>The last 20 reports you generated.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Generate your first report and it will show up here for a quick rerun or download."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead className="hidden sm:table-cell">Period</TableHead>
                    <TableHead className="hidden sm:table-cell">Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} aria-busy={regeneratingId === item.id || undefined}>
                      <TableCell>
                        <p className="text-sm font-medium">{REPORT_TYPE_META[item.type].label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.dateFrom} to {item.dateTo} · {item.options.paperSize ?? "A4"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {item.dateFrom} to {item.dateTo}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
                        {formatDate(item.createdAt, locale, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending || downloading === item.id}
                            onClick={() => regenerate(item)}
                            aria-busy={regeneratingId === item.id || undefined}
                            aria-label={"Regenerate " + REPORT_TYPE_META[item.type].label}
                          >
                            {regeneratingId === item.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <RefreshCw className="size-4" aria-hidden />
                            )}
                            <span className="hidden sm:inline">
                              {regeneratingId === item.id ? "Regenerating" : "Regenerate"}
                            </span>
                          </Button>
                          {regeneratingId === item.id ? (
                            <span
                              className="self-center text-xs text-muted-foreground sm:hidden"
                              aria-live="polite"
                            >
                              Regenerating
                            </span>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={downloading !== null}
                            onClick={() => void download(toReportRequest(item), item.id)}
                            aria-label={"Download " + REPORT_TYPE_META[item.type].label}
                          >
                            {downloading === item.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <Download className="size-4" aria-hidden />
                            )}
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
