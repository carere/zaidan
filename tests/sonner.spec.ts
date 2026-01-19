import { expect, test } from "@playwright/test";

test.describe("Sonner Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/sonner");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the 'Show Toast' button
    await basicSection.getByRole("button", { name: "Show Toast", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Show Toast' button
    await basicSection.getByRole("button", { name: "Show Toast", exact: true }).click();

    // 5. Verify the toast is visible with correct text
    const toast = page.getByRole("status").filter({ hasText: /^Event has been created$/ });
    await expect(toast).toBeVisible();

    // 6. Wait for toast to disappear
    await page.waitForTimeout(4000);
    await expect(toast).toBeHidden();

    // ------------------------------------------------------------
    // With Description Example
    // ------------------------------------------------------------

    // 7. Get the with description section
    const withDescriptionSection = page
      .getByText("With Description", { exact: true })
      .locator("..");

    // 8. Hover over the 'Show Toast' button
    await withDescriptionSection.getByRole("button", { name: "Show Toast", exact: true }).hover();

    // 9. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 10. Click the 'Show Toast' button
    await withDescriptionSection.getByRole("button", { name: "Show Toast", exact: true }).click();

    // 11. Verify the toast is visible with correct text and description
    const toastWithDescription = page
      .getByRole("status")
      .filter({ hasText: "Monday, January 3rd at 6:00pm" });
    await expect(toastWithDescription).toBeVisible();
    await expect(toastWithDescription).toContainText("Event has been created");

    // 12. Wait for toast to disappear
    await page.waitForTimeout(4000);
    await expect(toastWithDescription).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 13. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 14. Wait for docs to load
    await page.waitForTimeout(1000);

    // 15. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Sonner" }).first()).toBeVisible();

    // 16. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation" }).first()).toBeVisible();

    // 17. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage" }).first()).toBeVisible();

    // 18. Scroll to the bottom of the page to see all content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 19. Wait for scroll and content
    await page.waitForTimeout(500);
  });
});
