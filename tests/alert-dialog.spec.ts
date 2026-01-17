import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5175/ui/alert-dialog");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the 'Default' button
    await basicSection.getByRole("button", { name: "Default", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Default' button
    await basicSection.getByRole("button", { name: "Default", exact: true }).click();

    // 5. Verify the alert dialog is visible
    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();

    // 6. Verify the 'Dismiss' button is visible
    await expect(alertDialog.getByRole("button", { name: "Dismiss" })).toBeVisible();

    // 7. Hover over the 'Dismiss' button
    await alertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 8. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 9. Click the 'Dismiss' button
    await alertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 10. Verify the alert dialog is hidden
    await expect(alertDialog).toBeHidden();

    // ------------------------------------------------------------
    // Other Examples testing goes here...
    // ------------------------------------------------------------
  });
});
