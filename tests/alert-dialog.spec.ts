import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/alert-dialog");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the 'Default' button
    await basicSection.getByRole("button", { name: "Default", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Default' button
    await basicSection.getByRole("button", { name: "Default", exact: true }).click();

    // 5. Verify the alert dialog is visible
    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();

    // 6. Verify the 'Dismiss' button is visible
    await expect(alertDialog.getByRole("button", { name: "Dismiss" })).toBeVisible();

    // 7. Hover over the 'Dismiss' button
    await alertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 8. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 9. Click the 'Dismiss' button
    await alertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 10. Verify the alert dialog is hidden
    await expect(alertDialog).toBeHidden();

    // ------------------------------------------------------------
    // Small Example
    // ------------------------------------------------------------

    // 11. Get the small section
    const smallSection = page.getByText("Small", { exact: true }).locator("..");

    // 12. Hover over the 'Small' button
    await smallSection.getByRole("button", { name: "Small", exact: true }).hover();

    // 13. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 14. Click the 'Small' button
    await smallSection.getByRole("button", { name: "Small", exact: true }).click();

    // 15. Verify the alert dialog is visible
    const smallAlertDialog = page.getByRole("alertdialog");
    await expect(smallAlertDialog).toBeVisible();

    // 16. Verify the dialog title
    await expect(
      smallAlertDialog.getByRole("heading", { name: "Allow accessory to connect?" }),
    ).toBeVisible();

    // 17. Hover over the 'Dismiss' button
    await smallAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 18. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 19. Click the 'Dismiss' button
    await smallAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 20. Verify the alert dialog is hidden
    await expect(smallAlertDialog).toBeHidden();

    // ------------------------------------------------------------
    // With Media Example
    // ------------------------------------------------------------

    // 21. Get the with media section
    const withMediaSection = page.getByText("With Media", { exact: true }).locator("..");

    // 22. Hover over the 'Default (Media)' button
    await withMediaSection.getByRole("button", { name: "Default (Media)", exact: true }).hover();

    // 23. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 24. Click the 'Default (Media)' button
    await withMediaSection.getByRole("button", { name: "Default (Media)", exact: true }).click();

    // 25. Verify the alert dialog is visible
    const mediaAlertDialog = page.getByRole("alertdialog");
    await expect(mediaAlertDialog).toBeVisible();

    // 26. Verify the dialog title
    await expect(
      mediaAlertDialog.getByRole("heading", { name: "Are you absolutely sure?" }),
    ).toBeVisible();

    // 27. Hover over the 'Dismiss' button
    await mediaAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 28. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 29. Click the 'Dismiss' button
    await mediaAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 30. Verify the alert dialog is hidden
    await expect(mediaAlertDialog).toBeHidden();

    // ------------------------------------------------------------
    // Small With Media Example
    // ------------------------------------------------------------

    // 31. Get the small with media section
    const smallWithMediaSection = page.getByText("Small With Media", { exact: true }).locator("..");

    // 32. Hover over the 'Small (Media)' button
    await smallWithMediaSection.getByRole("button", { name: "Small (Media)", exact: true }).hover();

    // 33. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 34. Click the 'Small (Media)' button
    await smallWithMediaSection.getByRole("button", { name: "Small (Media)", exact: true }).click();

    // 35. Verify the alert dialog is visible
    const smallMediaAlertDialog = page.getByRole("alertdialog");
    await expect(smallMediaAlertDialog).toBeVisible();

    // 36. Verify the dialog title
    await expect(
      smallMediaAlertDialog.getByRole("heading", { name: "Allow accessory to connect?" }),
    ).toBeVisible();

    // 37. Hover over the 'Dismiss' button
    await smallMediaAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 38. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 39. Click the 'Dismiss' button
    await smallMediaAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 40. Verify the alert dialog is hidden
    await expect(smallMediaAlertDialog).toBeHidden();

    // ------------------------------------------------------------
    // Destructive Example
    // ------------------------------------------------------------

    // 41. Get the destructive section
    const destructiveSection = page.getByText("Destructive", { exact: true }).locator("..");

    // 42. Hover over the 'Delete Chat' button
    await destructiveSection.getByRole("button", { name: "Delete Chat", exact: true }).hover();

    // 43. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 44. Click the 'Delete Chat' button
    await destructiveSection.getByRole("button", { name: "Delete Chat", exact: true }).click();

    // 45. Verify the alert dialog is visible
    const destructiveAlertDialog = page.getByRole("alertdialog");
    await expect(destructiveAlertDialog).toBeVisible();

    // 46. Verify the dialog title
    await expect(
      destructiveAlertDialog.getByRole("heading", { name: "Delete chat?" }),
    ).toBeVisible();

    // 47. Verify the Settings link is present
    await expect(destructiveAlertDialog.getByRole("link", { name: "Settings" })).toBeVisible();

    // 48. Hover over the 'Dismiss' button
    await destructiveAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 49. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 50. Click the 'Dismiss' button
    await destructiveAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 51. Verify the alert dialog is hidden
    await expect(destructiveAlertDialog).toBeHidden();

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 52. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 53. Hover over the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).hover();

    // 54. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 55. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();

    // 56. Verify the dialog is visible
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 58. Hover over the 'Open Alert Dialog' button inside the dialog
    await dialog.getByRole("button", { name: "Open Alert Dialog", exact: true }).hover();

    // 59. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 60. Click the 'Open Alert Dialog' button
    await dialog.getByRole("button", { name: "Open Alert Dialog", exact: true }).click();

    // 61. Verify the nested alert dialog is visible
    const nestedAlertDialog = page.getByRole("alertdialog");
    await expect(nestedAlertDialog).toBeVisible();

    // 62. Verify the alert dialog title
    await expect(
      nestedAlertDialog.getByRole("heading", { name: "Are you absolutely sure?" }),
    ).toBeVisible();

    // 63. Hover over the 'Dismiss' button in the alert dialog
    await nestedAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).hover();

    // 64. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 65. Click the 'Dismiss' button to close the alert dialog
    await nestedAlertDialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 66. Verify the alert dialog is hidden
    await expect(nestedAlertDialog).toBeHidden();

    await page.keyboard.press("Escape");

    // 71. Verify the dialog is hidden
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 1. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 2. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Alert Dialog", level: 1 })).toBeVisible();

    // 3. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 4. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 5. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();
  });
});
