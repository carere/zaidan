import { expect, test } from "@playwright/test";

test.describe("Popover", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5175/ui/popover");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the 'Open Popover' button
    await basicSection.getByRole("button", { name: "Open Popover", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Open Popover' button
    await basicSection.getByRole("button", { name: "Open Popover", exact: true }).click();

    // 5. Verify the popover dialog is visible
    const basicPopover = page.getByRole("dialog").filter({ hasText: "Dimensions" });
    await expect(basicPopover).toBeVisible();

    // 6. Verify the popover title is visible
    await expect(basicPopover.getByRole("heading", { name: "Dimensions" })).toBeVisible();

    // 7. Verify the popover description is visible
    await expect(basicPopover.getByText("Set the dimensions for the layer.")).toBeVisible();

    // 8. Close the popover by pressing Escape
    await page.keyboard.press("Escape");

    // 9. Verify the popover is hidden
    await expect(basicPopover).toBeHidden();

    // ------------------------------------------------------------
    // With Form Example
    // ------------------------------------------------------------

    // 10. Get the with form section
    const withFormSection = page.getByText("With Form", { exact: true }).locator("..");

    // 11. Hover over the 'Open Popover' button
    await withFormSection.getByRole("button", { name: "Open Popover", exact: true }).hover();

    // 12. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 13. Click the 'Open Popover' button
    await withFormSection.getByRole("button", { name: "Open Popover", exact: true }).click();

    // 14. Verify the popover dialog is visible
    const formPopover = page.getByRole("dialog").filter({ hasText: "Width" });
    await expect(formPopover).toBeVisible();

    // 15. Verify the Width field is visible
    await expect(formPopover.getByText("Width")).toBeVisible();

    // 16. Verify the Height field is visible
    await expect(formPopover.getByText("Height")).toBeVisible();

    // 17. Verify the Width input has the correct value
    await expect(formPopover.getByRole("textbox", { name: "Width" })).toHaveValue("100%");

    // 18. Verify the Height input has the correct value
    await expect(formPopover.getByRole("textbox", { name: "Height" })).toHaveValue("25px");

    // 19. Close the popover by pressing Escape
    await page.keyboard.press("Escape");

    // 20. Verify the popover is hidden
    await expect(formPopover).toBeHidden();

    // ------------------------------------------------------------
    // Alignments Example
    // ------------------------------------------------------------

    // 21. Get the alignments section
    const alignmentsSection = page.getByText("Alignments", { exact: true }).locator("..");

    // 22. Hover over the 'Start' button
    await alignmentsSection.getByRole("button", { name: "Start", exact: true }).hover();

    // 23. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 24. Click the 'Start' button
    await alignmentsSection.getByRole("button", { name: "Start", exact: true }).click();

    // 25. Verify the popover is visible with correct content
    const startPopover = page.getByRole("dialog").filter({ hasText: "Aligned to start" });
    await expect(startPopover).toBeVisible();

    // 26. Close the popover
    await page.keyboard.press("Escape");
    await expect(startPopover).toBeHidden();

    // 27. Hover over the 'Center' button
    await alignmentsSection.getByRole("button", { name: "Center", exact: true }).hover();

    // 28. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 29. Click the 'Center' button
    await alignmentsSection.getByRole("button", { name: "Center", exact: true }).click();

    // 30. Verify the popover is visible with correct content
    const centerPopover = page.getByRole("dialog").filter({ hasText: "Aligned to center" });
    await expect(centerPopover).toBeVisible();

    // 31. Close the popover
    await page.keyboard.press("Escape");
    await expect(centerPopover).toBeHidden();

    // 32. Hover over the 'End' button
    await alignmentsSection.getByRole("button", { name: "End", exact: true }).hover();

    // 33. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 34. Click the 'End' button
    await alignmentsSection.getByRole("button", { name: "End", exact: true }).click();

    // 35. Verify the popover is visible with correct content
    const endPopover = page.getByRole("dialog").filter({ hasText: "Aligned to end" });
    await expect(endPopover).toBeVisible();

    // 36. Close the popover
    await page.keyboard.press("Escape");
    await expect(endPopover).toBeHidden();

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 37. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 38. Hover over the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).hover();

    // 39. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 40. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();

    // 41. Verify the dialog is visible
    const dialog = page.getByRole("dialog").filter({ hasText: "Popover Example" });
    await expect(dialog).toBeVisible();

    // 42. Verify the dialog title
    await expect(dialog.getByRole("heading", { name: "Popover Example" })).toBeVisible();

    // 43. Verify the dialog description
    await expect(dialog.getByText("Click the button below to see the popover.")).toBeVisible();

    // 44. Verify the 'Open Popover' button inside the dialog is present
    await expect(dialog.getByRole("button", { name: "Open Popover", exact: true })).toBeVisible();

    // 45. Close the dialog
    await page.keyboard.press("Escape");

    // 52. Verify the dialog is hidden
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 53. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 54. Wait for the docs content to load
    await page.waitForTimeout(500);

    // 55. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Popover", level: 1 })).toBeVisible();

    // 56. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 57. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 58. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 59. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 60. Wait for scroll animation
    await page.waitForTimeout(300);

    // 61. Verify the "In Dialog" example heading is visible
    await expect(page.getByRole("heading", { name: "In Dialog", level: 3 })).toBeVisible();
  });
});
