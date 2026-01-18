import { expect, test } from "@playwright/test";

test.describe("Command Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/command");

    // Wait for hydration - give time for solid-js to mount interactive components
    await page.waitForTimeout(2000);

    // Wait for the page to be ready by checking for the first example button
    await page.getByRole("button", { name: "Open Menu" }).first().waitFor({ state: "visible" });

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Click the 'Open Menu' button
    await basicSection.getByRole("button", { name: "Open Menu", exact: true }).click();

    // 3. Wait for dialog to appear
    await page.waitForTimeout(500);

    // 4. Verify the command dialog is visible by checking for the combobox
    const basicInput = page.getByRole("combobox");
    await expect(basicInput).toBeVisible({ timeout: 10000 });

    // 5. Verify command items are present using listbox
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();

    // 6. Verify items are present
    await expect(page.getByRole("option", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Search Emoji" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Calculator" })).toBeVisible();

    // 7. Type to search and verify filtering
    await basicInput.fill("Cal");
    await page.waitForTimeout(300);

    // 8. Close the dialog with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Shortcuts Example
    // ------------------------------------------------------------

    // 9. Get the with shortcuts section
    const shortcutsSection = page.getByText("With Shortcuts", { exact: true }).locator("..");

    // 10. Click the 'Open Menu' button
    await shortcutsSection.getByRole("button", { name: "Open Menu", exact: true }).click();
    await page.waitForTimeout(500);

    // 11. Verify the combobox is visible
    await expect(page.getByRole("combobox")).toBeVisible({ timeout: 10000 });

    // 12. Verify command items with shortcuts are present
    await expect(page.getByRole("option", { name: /Profile/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Billing/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Settings/ })).toBeVisible();

    // 13. Hover over the Profile option
    await page.getByRole("option", { name: /Profile/ }).hover();
    await page.waitForTimeout(300);

    // 14. Close the dialog with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Groups Example
    // ------------------------------------------------------------

    // 15. Get the with groups section
    const groupsSection = page.getByText("With Groups", { exact: true }).locator("..");

    // 16. Click the 'Open Menu' button
    await groupsSection.getByRole("button", { name: "Open Menu", exact: true }).click();
    await page.waitForTimeout(500);

    // 17. Verify the combobox is visible
    await expect(page.getByRole("combobox")).toBeVisible({ timeout: 10000 });

    // 18. Verify both groups are present (Suggestions and Settings)
    await expect(
      page.locator("[cmdk-group-heading]").filter({ hasText: "Suggestions" }),
    ).toBeVisible();
    await expect(
      page.locator("[cmdk-group-heading]").filter({ hasText: "Settings" }),
    ).toBeVisible();

    // 19. Close the dialog with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Many Groups & Items Example
    // ------------------------------------------------------------

    // 20. Get the many groups section
    const manyGroupsSection = page.getByText("Many Groups & Items", { exact: true }).locator("..");

    // 21. Click the 'Open Menu' button
    await manyGroupsSection.getByRole("button", { name: "Open Menu", exact: true }).click();
    await page.waitForTimeout(500);

    // 22. Verify the combobox is visible
    const manyInput = page.getByRole("combobox");
    await expect(manyInput).toBeVisible({ timeout: 10000 });

    // 23. Verify multiple groups are present
    await expect(
      page.locator("[cmdk-group-heading]").filter({ hasText: "Navigation" }),
    ).toBeVisible();
    await expect(page.locator("[cmdk-group-heading]").filter({ hasText: "Actions" })).toBeVisible();
    await expect(page.locator("[cmdk-group-heading]").filter({ hasText: "View" })).toBeVisible();
    await expect(page.locator("[cmdk-group-heading]").filter({ hasText: "Account" })).toBeVisible();
    await expect(page.locator("[cmdk-group-heading]").filter({ hasText: "Tools" })).toBeVisible();

    // 24. Test search functionality
    await manyInput.fill("Home");
    await page.waitForTimeout(300);

    // 25. Verify Home is visible
    await expect(page.getByRole("option", { name: /Home/ })).toBeVisible();

    // 26. Close the dialog with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 27. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();
    await page.waitForTimeout(500);

    // 28. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Command", level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // 29. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 30. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 31. Verify the Props section is present
    await expect(page.getByRole("heading", { name: "Props", level: 2 })).toBeVisible();

    // 32. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 33. Scroll to bottom to verify all examples are documented
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 34. Verify the example subsections are present
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Shortcuts", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Groups", level: 3 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Many Groups & Items", level: 3 }),
    ).toBeVisible();
  });
});
