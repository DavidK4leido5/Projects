import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("landing page presents the product, CTA, and tab tour", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /Know where your money goes/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started free" }).first()).toHaveAttribute(
    "href",
    "/signup",
  );
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute(
    "href",
    "/login",
  );

  await page.getByRole("tab", { name: "Reports", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Reports", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText(/Pick a period and sections/i)).toBeVisible();
});

test("signed-in visitors get the dashboard action", async ({ page }) => {
  await login(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Go to dashboard" }).first()).toHaveAttribute(
    "href",
    "/dashboard",
  );
});

test("mobile menu opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Features" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
