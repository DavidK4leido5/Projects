import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = process.env.E2E_EMAIL ?? "demo@spendwise.app";
export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "SpendWise2026!";

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
