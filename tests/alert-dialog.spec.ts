import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5175/ui/alert-dialog");

    await page.waitForLoadState("networkidle");

    // Testing Basic Example

    await page.getByRole("button", { name: "Default", exact: true }).hover();

    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Default", exact: true }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible();

    await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible();

    await page.getByRole("button", { name: "Dismiss", exact: true }).hover();

    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Dismiss", exact: true }).click();

    await expect(page.getByRole("alertdialog")).toBeHidden();

    // Other Examples testing goes here...
  });
});
