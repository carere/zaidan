import { expect, test } from "@playwright/test";

test.describe("Context Menu", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/context-menu");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Hover over the trigger area
    await basicSection.getByText("Right click here", { exact: true }).hover();

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 4. Right-click to open context menu
    await basicSection.getByText("Right click here", { exact: true }).click({ button: "right" });

    // 5. Verify the context menu is visible
    const basicMenu = page.getByRole("menu");
    await expect(basicMenu).toBeVisible();

    // 6. Verify menu items are present
    await expect(basicMenu.getByRole("menuitem", { name: "Back" })).toBeVisible();
    await expect(basicMenu.getByRole("menuitem", { name: "Forward" })).toBeVisible();
    await expect(basicMenu.getByRole("menuitem", { name: "Reload" })).toBeVisible();

    // 7. Verify Forward is disabled
    await expect(basicMenu.getByRole("menuitem", { name: "Forward" })).toBeDisabled();

    // 8. Click Back to close the menu
    await basicMenu.getByRole("menuitem", { name: "Back" }).click();

    // 9. Verify the menu is closed
    await expect(basicMenu).toBeHidden();

    // ------------------------------------------------------------
    // With Icons Example
    // ------------------------------------------------------------

    // 10. Get the with icons section
    const withIconsSection = page.getByText("With Icons", { exact: true }).locator("..");

    // 11. Right-click to open context menu
    await withIconsSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 12. Verify the context menu is visible
    const iconsMenu = page.getByRole("menu");
    await expect(iconsMenu).toBeVisible();

    // 13. Verify menu items with icons are present
    await expect(iconsMenu.getByRole("menuitem", { name: "Copy" })).toBeVisible();
    await expect(iconsMenu.getByRole("menuitem", { name: "Cut" })).toBeVisible();
    await expect(iconsMenu.getByRole("menuitem", { name: "Paste" })).toBeVisible();
    await expect(iconsMenu.getByRole("menuitem", { name: "Delete" })).toBeVisible();

    // 14. Click away to close the menu
    await page.keyboard.press("Escape");
    await expect(iconsMenu).toBeHidden();

    // ------------------------------------------------------------
    // With Shortcuts Example
    // ------------------------------------------------------------

    // 15. Get the with shortcuts section
    const withShortcutsSection = page.getByText("With Shortcuts", { exact: true }).locator("..");

    // 16. Right-click to open context menu
    await withShortcutsSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 17. Verify the context menu is visible
    const shortcutsMenu = page.getByRole("menu");
    await expect(shortcutsMenu).toBeVisible();

    // 18. Verify shortcuts are visible
    await expect(shortcutsMenu.getByText("⌘[")).toBeVisible();
    await expect(shortcutsMenu.getByText("⌘]")).toBeVisible();
    await expect(shortcutsMenu.getByText("⌘R")).toBeVisible();

    // 19. Close the menu
    await page.keyboard.press("Escape");
    await expect(shortcutsMenu).toBeHidden();

    // ------------------------------------------------------------
    // With Submenu Example
    // ------------------------------------------------------------

    // 20. Get the with submenu section
    const withSubmenuSection = page.getByText("With Submenu", { exact: true }).locator("..");

    // 21. Right-click to open context menu
    await withSubmenuSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 22. Verify the context menu is visible
    const submenuMenu = page.getByRole("menu");
    await expect(submenuMenu).toBeVisible();

    // 23. Hover over "More Tools" to open submenu
    await submenuMenu.getByRole("menuitem", { name: "More Tools" }).hover();
    await page.waitForTimeout(300);

    // 24. Verify submenu is visible with items
    await expect(page.getByRole("menuitem", { name: "Save Page..." })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Create Shortcut..." })).toBeVisible();

    // 25. Close the menu
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // With Checkboxes Example
    // ------------------------------------------------------------

    // 26. Get the with checkboxes section
    const withCheckboxesSection = page.getByText("With Checkboxes", { exact: true }).locator("..");

    // 27. Right-click to open context menu
    await withCheckboxesSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 28. Verify the context menu is visible
    const checkboxesMenu = page.getByRole("menu");
    await expect(checkboxesMenu).toBeVisible();

    // 29. Verify checkbox items are present
    await expect(
      checkboxesMenu.getByRole("menuitemcheckbox", { name: "Show Bookmarks Bar" }),
    ).toBeVisible();
    await expect(
      checkboxesMenu.getByRole("menuitemcheckbox", { name: "Show Full URLs" }),
    ).toBeVisible();

    // 30. Close the menu
    await page.keyboard.press("Escape");
    await expect(checkboxesMenu).toBeHidden();

    // ------------------------------------------------------------
    // With Radio Group Example
    // ------------------------------------------------------------

    // 31. Get the with radio group section
    const withRadioSection = page.getByText("With Radio Group", { exact: true }).locator("..");

    // 32. Right-click to open context menu
    await withRadioSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 33. Verify the context menu is visible
    const radioMenu = page.getByRole("menu");
    await expect(radioMenu).toBeVisible();

    // 34. Verify radio items are present
    await expect(radioMenu.getByRole("menuitemradio", { name: "Pedro Duarte" })).toBeVisible();
    await expect(radioMenu.getByRole("menuitemradio", { name: "Colm Tuite" })).toBeVisible();
    await expect(radioMenu.getByRole("menuitemradio", { name: "Light" })).toBeVisible();
    await expect(radioMenu.getByRole("menuitemradio", { name: "Dark" })).toBeVisible();

    // 35. Close the menu
    await page.keyboard.press("Escape");
    await expect(radioMenu).toBeHidden();

    // ------------------------------------------------------------
    // With Destructive Items Example
    // ------------------------------------------------------------

    // 36. Get the with destructive section
    const withDestructiveSection = page
      .getByText("With Destructive Items", { exact: true })
      .locator("..");

    // 37. Right-click to open context menu
    await withDestructiveSection
      .getByText("Right click here", { exact: true })
      .click({ button: "right" });

    // 38. Verify the context menu is visible
    const destructiveMenu = page.getByRole("menu");
    await expect(destructiveMenu).toBeVisible();

    // 39. Verify destructive item is present
    await expect(destructiveMenu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await expect(destructiveMenu.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(destructiveMenu.getByRole("menuitem", { name: "Share" })).toBeVisible();

    // 40. Close the menu
    await page.keyboard.press("Escape");
    await expect(destructiveMenu).toBeHidden();

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 41. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 42. Hover over the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).hover();

    // 43. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 44. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();

    // 45. Verify the dialog is visible
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 46. Right-click inside the dialog to open context menu
    await dialog.getByText("Right click here", { exact: true }).click({ button: "right" });

    // 47. Verify the context menu inside dialog is visible
    const dialogMenu = page.getByRole("menu");
    await expect(dialogMenu).toBeVisible();

    // 48. Verify menu items are present
    await expect(dialogMenu.getByRole("menuitem", { name: "Copy" })).toBeVisible();
    await expect(dialogMenu.getByRole("menuitem", { name: "Cut" })).toBeVisible();
    await expect(dialogMenu.getByRole("menuitem", { name: "Paste" })).toBeVisible();

    // 49. Close the context menu by clicking a menu item
    await dialogMenu.getByRole("menuitem", { name: "Copy" }).click();
    await expect(dialogMenu).toBeHidden();

    // 50. Close the dialog by pressing Escape
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 51. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 52. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Context Menu", level: 1 })).toBeVisible();

    // 53. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 54. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 55. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 56. Verify example subsections are present
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Sides", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Icons", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Shortcuts", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Submenu", level: 3 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "With Groups, Labels & Separators", level: 3 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Checkboxes", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Radio Group", level: 3 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "With Destructive Items", level: 3 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Dialog", level: 3 })).toBeVisible();
  });
});
