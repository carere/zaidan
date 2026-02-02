import { expect, test } from "@playwright/test";

test.describe("Not Found Pages", () => {
  // ============================================================================
  // Basic 404 Page Display Tests
  // ============================================================================

  test("shows 404 page for nonexistent docs page", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("404 - Not Found")).toBeVisible();
    await expect(
      page.getByText(
        "The page you're looking for doesn't exist. Try searching for what you need below.",
      ),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Type / to search pages...")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();
  });

  test("shows 404 page for nonexistent UI component", async ({ page }) => {
    await page.goto("/ui/nonexistent-component");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("404 - Not Found")).toBeVisible();
    await expect(page.getByPlaceholder("Type / to search pages...")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();
  });

  test("shows 404 page for nonexistent UI docs", async ({ page }) => {
    await page.goto("/ui/nonexistent/docs");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("404 - Not Found")).toBeVisible();
    await expect(page.getByPlaceholder("Type / to search pages...")).toBeVisible();
  });

  test("shows 404 page for nonexistent preview", async ({ page }) => {
    await page.goto("/preview/kobalte/nonexistent");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("404 - Not Found")).toBeVisible();
  });

  // ============================================================================
  // Combobox Functionality Tests
  // ============================================================================

  test("combobox is visible and interactive", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Wait for hydration to complete
    await page.waitForLoadState("networkidle");

    // Verify the Combobox input is visible
    const comboboxInput = page.getByPlaceholder("Type / to search pages...");
    await expect(comboboxInput).toBeVisible();

    // Focus the input and type "/" to open the dropdown (all pathnames start with /)
    await comboboxInput.focus();
    await comboboxInput.type("/", { delay: 50 });

    // Verify the combobox content is displayed with options
    const comboboxContent = page.locator('[data-slot="combobox-content"]');
    await expect(comboboxContent).toBeVisible();

    // Verify at least one combobox item is present
    const comboboxItem = page.locator('[data-slot="combobox-item"]').first();
    await expect(comboboxItem).toBeVisible();
  });

  test("typing filters pages in combobox", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Wait for hydration to complete
    await page.waitForLoadState("networkidle");

    // Focus the Combobox input and type to open dropdown and filter by pathname
    const comboboxInput = page.getByPlaceholder("Type / to search pages...");
    await comboboxInput.focus();
    await comboboxInput.type("/ui/button", { delay: 50 });

    // Wait for the combobox content to be visible
    const comboboxContent = page.locator('[data-slot="combobox-content"]');
    await expect(comboboxContent).toBeVisible();

    // Verify filtered results appear (Button component pathname should be visible)
    await expect(comboboxContent.getByText("/ui/button", { exact: true })).toBeVisible();
  });

  test("selecting a page from combobox navigates correctly", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Wait for hydration to complete
    await page.waitForLoadState("networkidle");

    // Open the Combobox by typing the pathname
    const comboboxInput = page.getByPlaceholder("Type / to search pages...");
    await comboboxInput.focus();
    await comboboxInput.type("/ui/button", { delay: 50 });

    // Wait for the combobox content to be visible
    const comboboxContent = page.locator('[data-slot="combobox-content"]');
    await expect(comboboxContent).toBeVisible();

    // Click on the /ui/button option (exact match)
    await page
      .locator('[data-slot="combobox-item"]')
      .filter({ hasText: /^\/ui\/button$/ })
      .click();

    // Verify navigation to the Button component page (URL may include query params)
    // Use a longer timeout since UI pages can be slow to load
    await expect(page).toHaveURL(/\/ui\/button(\?|$)/, { timeout: 15000 });

    // Verify the 404 page is no longer showing
    await expect(page.getByText("404 - Not Found")).not.toBeVisible();
  });

  test("combobox closes when no matching pages found", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Wait for hydration to complete
    await page.waitForLoadState("networkidle");

    // First, type "/" to open the combobox (all pathnames start with /)
    const comboboxInput = page.getByPlaceholder("Type / to search pages...");
    await comboboxInput.focus();
    await comboboxInput.type("/", { delay: 50 });

    // Verify the combobox content opens
    const comboboxContent = page.locator('[data-slot="combobox-content"]');
    await expect(comboboxContent).toBeVisible();

    // Clear and search for non-existent page
    await comboboxInput.clear();
    await comboboxInput.type("xyznonexistentpage123", { delay: 50 });

    // Wait for the combobox to potentially update
    await page.waitForTimeout(300);

    // Verify no combobox items are visible (dropdown closes when no results)
    const comboboxItem = page.locator('[data-slot="combobox-item"]');
    await expect(comboboxItem).toHaveCount(0);
  });

  test("keyboard shortcut hint is visible", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Verify the "/" keyboard hint is visible within the Kbd component
    const kbdElement = page.locator("kbd").filter({ hasText: "/" });
    await expect(kbdElement).toBeVisible();
  });
});
