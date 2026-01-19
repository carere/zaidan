import { expect, test } from "@playwright/test";

test.describe("Slider Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/slider");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ------------------------------------------------------------
    // Verify All Example Titles are Visible
    // ------------------------------------------------------------

    // 1. Verify the Basic example title is visible
    await expect(page.getByText("Basic", { exact: true })).toBeVisible();

    // 2. Verify the Range example title is visible
    await expect(page.getByText("Range", { exact: true })).toBeVisible();

    // 3. Verify the Multiple Thumbs example title is visible
    await expect(page.getByText("Multiple Thumbs", { exact: true })).toBeVisible();

    // 4. Verify the Vertical example title is visible
    await expect(page.getByText("Vertical", { exact: true })).toBeVisible();

    // 5. Verify the Controlled example title is visible
    await expect(page.getByText("Controlled", { exact: true })).toBeVisible();

    // 6. Verify the Disabled example title is visible
    await expect(page.getByText("Disabled", { exact: true }).first()).toBeVisible();

    // ------------------------------------------------------------
    // Verify Sliders are Rendered
    // ------------------------------------------------------------

    // 7. Verify sliders are visible on the page
    const sliders = page.locator('[data-slot="slider"]');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThanOrEqual(6); // At least 6 sliders (7 including 2 vertical)

    // 8. Verify first slider is visible
    await expect(sliders.first()).toBeVisible();

    // 9. Interact with the first slider - hover over thumb
    const basicThumb = sliders.first().locator('[data-slot="slider-thumb"]').first();
    await basicThumb.hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Verify Specific Features
    // ------------------------------------------------------------

    // 10. Verify the Temperature label is visible (Controlled example)
    await expect(page.getByText("Temperature")).toBeVisible();

    // 11. Verify a disabled slider thumb exists on the page
    const disabledThumb = page.locator('[data-slot="slider-thumb"][data-disabled]');
    await expect(disabledThumb).toBeVisible();

    // 12. Verify vertical sliders have correct orientation
    const verticalSliders = page.locator('[data-slot="slider"][data-orientation="vertical"]');
    await expect(verticalSliders).toHaveCount(2);

    // 13. Hover over a vertical slider thumb
    await verticalSliders.first().locator('[data-slot="slider-thumb"]').first().hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 14. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 15. Wait for docs to load
    await page.waitForTimeout(2000);

    // 16. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Slider", level: 1 })).toBeVisible();

    // 17. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 18. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 19. Verify the Props section is present
    await expect(page.getByRole("heading", { name: "Props", level: 2 })).toBeVisible();

    // 20. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 21. Scroll to bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 22. Verify the Disabled example heading is visible (last example)
    await expect(page.getByRole("heading", { name: "Disabled", level: 3 })).toBeVisible();
  });
});
