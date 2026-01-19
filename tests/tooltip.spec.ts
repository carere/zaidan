import { expect, test } from "@playwright/test";

test.describe("Tooltip Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5177/ui/tooltip");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Focus on the 'Show Tooltip' button to trigger tooltip
    await basicSection.getByRole("button", { name: "Show Tooltip" }).focus();

    // 3. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 4. Verify the tooltip content is visible
    await expect(page.getByRole("tooltip", { name: "Add to library" })).toBeVisible();

    // 5. Press Escape to close the tooltip
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Sides Example
    // ------------------------------------------------------------

    // 6. Get the sides section
    const sidesSection = page.getByText("Sides", { exact: true }).locator("..");

    // 7. Test the 'top' button
    await sidesSection.getByRole("button", { name: "top" }).focus();
    await page.waitForTimeout(300);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");

    // 8. Test the 'right' button
    await sidesSection.getByRole("button", { name: "right" }).focus();
    await page.waitForTimeout(300);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");

    // 9. Test the 'bottom' button
    await sidesSection.getByRole("button", { name: "bottom" }).focus();
    await page.waitForTimeout(300);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");

    // 10. Test the 'left' button
    await sidesSection.getByRole("button", { name: "left" }).focus();
    await page.waitForTimeout(300);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // With Icon Example
    // ------------------------------------------------------------

    // 11. Get the with icon section
    const withIconSection = page.getByText("With Icon", { exact: true }).locator("..");

    // 12. Focus on the Info button
    await withIconSection.getByRole("button", { name: "Info" }).focus();

    // 13. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 14. Verify the tooltip shows "Additional information"
    await expect(page.getByRole("tooltip", { name: "Additional information" })).toBeVisible();

    // 15. Press Escape to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Long Content Example
    // ------------------------------------------------------------

    // 16. Get the long content section
    const longContentSection = page.getByText("Long Content", { exact: true }).locator("..");

    // 17. Focus on the 'Show Tooltip' button
    await longContentSection.getByRole("button", { name: "Show Tooltip" }).focus();

    // 18. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 19. Verify the tooltip is visible with long content
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.getByText("To learn more about how this works")).toBeVisible();

    // 20. Press Escape to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 21. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 22. Verify the disabled button is present
    await expect(disabledSection.getByRole("button", { name: "Disabled" })).toBeDisabled();

    // 23. Hover over the disabled button wrapper to trigger tooltip
    await disabledSection.locator('[data-slot="tooltip-trigger"]').hover();

    // 24. Wait for tooltip to appear
    await page.waitForTimeout(500);

    // 25. Verify tooltip shows unavailable message
    await expect(
      page.getByRole("tooltip", { name: "This feature is currently unavailable" }),
    ).toBeVisible();

    // 26. Click elsewhere to close the tooltip
    await page.click("body");

    // ------------------------------------------------------------
    // With Keyboard Shortcut Example
    // ------------------------------------------------------------

    // 26. Get the with keyboard shortcut section
    const keyboardSection = page.getByText("With Keyboard Shortcut", { exact: true }).locator("..");

    // 27. Focus on the save button
    await keyboardSection.getByRole("button").first().focus();

    // 28. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 29. Verify the tooltip shows keyboard shortcut
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.getByText("Save Changes")).toBeVisible();

    // 30. Press Escape to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // On Link Example
    // ------------------------------------------------------------

    // 31. Get the on link section
    const onLinkSection = page.getByText("On Link", { exact: true }).locator("..");

    // 32. Focus on the 'Learn more' link
    await onLinkSection.getByRole("link", { name: "Learn more" }).focus();

    // 33. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 34. Verify the tooltip shows documentation message
    await expect(
      page.getByRole("tooltip", { name: "Click to read the documentation" }),
    ).toBeVisible();

    // 35. Press Escape to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Formatted Content Example
    // ------------------------------------------------------------

    // 36. Get the formatted content section
    const formattedSection = page.getByText("Formatted Content", { exact: true }).locator("..");

    // 37. Focus on the 'Status' button
    await formattedSection.getByRole("button", { name: "Status" }).focus();

    // 38. Wait for tooltip to appear
    await page.waitForTimeout(300);

    // 39. Verify the tooltip shows formatted content
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
    await expect(page.getByText("Last updated 2 hours ago")).toBeVisible();

    // 40. Press Escape to close
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 41. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 42. Wait for docs page to load
    await page.waitForTimeout(500);

    // 43. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Tooltip", level: 1 })).toBeVisible();

    // 44. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 45. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 46. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 47. Scroll to the bottom to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // 48. Verify the last example section (Formatted Content) is visible
    await expect(page.getByRole("heading", { name: "Formatted Content", level: 3 })).toBeVisible();
  });
});
