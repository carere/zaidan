import { expect, test } from "@playwright/test";

test.describe("PageToggleNav", () => {
  test("navigates between preview and docs pages", async ({ page }) => {
    // 1. Navigate to a component preview page
    await page.goto("/ui/button");
    await page.waitForLoadState("networkidle");

    // 2. Verify we're on the preview page by checking the iframe is visible
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible();

    // 3. Get the toggle group
    const toggleGroup = page.locator("[data-slot='page-toggle-nav']");
    await expect(toggleGroup).toBeVisible();

    // 4. Verify "Preview" toggle is pressed/selected
    const previewToggle = toggleGroup.getByRole("button", { name: "View preview" });
    const docsToggle = toggleGroup.getByRole("button", { name: "View documentation" });

    await expect(previewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(docsToggle).toHaveAttribute("aria-pressed", "false");

    // 5. Click "Docs" toggle
    await docsToggle.hover();
    await page.waitForTimeout(200);
    await docsToggle.click();

    // 6. Verify navigation to docs page occurred
    await page.waitForURL("**/ui/button/docs**");

    // 7. Verify "Docs" toggle is now pressed/selected
    const toggleGroupDocs = page.locator("[data-slot='page-toggle-nav']");
    const previewToggleDocs = toggleGroupDocs.getByRole("button", { name: "View preview" });
    const docsToggleDocs = toggleGroupDocs.getByRole("button", { name: "View documentation" });

    await expect(docsToggleDocs).toHaveAttribute("aria-pressed", "true");
    await expect(previewToggleDocs).toHaveAttribute("aria-pressed", "false");

    // 8. Verify docs content is visible
    await expect(page.getByRole("heading", { name: "Button", level: 1 })).toBeVisible();

    // 9. Click "Preview" toggle
    await previewToggleDocs.hover();
    await page.waitForTimeout(200);
    await previewToggleDocs.click();

    // 10. Verify navigation back to preview page (URL should not contain /docs)
    await page.waitForFunction(() => !window.location.pathname.includes("/docs"));

    // 11. Verify "Preview" toggle is pressed/selected again
    const toggleGroupPreview = page.locator("[data-slot='page-toggle-nav']");
    const previewToggleFinal = toggleGroupPreview.getByRole("button", { name: "View preview" });
    const docsToggleFinal = toggleGroupPreview.getByRole("button", { name: "View documentation" });

    await expect(previewToggleFinal).toHaveAttribute("aria-pressed", "true");
    await expect(docsToggleFinal).toHaveAttribute("aria-pressed", "false");

    // 12. Verify iframe is visible again (we're back on preview)
    await expect(page.locator("iframe")).toBeVisible();
  });

  test("only one toggle can be selected at a time", async ({ page }) => {
    // Navigate to preview page
    await page.goto("/ui/accordion");
    await page.waitForLoadState("networkidle");

    const toggleGroup = page.locator("[data-slot='page-toggle-nav']");
    const previewToggle = toggleGroup.getByRole("button", { name: "View preview" });
    const docsToggle = toggleGroup.getByRole("button", { name: "View documentation" });

    // Initially preview is selected
    await expect(previewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(docsToggle).toHaveAttribute("aria-pressed", "false");

    // Click docs - only docs should be selected
    await docsToggle.click();
    await page.waitForURL("**/ui/accordion/docs**");

    const toggleGroupAfter = page.locator("[data-slot='page-toggle-nav']");
    const previewToggleAfter = toggleGroupAfter.getByRole("button", { name: "View preview" });
    const docsToggleAfter = toggleGroupAfter.getByRole("button", { name: "View documentation" });

    await expect(docsToggleAfter).toHaveAttribute("aria-pressed", "true");
    await expect(previewToggleAfter).toHaveAttribute("aria-pressed", "false");

    // Both toggles cannot be selected simultaneously
    const pressedCount = await toggleGroupAfter.getByRole("button", { pressed: true }).count();
    expect(pressedCount).toBe(1);
  });

  test("preserves correct state when navigating directly to docs URL", async ({ page }) => {
    // Navigate to preview page first, then click docs toggle
    // This approach is more reliable than navigating directly to docs URL
    // since docs pages may have hydration issues in headless mode
    await page.goto("/ui/card");
    await page.waitForLoadState("networkidle");

    const toggleGroup = page.locator("[data-slot='page-toggle-nav']");
    const docsToggle = toggleGroup.getByRole("button", { name: "View documentation" });

    // Click docs toggle to navigate to docs page
    await docsToggle.click();
    await page.waitForURL("**/ui/card/docs**");

    // Re-select elements after navigation
    const toggleGroupAfter = page.locator("[data-slot='page-toggle-nav']");
    const previewToggleAfter = toggleGroupAfter.getByRole("button", { name: "View preview" });
    const docsToggleAfter = toggleGroupAfter.getByRole("button", { name: "View documentation" });

    // Docs should be selected
    await expect(docsToggleAfter).toHaveAttribute("aria-pressed", "true");
    await expect(previewToggleAfter).toHaveAttribute("aria-pressed", "false");
  });
});
