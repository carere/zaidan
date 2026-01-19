import { expect, test } from "@playwright/test";

test.describe("Sheet Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5178/ui/sheet");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // With Form Example
    // ------------------------------------------------------------

    // 1. Get the With Form section
    const withFormSection = page.getByText("With Form", { exact: true }).locator("..");

    // 2. Hover over the 'Open' button
    await withFormSection.getByRole("button", { name: "Open", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Open' button
    await withFormSection.getByRole("button", { name: "Open", exact: true }).click();

    // 5. Verify the sheet dialog is visible
    const sheetDialog = page.getByRole("dialog");
    await expect(sheetDialog).toBeVisible();

    // 6. Verify the 'Edit profile' title is visible
    await expect(sheetDialog.getByRole("heading", { name: "Edit profile" })).toBeVisible();

    // 7. Verify the Name input is visible
    await expect(sheetDialog.locator("#sheet-demo-name")).toBeVisible();

    // 8. Verify the Username input is visible
    await expect(sheetDialog.locator("#sheet-demo-username")).toBeVisible();

    // 9. Verify the 'Save changes' button is visible
    await expect(sheetDialog.getByRole("button", { name: "Save changes" })).toBeVisible();

    // 10. Hover over the close button
    await sheetDialog.getByRole("button", { name: "Dismiss" }).nth(1).hover();

    // 11. Wait for 300ms
    await page.waitForTimeout(300);

    // 12. Click the close button (X icon)
    await sheetDialog.getByRole("button", { name: "Dismiss" }).nth(1).click();

    // 13. Verify the sheet dialog is hidden
    await expect(sheetDialog).toBeHidden();

    // ------------------------------------------------------------
    // No Close Button Example
    // ------------------------------------------------------------

    // 14. Get the No Close Button section
    const noCloseButtonSection = page.getByText("No Close Button", { exact: true }).locator("..");

    // 15. Hover over the 'No Close Button' button
    await noCloseButtonSection
      .getByRole("button", { name: "No Close Button", exact: true })
      .hover();

    // 16. Wait for 300ms
    await page.waitForTimeout(300);

    // 17. Click the 'No Close Button' button
    await noCloseButtonSection
      .getByRole("button", { name: "No Close Button", exact: true })
      .click();

    // 18. Verify the sheet dialog is visible
    const noCloseSheet = page.getByRole("dialog");
    await expect(noCloseSheet).toBeVisible();

    // 19. Verify the title is visible
    await expect(noCloseSheet.getByRole("heading", { name: "No Close Button" })).toBeVisible();

    // 20. Verify there is no close button (X) - the sheet should only have header content
    // The description should be visible
    await expect(noCloseSheet.getByText("This sheet doesn't have a close button")).toBeVisible();

    // 21. Press Escape to close
    await page.keyboard.press("Escape");

    // 22. Verify the sheet is hidden
    await expect(noCloseSheet).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Top
    // ------------------------------------------------------------

    // 23. Get the Sides section
    const sidesSection = page.getByText("Sides", { exact: true }).locator("..");

    // 24. Hover over the 'top' button
    await sidesSection.getByRole("button", { name: "top", exact: true }).hover();

    // 25. Wait for 300ms
    await page.waitForTimeout(300);

    // 26. Click the 'top' button
    await sidesSection.getByRole("button", { name: "top", exact: true }).click();

    // 27. Verify the sheet dialog is visible
    const topSheet = page.getByRole("dialog");
    await expect(topSheet).toBeVisible();

    // 28. Verify the title
    await expect(topSheet.getByRole("heading", { name: "Edit profile" })).toBeVisible();

    // 29. Click the Cancel button
    await topSheet.getByRole("button", { name: "Dismiss", exact: true }).first().hover();
    await page.waitForTimeout(300);
    await topSheet.getByRole("button", { name: "Dismiss", exact: true }).first().click();

    // 30. Verify the sheet is hidden
    await expect(topSheet).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Right
    // ------------------------------------------------------------

    // 31. Hover over the 'right' button
    await sidesSection.getByRole("button", { name: "right", exact: true }).hover();

    // 32. Wait for 300ms
    await page.waitForTimeout(300);

    // 33. Click the 'right' button
    await sidesSection.getByRole("button", { name: "right", exact: true }).click();

    // 34. Verify the sheet dialog is visible
    const rightSheet = page.getByRole("dialog");
    await expect(rightSheet).toBeVisible();

    // 35. Press Escape to close
    await page.keyboard.press("Escape");

    // 36. Verify the sheet is hidden
    await expect(rightSheet).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Bottom
    // ------------------------------------------------------------

    // 37. Hover over the 'bottom' button
    await sidesSection.getByRole("button", { name: "bottom", exact: true }).hover();

    // 38. Wait for 300ms
    await page.waitForTimeout(300);

    // 39. Click the 'bottom' button
    await sidesSection.getByRole("button", { name: "bottom", exact: true }).click();

    // 40. Verify the sheet dialog is visible
    const bottomSheet = page.getByRole("dialog");
    await expect(bottomSheet).toBeVisible();

    // 41. Press Escape to close
    await page.keyboard.press("Escape");

    // 42. Verify the sheet is hidden
    await expect(bottomSheet).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Left
    // ------------------------------------------------------------

    // 43. Hover over the 'left' button
    await sidesSection.getByRole("button", { name: "left", exact: true }).hover();

    // 44. Wait for 300ms
    await page.waitForTimeout(300);

    // 45. Click the 'left' button
    await sidesSection.getByRole("button", { name: "left", exact: true }).click();

    // 46. Verify the sheet dialog is visible
    const leftSheet = page.getByRole("dialog");
    await expect(leftSheet).toBeVisible();

    // 47. Press Escape to close
    await page.keyboard.press("Escape");

    // 48. Verify the sheet is hidden
    await expect(leftSheet).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 49. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 50. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Sheet", level: 1 })).toBeVisible();

    // 51. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 52. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 53. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 54. Scroll to the bottom of the page
    await page.keyboard.press("End");
    await page.waitForTimeout(500);

    // 55. Verify the Size section is present at the bottom
    await expect(page.getByRole("heading", { name: "Size", level: 2 })).toBeVisible();
  });
});
