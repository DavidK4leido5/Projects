import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("generates a PDF report for the signed-in user", async ({ page }) => {
  await login(page);
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/reports/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "monthly_summary",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-31",
        includeTransactions: true,
        includeCharts: true,
        paperSize: "A4",
      }),
    });
    const buffer = await response.arrayBuffer();
    const head = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      bytes: buffer.byteLength,
      head,
    };
  });

  expect(result.status).toBe(200);
  expect(result.type).toContain("application/pdf");
  expect(result.bytes).toBeGreaterThan(5000);
  expect(result.head).toBe("%PDF-");
});

test("renders the reports page with a preview area", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate PDF" })).toBeVisible();
  await expect(page.getByText("No report yet")).toBeVisible();
});
