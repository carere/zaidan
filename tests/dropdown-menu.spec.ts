import { expect, test } from "@playwright/test";

test.describe("Dropdown Menu Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5182/ui/dropdown-menu");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the 'Open' button
    await basicSection.getByRole("button", { name: "Open", exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Click the 'Open' button
    await basicSection.getByRole("button", { name: "Open", exact: true }).click();

    // 5. Verify the menu is visible
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    // 6. Verify menu items are visible
    await expect(menu.getByText("My Account")).toBeVisible();
    await expect(menu.getByText("Profile")).toBeVisible();
    await expect(menu.getByText("Billing")).toBeVisible();

    // 7. Press Escape to close the menu
    await page.keyboard.press("Escape");

    // 8. Verify the menu is hidden
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Icons Example
    // ------------------------------------------------------------

    // 9. Get the with icons section
    const withIconsSection = page.getByText("With Icons", { exact: true }).locator("..");

    // 10. Click the 'Open' button
    await withIconsSection.getByRole("button", { name: "Open", exact: true }).click();

    // 11. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 12. Verify menu items are visible
    await expect(menu.getByText("Profile")).toBeVisible();
    await expect(menu.getByText("Log out")).toBeVisible();

    // 13. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Shortcuts Example
    // ------------------------------------------------------------

    // 14. Get the with shortcuts section
    const withShortcutsSection = page.getByText("With Shortcuts", { exact: true }).locator("..");

    // 15. Click the 'Open' button
    await withShortcutsSection.getByRole("button", { name: "Open", exact: true }).click();

    // 16. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 17. Verify shortcut text is visible
    await expect(menu.getByText("⇧⌘P")).toBeVisible();
    await expect(menu.getByText("⌘B")).toBeVisible();

    // 18. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Submenu Example
    // ------------------------------------------------------------

    // 19. Get the with submenu section
    const withSubmenuSection = page.getByText("With Submenu", { exact: true }).locator("..");

    // 20. Click the 'Open' button
    await withSubmenuSection.getByRole("button", { name: "Open", exact: true }).click();

    // 21. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 22. Hover over the 'Invite users' submenu trigger
    await menu.getByText("Invite users").hover();

    // 23. Wait for submenu to appear
    await page.waitForTimeout(500);

    // 24. Verify submenu items are visible
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Message")).toBeVisible();

    // 25. Press Escape twice to close both submenu and menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await expect(menu.first()).toBeHidden();

    // ------------------------------------------------------------
    // With Checkboxes Example
    // ------------------------------------------------------------

    // 26. Get the with checkboxes section
    const withCheckboxesSection = page.getByText("With Checkboxes", { exact: true }).locator("..");

    // 27. Click the 'Checkboxes' button
    await withCheckboxesSection.getByRole("button", { name: "Checkboxes", exact: true }).click();

    // 28. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 29. Verify checkbox items are visible
    await expect(menu.getByText("Status Bar")).toBeVisible();
    await expect(menu.getByText("Activity Bar")).toBeVisible();

    // 30. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Radio Group Example
    // ------------------------------------------------------------

    // 31. Get the with radio group section
    const withRadioSection = page.getByText("With Radio Group", { exact: true }).locator("..");

    // 32. Click the 'Radio Group' button
    await withRadioSection.getByRole("button", { name: "Radio Group", exact: true }).click();

    // 33. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 34. Verify radio items are visible
    await expect(menu.getByText("Top")).toBeVisible();
    await expect(menu.getByText("Bottom")).toBeVisible();
    await expect(menu.getByText("Right")).toBeVisible();

    // 35. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Destructive Items Example
    // ------------------------------------------------------------

    // 36. Get the with destructive section
    const withDestructiveSection = page
      .getByText("With Destructive Items", { exact: true })
      .locator("..");

    // 37. Click the 'Actions' button
    await withDestructiveSection.getByRole("button", { name: "Actions", exact: true }).click();

    // 38. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 39. Verify destructive item is visible
    await expect(menu.getByText("Delete")).toBeVisible();
    await expect(menu.getByText("Edit")).toBeVisible();

    // 40. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // With Avatar Example
    // ------------------------------------------------------------

    // 41. Get the with avatar section
    const withAvatarSection = page.getByText("With Avatar", { exact: true }).locator("..");

    // 42. Click the avatar button
    await withAvatarSection.getByRole("button", { name: "CN shadcn shadcn@example.com" }).click();

    // 43. Verify the menu is visible
    await expect(menu).toBeVisible();

    // 44. Verify menu items are visible
    await expect(menu.getByText("Account")).toBeVisible();
    await expect(menu.getByText("Sign Out")).toBeVisible();

    // 45. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 46. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 47. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();

    // 48. Verify the dialog is visible
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 49. Click the 'Open Menu' button inside the dialog
    await dialog.getByRole("button", { name: "Open Menu", exact: true }).click();

    // 50. Verify the dropdown menu is visible
    await expect(menu).toBeVisible();

    // 51. Verify menu items are visible
    await expect(menu.getByText("Copy")).toBeVisible();
    await expect(menu.getByText("Cut")).toBeVisible();
    await expect(menu.getByText("Paste")).toBeVisible();

    // 52. Press Escape to close the menu
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // 53. Press Escape to close the dialog
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Complex Example
    // ------------------------------------------------------------

    // 54. Get the complex section
    const complexSection = page.getByText("Complex", { exact: true }).locator("..");

    // 55. Click the 'Complex Menu' button
    await complexSection.getByRole("button", { name: "Complex Menu", exact: true }).click();

    // 56. Verify the menu is visible
    await expect(menu.first()).toBeVisible();

    // 57. Verify menu items are visible
    await expect(page.getByText("New File")).toBeVisible();
    await expect(page.getByText("New Folder")).toBeVisible();

    // 58. Press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu.first()).toBeHidden();
  });
});
