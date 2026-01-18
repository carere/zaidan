import { expect, test } from "@playwright/test";

test.describe("Item Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5177/ui/item");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Verify All Example Sections Are Present
    // ------------------------------------------------------------

    // Default variants
    await expect(page.getByText("Default", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Outline", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Muted", { exact: true }).first()).toBeVisible();

    // Size variants
    await expect(page.getByText("Small", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Outline - Small", { exact: true })).toBeVisible();
    await expect(page.getByText("Muted - Small", { exact: true })).toBeVisible();

    // Extra small variants
    await expect(page.getByText("Extra Small", { exact: true })).toBeVisible();
    await expect(page.getByText("Outline - Extra Small", { exact: true })).toBeVisible();
    await expect(page.getByText("Muted - Extra Small", { exact: true })).toBeVisible();

    // Link variants
    await expect(page.getByText("As Link", { exact: true })).toBeVisible();
    await expect(page.getByText("Outline - As Link", { exact: true })).toBeVisible();
    await expect(page.getByText("Muted - As Link", { exact: true })).toBeVisible();

    // Group variants
    await expect(page.getByText("ItemGroup", { exact: true })).toBeVisible();
    await expect(page.getByText("Outline - ItemGroup", { exact: true })).toBeVisible();
    await expect(page.getByText("Muted - ItemGroup", { exact: true })).toBeVisible();

    // Separator
    await expect(page.getByText("ItemSeparator", { exact: true })).toBeVisible();

    // Header and Footer
    await expect(page.getByText("ItemHeader", { exact: true })).toBeVisible();
    await expect(page.getByText("ItemFooter", { exact: true })).toBeVisible();
    await expect(page.getByText("ItemHeader + ItemFooter", { exact: true })).toBeVisible();

    // Image variants
    await expect(page.getByText("Default - ItemMedia image", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Outline - ItemMedia image", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Muted - ItemMedia image", { exact: true })).toBeVisible();

    // ------------------------------------------------------------
    // Test Item Interactions
    // ------------------------------------------------------------

    // 1. Test button click in Default section
    const defaultSection = page.getByText("Default", { exact: true }).first().locator("..");
    const actionButton = defaultSection
      .getByRole("button", { name: "Action", exact: true })
      .first();
    await actionButton.hover();
    await page.waitForTimeout(200);
    await expect(actionButton).toBeVisible();

    // 2. Test link items in As Link section
    const asLinkSection = page.getByText("As Link", { exact: true }).locator("..");
    const linkItem = asLinkSection.getByRole("link", { name: /Title Only/ }).first();
    await expect(linkItem).toBeVisible();
    await linkItem.hover();
    await page.waitForTimeout(200);

    // 3. Test ItemSeparator section has separators
    const separatorSection = page.getByText("ItemSeparator", { exact: true }).locator("..");
    await expect(separatorSection.getByRole("separator").first()).toBeVisible();

    // 4. Scroll to bottom to verify all examples render
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 5. Verify the last section is visible
    await expect(page.getByText("Muted - ItemMedia image", { exact: true })).toBeVisible();
  });
});
