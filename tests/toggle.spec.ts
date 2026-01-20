import { expect, test } from "@playwright/test";

test.describe("Toggle Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/toggle");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the Bold toggle is pressed by default
    const boldToggle = basicSection.getByRole("button", { name: "Toggle bold" });
    await expect(boldToggle).toHaveAttribute("aria-pressed", "true");

    // 3. Click the Italic toggle
    const italicToggle = basicSection.getByRole("button", { name: "Toggle italic" });
    await italicToggle.hover();
    await page.waitForTimeout(300);
    await italicToggle.click();

    // 4. Verify the Italic toggle is now pressed
    await expect(italicToggle).toHaveAttribute("aria-pressed", "true");

    // 5. Click the Underline toggle
    const underlineToggle = basicSection.getByRole("button", { name: "Toggle underline" });
    await underlineToggle.hover();
    await page.waitForTimeout(300);
    await underlineToggle.click();

    // 6. Verify the Underline toggle is now pressed
    await expect(underlineToggle).toHaveAttribute("aria-pressed", "true");

    // 7. Toggle Bold off
    await boldToggle.hover();
    await page.waitForTimeout(300);
    await boldToggle.click();

    // 8. Verify Bold is now unpressed
    await expect(boldToggle).toHaveAttribute("aria-pressed", "false");

    // ------------------------------------------------------------
    // Outline Example
    // ------------------------------------------------------------

    // 9. Get the outline section
    const outlineSection = page.getByText("Outline", { exact: true }).locator("..");

    // 10. Click the Italic outline toggle
    const italicOutlineToggle = outlineSection.getByRole("button", { name: "Toggle italic" });
    await italicOutlineToggle.hover();
    await page.waitForTimeout(300);
    await italicOutlineToggle.click();

    // 11. Verify the Italic outline toggle is pressed
    await expect(italicOutlineToggle).toHaveAttribute("aria-pressed", "true");

    // 12. Click the Bold outline toggle
    const boldOutlineToggle = outlineSection.getByRole("button", { name: "Toggle bold" });
    await boldOutlineToggle.hover();
    await page.waitForTimeout(300);
    await boldOutlineToggle.click();

    // 13. Verify the Bold outline toggle is pressed
    await expect(boldOutlineToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Sizes Example
    // ------------------------------------------------------------

    // 14. Get the sizes section
    const sizesSection = page.getByText("Sizes", { exact: true }).locator("..");

    // 15. Click the Small toggle
    const smallToggle = sizesSection.getByRole("button", { name: "Toggle small" });
    await smallToggle.hover();
    await page.waitForTimeout(300);
    await smallToggle.click();

    // 16. Verify the Small toggle is pressed
    await expect(smallToggle).toHaveAttribute("aria-pressed", "true");

    // 17. Click the Default toggle
    const defaultToggle = sizesSection.getByRole("button", { name: "Toggle default" });
    await defaultToggle.hover();
    await page.waitForTimeout(300);
    await defaultToggle.click();

    // 18. Verify the Default toggle is pressed
    await expect(defaultToggle).toHaveAttribute("aria-pressed", "true");

    // 19. Click the Large toggle
    const largeToggle = sizesSection.getByRole("button", { name: "Toggle large" });
    await largeToggle.hover();
    await page.waitForTimeout(300);
    await largeToggle.click();

    // 20. Verify the Large toggle is pressed
    await expect(largeToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // With Button Text Example
    // ------------------------------------------------------------

    // 21. Get the with button text section
    const withButtonTextSection = page.getByText("With Button Text", { exact: true }).locator("..");

    // 22. Verify buttons exist alongside toggles
    await expect(
      withButtonTextSection.getByRole("button", { name: "Button" }).first(),
    ).toBeVisible();

    // 23. Click the sm toggle
    const smToggle = withButtonTextSection.getByRole("button", { name: "Toggle sm" });
    await smToggle.hover();
    await page.waitForTimeout(300);
    await smToggle.click();

    // 24. Verify the sm toggle is pressed
    await expect(smToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // With Button Icon Example
    // ------------------------------------------------------------

    // 25. Get the with button icon section
    const withButtonIconSection = page.getByText("With Button Icon", { exact: true }).locator("..");

    // 26. Click the sm icon toggle
    const smIconToggle = withButtonIconSection.getByRole("button", { name: "Toggle sm icon" });
    await smIconToggle.hover();
    await page.waitForTimeout(300);
    await smIconToggle.click();

    // 27. Verify the sm icon toggle is pressed
    await expect(smIconToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // With Button Icon + Text Example
    // ------------------------------------------------------------

    // 28. Get the with button icon + text section
    const withButtonIconTextSection = page
      .getByText("With Button Icon + Text", { exact: true })
      .locator("..");

    // 29. Click the sm icon text toggle
    const smIconTextToggle = withButtonIconTextSection.getByRole("button", {
      name: "Toggle sm icon text",
    });
    await smIconTextToggle.hover();
    await page.waitForTimeout(300);
    await smIconTextToggle.click();

    // 30. Verify the sm icon text toggle is pressed
    await expect(smIconTextToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 31. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 32. Verify the disabled toggle is disabled
    const disabledToggle = disabledSection.getByRole("button", { name: "Toggle disabled" }).first();
    await expect(disabledToggle).toBeDisabled();

    // 33. Verify the disabled outline toggle is disabled
    const disabledOutlineToggle = disabledSection.getByRole("button", {
      name: "Toggle disabled outline",
    });
    await expect(disabledOutlineToggle).toBeDisabled();

    // ------------------------------------------------------------
    // With Icon Example
    // ------------------------------------------------------------

    // 34. Get the with icon section
    const withIconSection = page.getByText("With Icon", { exact: true }).locator("..");

    // 35. Verify the bookmark toggle is pressed by default
    const bookmarkToggle = withIconSection.getByRole("button", { name: "Toggle bookmark" }).first();
    await expect(bookmarkToggle).toHaveAttribute("aria-pressed", "true");

    // 36. Click to toggle off the bookmark
    await bookmarkToggle.hover();
    await page.waitForTimeout(300);
    await bookmarkToggle.click();

    // 37. Verify the bookmark toggle is now unpressed
    await expect(bookmarkToggle).toHaveAttribute("aria-pressed", "false");

    // 38. Click the bookmark outline toggle
    const bookmarkOutlineToggle = withIconSection.getByRole("button", {
      name: "Toggle bookmark outline",
    });
    await bookmarkOutlineToggle.hover();
    await page.waitForTimeout(300);
    await bookmarkOutlineToggle.click();

    // 39. Verify the bookmark outline toggle is pressed
    await expect(bookmarkOutlineToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 40. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 41. Wait for the docs page to load
    await page.waitForTimeout(500);

    // 42. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Toggle", level: 1 })).toBeVisible();

    // 43. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 44. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 45. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 46. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 47. Wait for scroll animation
    await page.waitForTimeout(500);

    // 48. Verify we can see the With Icon example in docs
    await expect(page.getByRole("heading", { name: "With Icon", level: 3 })).toBeVisible();
  });
});
