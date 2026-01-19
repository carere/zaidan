import { expect, test } from "@playwright/test";

test.describe("Sidebar", () => {
  test("examples", async ({ page }) => {
    // Set mobile viewport to trigger mobile sidebar behavior
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("http://localhost:5183/ui/sidebar");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example - Sidebar Toggle
    // ------------------------------------------------------------

    // 1. Get the sidebar trigger button (use testId to avoid ambiguity with rail)
    const sidebarTrigger = page.getByTestId("sidebar-trigger");

    // 2. Hover over the 'Toggle Sidebar' button
    await sidebarTrigger.hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Toggle Sidebar' button
    await sidebarTrigger.click();

    // 5. Verify the sidebar dialog is visible
    const sidebarDialog = page.getByRole("dialog", { name: "Sidebar" });
    await expect(sidebarDialog).toBeVisible();

    // 6. Verify the Documentation button is visible with initial version
    await expect(
      sidebarDialog.getByRole("button", { name: /Documentation v1\.0\.1/ }),
    ).toBeVisible();

    // 7. Verify the search input is visible
    await expect(sidebarDialog.getByRole("textbox", { name: "Search" })).toBeVisible();

    // 8. Verify navigation sections are visible
    await expect(sidebarDialog.getByText("Getting Started")).toBeVisible();
    await expect(sidebarDialog.getByText("Building Your Application")).toBeVisible();
    await expect(sidebarDialog.getByText("API Reference")).toBeVisible();
    await expect(sidebarDialog.getByText("Architecture")).toBeVisible();

    // 9. Verify navigation links are visible
    await expect(sidebarDialog.getByRole("link", { name: "Installation" })).toBeVisible();
    await expect(sidebarDialog.getByRole("link", { name: "Routing" })).toBeVisible();
    await expect(sidebarDialog.getByRole("link", { name: "Components" })).toBeVisible();

    // ------------------------------------------------------------
    // Basic Example - Version Dropdown
    // ------------------------------------------------------------

    // 10. Click the Documentation dropdown button
    await sidebarDialog.getByRole("button", { name: /Documentation v1\.0\.1/ }).click();

    // 11. Verify the dropdown menu is visible with all versions
    const versionMenu = page.getByRole("menu", { name: /Documentation/ });
    await expect(versionMenu).toBeVisible();
    await expect(versionMenu.getByRole("menuitem", { name: "v1.0.1" })).toBeVisible();
    await expect(versionMenu.getByRole("menuitem", { name: "v1.1.0-alpha" })).toBeVisible();
    await expect(versionMenu.getByRole("menuitem", { name: "v2.0.0-beta1" })).toBeVisible();

    // 12. Wait for 300ms
    await page.waitForTimeout(300);

    // 13. Select a different version
    await versionMenu.getByRole("menuitem", { name: "v2.0.0-beta1" }).click();

    // 14. Verify the version changed
    await expect(
      sidebarDialog.getByRole("button", { name: /Documentation v2\.0\.0-beta1/ }),
    ).toBeVisible();
  });

  test("docs page", async ({ page }) => {
    await page.goto("http://localhost:5183/ui/sidebar");

    await page.waitForLoadState("networkidle");

    // Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // Wait for docs to load
    await page.waitForTimeout(500);

    // Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Sidebar", level: 1 })).toBeVisible();

    // Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // Verify the Structure section is present
    await expect(page.getByRole("heading", { name: "Structure", level: 2 })).toBeVisible();

    // Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();
  });
});
