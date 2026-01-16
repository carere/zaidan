import { expect, test } from "@playwright/test";

test.describe("Alert Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5175/ui/alert-dialog");
    // Wait for the app to hydrate
    await page.waitForLoadState("networkidle");
  });

  test("page loads with alert dialog examples", async ({ page }) => {
    await expect(page).toHaveTitle(/Zaidan/);
    await expect(page.getByText("Basic")).toBeVisible();
    await expect(page.getByRole("button", { name: "Default", exact: true })).toBeVisible();
  });

  test("basic example opens alert dialog when clicking Default button", async ({ page }) => {
    const defaultButton = page.getByRole("button", { name: "Default", exact: true });
    await defaultButton.click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
  });

  test("alert dialog displays correct title and description", async ({ page }) => {
    await page.getByRole("button", { name: "Default", exact: true }).click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await expect(
      alertDialog.getByRole("heading", { name: "Are you absolutely sure?" }),
    ).toBeVisible();
    await expect(
      alertDialog.getByText(
        "This action cannot be undone. This will permanently delete your account and remove your data from our servers.",
      ),
    ).toBeVisible();
  });
});
