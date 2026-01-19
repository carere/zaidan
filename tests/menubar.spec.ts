import { expect, test } from "@playwright/test";

test.describe("Menubar Examples", () => {
  test("examples", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/ui/menubar`);

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Click the 'File' menu trigger
    await basicSection.getByRole("menuitem", { name: "File" }).click();

    // 3. Verify the menu is open and contains expected items
    const fileMenu = page.getByRole("menu", { name: "File" });
    await expect(fileMenu).toBeVisible();
    await expect(fileMenu.getByRole("menuitem", { name: /New Tab/ })).toBeVisible();
    await expect(fileMenu.getByRole("menuitem", { name: /New Window/ })).toBeVisible();
    await expect(fileMenu.getByRole("menuitem", { name: /New Incognito Window/ })).toBeVisible();
    await expect(fileMenu.getByRole("menuitem", { name: /Print/ })).toBeVisible();

    // 4. Close the menu by pressing Escape
    await page.keyboard.press("Escape");

    // 5. Wait for menu to close
    await page.waitForTimeout(300);

    // 6. Click on Edit menu
    await basicSection.getByRole("menuitem", { name: "Edit" }).click();

    // 7. Verify Edit menu items
    const editMenu = page.getByRole("menu", { name: "Edit" });
    await expect(editMenu).toBeVisible();
    await expect(editMenu.getByRole("menuitem", { name: /Undo/ })).toBeVisible();
    await expect(editMenu.getByRole("menuitem", { name: /Redo/ })).toBeVisible();

    // 8. Close the menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Submenu Example
    // ------------------------------------------------------------

    // 9. Get the submenu section
    const submenuSection = page.getByText("With Submenu", { exact: true }).locator("..");

    // 10. Click the 'File' menu trigger
    await submenuSection.getByRole("menuitem", { name: "File" }).click();

    // 11. Verify the menu is open
    const submenuFileMenu = page.getByRole("menu", { name: "File" });
    await expect(submenuFileMenu).toBeVisible();

    // 12. Hover over the 'Share' submenu trigger
    await submenuFileMenu.getByRole("menuitem", { name: "Share" }).hover();
    await page.waitForTimeout(300);

    // 13. Verify submenu opens with items
    await expect(page.getByRole("menuitem", { name: "Email link" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Messages" })).toBeVisible();

    // 14. Close menus
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Checkboxes Example
    // ------------------------------------------------------------

    // 15. Get the checkboxes section
    const checkboxesSection = page.getByText("With Checkboxes", { exact: true }).locator("..");

    // 16. Click the 'View' menu trigger
    await checkboxesSection.getByRole("menuitem", { name: "View" }).click();

    // 17. Verify checkbox items are visible
    const viewMenu = page.getByRole("menu", { name: "View" });
    await expect(viewMenu).toBeVisible();
    await expect(
      viewMenu.getByRole("menuitemcheckbox", { name: "Always Show Bookmarks Bar" }),
    ).toBeVisible();
    await expect(
      viewMenu.getByRole("menuitemcheckbox", { name: "Always Show Full URLs" }),
    ).toBeVisible();

    // 18. Close menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Radio Example
    // ------------------------------------------------------------

    // 19. Get the radio section
    const radioSection = page.getByText("With Radio", { exact: true }).locator("..");

    // 20. Click the 'Profiles' menu trigger
    await radioSection.getByRole("menuitem", { name: "Profiles" }).click();

    // 21. Verify radio items are visible
    const profilesMenu = page.getByRole("menu", { name: "Profiles" });
    await expect(profilesMenu).toBeVisible();
    await expect(profilesMenu.getByRole("menuitemradio", { name: "Andy" })).toBeVisible();
    await expect(profilesMenu.getByRole("menuitemradio", { name: "Benoit" })).toBeVisible();
    await expect(profilesMenu.getByRole("menuitemradio", { name: "Luis" })).toBeVisible();

    // 22. Close menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Icons Example
    // ------------------------------------------------------------

    // 23. Get the icons section
    const iconsSection = page.getByText("With Icons", { exact: true }).locator("..");

    // 24. Click the 'File' menu trigger
    await iconsSection.getByRole("menuitem", { name: "File" }).click();

    // 25. Verify items with icons
    const iconsFileMenu = page.getByRole("menu", { name: "File" });
    await expect(iconsFileMenu).toBeVisible();
    await expect(iconsFileMenu.getByRole("menuitem", { name: /New File/ })).toBeVisible();
    await expect(iconsFileMenu.getByRole("menuitem", { name: /Open Folder/ })).toBeVisible();
    await expect(iconsFileMenu.getByRole("menuitem", { name: /Save/ })).toBeVisible();

    // 26. Close menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Destructive Example
    // ------------------------------------------------------------

    // 27. Get the destructive section
    const destructiveSection = page.getByText("Destructive", { exact: true }).locator("..");

    // 28. Click the 'Account' menu trigger
    await destructiveSection.getByRole("menuitem", { name: "Account" }).click();

    // 29. Verify destructive items are visible
    const accountMenu = page.getByRole("menu", { name: "Account" });
    await expect(accountMenu).toBeVisible();
    await expect(accountMenu.getByRole("menuitem", { name: /Profile/ })).toBeVisible();
    await expect(accountMenu.getByRole("menuitem", { name: /Sign out/ })).toBeVisible();
    await expect(accountMenu.getByRole("menuitem", { name: /Delete/ })).toBeVisible();

    // 30. Close menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 31. Scroll to In Dialog section
    await page.getByText("In Dialog", { exact: true }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // 32. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 33. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();
    await page.waitForTimeout(300);

    // 34. Verify the dialog is visible
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 35. Verify the dialog title
    await expect(dialog.getByRole("heading", { name: "Menubar Example" })).toBeVisible();

    // 36. Verify menubar is visible inside the dialog
    await expect(dialog.getByRole("menubar")).toBeVisible();

    // 37. Close dialog with Escape
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 41. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 42. Wait for docs to load
    await page.waitForTimeout(500);

    // 43. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Menubar", level: 1 })).toBeVisible();

    // 44. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 45. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 46. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();
  });
});
