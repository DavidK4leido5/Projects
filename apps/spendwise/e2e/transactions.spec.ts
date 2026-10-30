import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/budgets");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("adds a transaction with the quick-add dialog and deletes it", async ({ page }) => {
  await login(page);
  await page.goto("/transactions?new=1");

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const payee = "E2E " + Date.now();
  await dialog.getByLabel("Amount").fill("123.45");
  await dialog.getByLabel("Payee").fill(payee);
  await dialog.getByRole("combobox", { name: "Account" }).click();
  await page.getByRole("option", { name: "Cash", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Coffee", exact: true }).click();
  await dialog.getByRole("button", { name: "Add transaction" }).click();

  await expect(page.getByText("Transaction added")).toBeVisible();
  await expect(page.locator("tbody").getByText(payee)).toBeVisible();

  await page
    .getByRole("button", { name: "Actions for " + payee })
    .last()
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("Deleted " + payee)).toBeVisible();
  await expect(page.locator("tbody").getByText(payee)).toHaveCount(0);
});
