import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5179/ui/skeleton");
    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Preview Page - Verify All Example Sections
    // ------------------------------------------------------------

    // Get the main content area to scope our searches
    const main = page.getByRole("main");

    // 1. Verify the Avatar section is visible
    await expect(main.getByText("Avatar", { exact: true })).toBeVisible();

    // 2. Verify the Card section is visible
    await expect(main.getByText("Card", { exact: true })).toBeVisible();

    // 3. Verify the Text section is visible
    await expect(main.getByText("Text", { exact: true })).toBeVisible();

    // 4. Verify the Form section is visible
    await expect(main.getByText("Form", { exact: true })).toBeVisible();

    // 5. Verify the Table section is visible
    await expect(main.getByText("Table", { exact: true })).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page - Toggle and Verify Documentation
    // ------------------------------------------------------------

    // 6. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 7. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Skeleton", level: 1 })).toBeVisible();

    // 8. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 9. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 10. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page - Scroll and Verify All Example Documentation
    // ------------------------------------------------------------

    // 11. Scroll to the bottom of the page to see all example documentation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 12. Wait for scroll to complete
    await page.waitForTimeout(300);

    // 13. Verify the Avatar example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Avatar", level: 3 })).toBeVisible();

    // 14. Verify the Card example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Card", level: 3 })).toBeVisible();

    // 15. Verify the Text example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Text", level: 3 })).toBeVisible();

    // 16. Verify the Form example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Form", level: 3 })).toBeVisible();

    // 17. Verify the Table example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Table", level: 3 })).toBeVisible();
  });
});
