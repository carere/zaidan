import { expect, test } from "@playwright/test";

test.describe("Toggle Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5181/ui/toggle");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the bold toggle is pressed by default
    const boldToggle = basicSection.getByRole("button", { name: "Toggle bold" });
    await expect(boldToggle).toHaveAttribute("aria-pressed", "true");

    // 3. Click the italic toggle
    const italicToggle = basicSection.getByRole("button", { name: "Toggle italic" });
    await italicToggle.hover();
    await page.waitForTimeout(300);
    await italicToggle.click();

    // 4. Verify italic toggle is now pressed
    await expect(italicToggle).toHaveAttribute("aria-pressed", "true");

    // 5. Click the underline toggle
    const underlineToggle = basicSection.getByRole("button", { name: "Toggle underline" });
    await underlineToggle.hover();
    await page.waitForTimeout(300);
    await underlineToggle.click();

    // 6. Verify underline toggle is now pressed
    await expect(underlineToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Outline Example
    // ------------------------------------------------------------

    // 7. Get the outline section
    const outlineSection = page.getByText("Outline", { exact: true }).locator("..");

    // 8. Click the italic outline toggle
    const italicOutline = outlineSection.getByRole("button", { name: "Toggle italic" });
    await italicOutline.hover();
    await page.waitForTimeout(300);
    await italicOutline.click();

    // 9. Verify italic outline toggle is pressed
    await expect(italicOutline).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Sizes Example
    // ------------------------------------------------------------

    // 10. Get the sizes section
    const sizesSection = page.getByText("Sizes", { exact: true }).locator("..");

    // 11. Verify all size buttons are visible
    await expect(sizesSection.getByRole("button", { name: "Toggle small" })).toBeVisible();
    await expect(sizesSection.getByRole("button", { name: "Toggle default" })).toBeVisible();
    await expect(sizesSection.getByRole("button", { name: "Toggle large" })).toBeVisible();

    // 12. Click the small toggle
    const smallToggle = sizesSection.getByRole("button", { name: "Toggle small" });
    await smallToggle.hover();
    await page.waitForTimeout(300);
    await smallToggle.click();

    // 13. Verify small toggle is pressed
    await expect(smallToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 14. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 15. Verify disabled buttons are present and disabled
    const disabledToggle = disabledSection.getByRole("button", {
      name: "Toggle disabled",
      exact: true,
    });
    await expect(disabledToggle).toBeDisabled();

    const disabledOutline = disabledSection.getByRole("button", {
      name: "Toggle disabled outline",
      exact: true,
    });
    await expect(disabledOutline).toBeDisabled();

    // ------------------------------------------------------------
    // With Icon Example
    // ------------------------------------------------------------

    // 16. Get the with icon section
    const withIconSection = page.getByText("With Icon", { exact: true }).locator("..");

    // 17. Verify the bookmark toggle is pressed by default
    const bookmarkToggle = withIconSection.getByRole("button", {
      name: "Toggle bookmark",
      exact: true,
    });
    await expect(bookmarkToggle).toHaveAttribute("aria-pressed", "true");

    // 18. Click to unpressed
    await bookmarkToggle.hover();
    await page.waitForTimeout(300);
    await bookmarkToggle.click();

    // 19. Verify it's now unpressed
    await expect(bookmarkToggle).toHaveAttribute("aria-pressed", "false");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 20. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 21. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Toggle", level: 1 })).toBeVisible();

    // 22. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 23. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 24. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 25. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 26. Verify the API Reference section is present
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();
  });
});
