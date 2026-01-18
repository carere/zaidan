import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5181/ui/dialog");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // With Form Example
    // ------------------------------------------------------------

    // 1. Get the with form section
    const withFormSection = page.getByText("With Form", { exact: true }).locator("..");

    // 2. Hover over the 'Edit Profile' button
    await withFormSection.getByRole("button", { name: "Edit Profile", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Edit Profile' button
    await withFormSection.getByRole("button", { name: "Edit Profile", exact: true }).click();

    // 5. Verify the dialog is visible
    const editProfileDialog = page.getByRole("dialog");
    await expect(editProfileDialog).toBeVisible();

    // 6. Verify the dialog title
    await expect(editProfileDialog.getByRole("heading", { name: "Edit profile" })).toBeVisible();

    // 7. Verify the name input is present with default value
    await expect(
      editProfileDialog.getByRole("textbox", { name: "Name", exact: true }),
    ).toBeVisible();

    // 8. Verify the username input is present
    await expect(editProfileDialog.getByRole("textbox", { name: "Username" })).toBeVisible();

    // 9. Verify the Cancel button is visible (DialogClose has accessible name "Dismiss")
    await expect(editProfileDialog.getByText("Cancel")).toBeVisible();

    // 10. Verify the Save changes button is visible
    await expect(editProfileDialog.getByRole("button", { name: "Save changes" })).toBeVisible();

    // 11. Click the Cancel button to close the dialog
    await editProfileDialog.getByText("Cancel").click();

    // 12. Verify the dialog is hidden
    await expect(editProfileDialog).toBeHidden();

    // ------------------------------------------------------------
    // Scrollable Content Example
    // ------------------------------------------------------------

    // 13. Get the scrollable content section
    const scrollableSection = page.getByText("Scrollable Content", { exact: true }).locator("..");

    // 14. Hover over the 'Scrollable Content' button
    await scrollableSection
      .getByRole("button", { name: "Scrollable Content", exact: true })
      .hover();

    // 15. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 16. Click the 'Scrollable Content' button
    await scrollableSection
      .getByRole("button", { name: "Scrollable Content", exact: true })
      .click();

    // 17. Verify the dialog is visible
    const scrollableDialog = page.getByRole("dialog");
    await expect(scrollableDialog).toBeVisible();

    // 18. Verify the dialog title
    await expect(
      scrollableDialog.getByRole("heading", { name: "Scrollable Content" }),
    ).toBeVisible();

    // 19. Verify the dialog description is visible
    await expect(
      scrollableDialog.getByText("This is a dialog with scrollable content."),
    ).toBeVisible();

    // 20. Close the dialog with Escape key
    await page.keyboard.press("Escape");

    // 21. Verify the dialog is hidden
    await expect(scrollableDialog).toBeHidden();

    // ------------------------------------------------------------
    // With Sticky Footer Example
    // ------------------------------------------------------------

    // 22. Get the sticky footer section
    const stickyFooterSection = page.getByText("With Sticky Footer", { exact: true }).locator("..");

    // 23. Hover over the 'Sticky Footer' button
    await stickyFooterSection.getByRole("button", { name: "Sticky Footer", exact: true }).hover();

    // 24. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 25. Click the 'Sticky Footer' button
    await stickyFooterSection.getByRole("button", { name: "Sticky Footer", exact: true }).click();

    // 26. Verify the dialog is visible
    const stickyFooterDialog = page.getByRole("dialog");
    await expect(stickyFooterDialog).toBeVisible();

    // 27. Verify the dialog title
    await expect(
      stickyFooterDialog.getByRole("heading", { name: "Scrollable Content" }),
    ).toBeVisible();

    // 28. Verify the Close button is visible in the footer
    await expect(
      stickyFooterDialog.getByTestId("dialog-footer").getByTestId("dialog-close"),
    ).toBeVisible();

    // 29. Click the Close button
    await stickyFooterDialog.getByTestId("dialog-footer").getByTestId("dialog-close").click();

    // 30. Verify the dialog is hidden
    await expect(stickyFooterDialog).toBeHidden();

    // ------------------------------------------------------------
    // No Close Button Example
    // ------------------------------------------------------------

    // 31. Get the no close button section
    const noCloseButtonSection = page.getByText("No Close Button", { exact: true }).locator("..");

    // 32. Hover over the 'No Close Button' button
    await noCloseButtonSection
      .getByRole("button", { name: "No Close Button", exact: true })
      .hover();

    // 33. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 34. Click the 'No Close Button' button
    await noCloseButtonSection
      .getByRole("button", { name: "No Close Button", exact: true })
      .click();

    // 35. Verify the dialog is visible
    const noCloseButtonDialog = page.getByRole("dialog");
    await expect(noCloseButtonDialog).toBeVisible();

    // 36. Verify the dialog title
    await expect(
      noCloseButtonDialog.getByRole("heading", { name: "No Close Button" }),
    ).toBeVisible();

    // 37. Verify the description is visible
    await expect(
      noCloseButtonDialog.getByText("This dialog doesn't have a close button in the top-right"),
    ).toBeVisible();

    // 38. Verify only the footer Close button is visible (no X button - DialogClose uses "Dismiss" name)
    const dismissButtons = noCloseButtonDialog.getByRole("button", { name: "Dismiss" });
    await expect(dismissButtons).toHaveCount(1);

    // 39. Click the Close button in footer
    await noCloseButtonDialog.getByTestId("dialog-footer").getByTestId("dialog-close").click();

    // 40. Verify the dialog is hidden
    await expect(noCloseButtonDialog).toBeHidden();

    // ------------------------------------------------------------
    // Chat Settings Example
    // ------------------------------------------------------------

    // 41. Get the chat settings section
    const chatSettingsSection = page.getByText("Chat Settings", { exact: true }).locator("..");

    // 42. Hover over the 'Chat Settings' button
    await chatSettingsSection.getByRole("button", { name: "Chat Settings", exact: true }).hover();

    // 43. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 44. Click the 'Chat Settings' button
    await chatSettingsSection.getByRole("button", { name: "Chat Settings", exact: true }).click();

    // 45. Verify the dialog is visible
    const chatSettingsDialog = page.getByRole("dialog");
    await expect(chatSettingsDialog).toBeVisible();

    // 46. Verify the dialog title
    await expect(chatSettingsDialog.getByRole("heading", { name: "Chat Settings" })).toBeVisible();

    // 47. Verify the General tab content is visible (default tab) - check select triggers
    await expect(chatSettingsDialog.getByRole("button", { name: "System" })).toBeVisible();
    await expect(chatSettingsDialog.getByRole("button", { name: "Default" })).toBeVisible();
    await expect(chatSettingsDialog.getByRole("button", { name: "English" })).toBeVisible();
    await expect(chatSettingsDialog.getByRole("button", { name: "Samantha" })).toBeVisible();

    // 48. Verify the Voice field label is visible
    await expect(
      chatSettingsDialog.getByTestId("field-label").filter({ hasText: "Voice" }),
    ).toBeVisible();

    // 49. Click the X button to close the dialog
    await chatSettingsDialog.getByRole("button", { name: "Dismiss" }).click();

    // 50. Verify the dialog is hidden
    await expect(chatSettingsDialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Verify Content
    // ------------------------------------------------------------

    // 51. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 52. Wait for the docs content to load
    await page.waitForTimeout(500);

    // 53. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Dialog", level: 1 })).toBeVisible();

    // 54. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 55. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 56. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 57. Verify the With Form example section is present
    await expect(page.getByRole("heading", { name: "With Form", level: 3 })).toBeVisible();

    // 58. Verify the Chat Settings example section is present
    await expect(page.getByRole("heading", { name: "Chat Settings", level: 3 })).toBeVisible();

    // 59. Verify the Notes section is present
    await expect(page.getByRole("heading", { name: "Notes", level: 2 })).toBeVisible();
  });
});
