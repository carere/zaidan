import { expect, test } from "@playwright/test";

test.describe("Navigation Menu", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5177/ui/navigation-menu");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example - Verify Navigation Menu Structure
    // ------------------------------------------------------------

    // 1. Get the navigation menu
    const navigationMenu = page.locator('[data-slot="navigation-menu"]');
    await expect(navigationMenu).toBeVisible();

    // 2. Verify all menu triggers are visible
    await expect(navigationMenu.getByRole("menuitem", { name: "Getting started" })).toBeVisible();
    await expect(navigationMenu.getByRole("menuitem", { name: "Components" })).toBeVisible();
    await expect(navigationMenu.getByRole("menuitem", { name: "With Icon" })).toBeVisible();

    // 3. Verify the 'Documentation' link is visible
    await expect(navigationMenu.getByRole("link", { name: "Documentation" })).toBeVisible();

    // 4. Click 'Getting started' to open dropdown
    await navigationMenu.getByRole("menuitem", { name: "Getting started" }).click();

    // 5. Wait for portal content to render
    await page.waitForTimeout(500);

    // 6. Check if menu content is visible (rendered via portal)
    const menuContent = page.locator('[data-slot="navigation-menu-content"]');
    await expect(menuContent.first()).toBeVisible();

    // 7. Click elsewhere to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Verify Sections
    // ------------------------------------------------------------

    // 8. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 9. Wait for the page to load
    await page.waitForTimeout(500);

    // 10. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Navigation Menu", level: 1 })).toBeVisible();

    // 11. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 12. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 13. Verify the Link section is present
    await expect(page.getByRole("heading", { name: "Link", level: 2 })).toBeVisible();

    // 14. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 15. Scroll to bottom of page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 16. Wait for scroll
    await page.waitForTimeout(300);

    // 17. Verify the Basic example heading is present
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
  });
});
