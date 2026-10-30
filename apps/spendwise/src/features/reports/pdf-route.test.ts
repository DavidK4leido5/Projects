import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  fetchReportData: vi.fn(),
  recordReport: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn() }));

vi.mock("@/lib/pdf/document", () => ({ buildReportDocument: vi.fn() }));

vi.mock("@/lib/report-data", () => ({
  reportRequestInput: { safeParse: mocks.safeParse },
  fetchReportData: mocks.fetchReportData,
  recordReport: mocks.recordReport,
}));

const body = JSON.stringify({
  type: "monthly_summary",
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
  includeTransactions: false,
  includeCharts: true,
  paperSize: "A4",
});

function request() {
  return new Request("http://localhost/api/reports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/reports/pdf", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.fetchReportData.mockReset();
    mocks.recordReport.mockReset();
    mocks.safeParse.mockReset();
  });

  it("returns 401 when the visitor is not signed in", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/reports/pdf/route");

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.fetchReportData).not.toHaveBeenCalled();
  }, 15_000);
});
