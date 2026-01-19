import { expect, test } from "@playwright/test";

test.describe("Tabs Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5176/ui/tabs");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the Home tab is selected by default
    const homeTab = basicSection.getByRole("tab", { name: "Home" });
    await expect(homeTab).toHaveAttribute("aria-selected", "true");

    // 3. Hover over the Settings tab
    await basicSection.getByRole("tab", { name: "Settings" }).hover();

    // 4. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 5. Click the Settings tab
    await basicSection.getByRole("tab", { name: "Settings" }).click();

    // 6. Verify the Settings tab is now selected
    const settingsTab = basicSection.getByRole("tab", { name: "Settings" });
    await expect(settingsTab).toHaveAttribute("aria-selected", "true");

    // 7. Verify the Home tab is no longer selected
    await expect(homeTab).toHaveAttribute("aria-selected", "false");

    // ------------------------------------------------------------
    // Line Example
    // ------------------------------------------------------------

    // 8. Get the line section
    const lineSection = page.getByText("Line", { exact: true }).locator("..");

    // 9. Verify the Overview tab is selected by default
    const overviewTab = lineSection.getByRole("tab", { name: "Overview" });
    await expect(overviewTab).toHaveAttribute("aria-selected", "true");

    // 10. Click the Analytics tab
    await lineSection.getByRole("tab", { name: "Analytics" }).hover();
    await page.waitForTimeout(300);
    await lineSection.getByRole("tab", { name: "Analytics" }).click();

    // 11. Verify the Analytics tab is now selected
    await expect(lineSection.getByRole("tab", { name: "Analytics" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 12. Click the Reports tab
    await lineSection.getByRole("tab", { name: "Reports" }).hover();
    await page.waitForTimeout(300);
    await lineSection.getByRole("tab", { name: "Reports" }).click();

    // 13. Verify the Reports tab is now selected
    await expect(lineSection.getByRole("tab", { name: "Reports" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 14. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 15. Verify the Home tab is selected
    await expect(disabledSection.getByRole("tab", { name: "Home" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 16. Verify the Disabled tab has disabled attribute
    const disabledTab = disabledSection.getByRole("tab", { name: "Disabled" });
    await expect(disabledTab).toBeDisabled();

    // ------------------------------------------------------------
    // With Icons Example
    // ------------------------------------------------------------

    // 17. Get the with icons section
    const withIconsSection = page.getByText("With Icons", { exact: true }).locator("..");

    // 18. Verify the Preview tab is selected by default
    await expect(withIconsSection.getByRole("tab", { name: "Preview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 19. Click the Code tab
    await withIconsSection.getByRole("tab", { name: "Code" }).hover();
    await page.waitForTimeout(300);
    await withIconsSection.getByRole("tab", { name: "Code" }).click();

    // 20. Verify the Code tab is now selected
    await expect(withIconsSection.getByRole("tab", { name: "Code" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // ------------------------------------------------------------
    // Icon Only Example
    // ------------------------------------------------------------

    // 21. Get the icon only section
    const iconOnlySection = page.getByText("Icon Only", { exact: true }).locator("..");

    // 22. Get all tabs in the icon only section
    const iconOnlyTabs = iconOnlySection.getByRole("tab");

    // 23. Verify there are 3 tabs
    await expect(iconOnlyTabs).toHaveCount(3);

    // 24. Click the second tab (search)
    await iconOnlyTabs.nth(1).hover();
    await page.waitForTimeout(300);
    await iconOnlyTabs.nth(1).click();

    // 25. Verify the second tab is selected
    await expect(iconOnlyTabs.nth(1)).toHaveAttribute("aria-selected", "true");

    // ------------------------------------------------------------
    // With Content Example
    // ------------------------------------------------------------

    // 26. Get the with content section
    const withContentSection = page.getByText("With Content", { exact: true }).locator("..");

    // 27. Verify the Account tab is selected by default
    await expect(withContentSection.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 28. Verify the account content is visible
    const accountPanel = withContentSection.getByRole("tabpanel");
    await expect(accountPanel).toContainText("Manage your account preferences");

    // 29. Click the Password tab
    await withContentSection.getByRole("tab", { name: "Password" }).hover();
    await page.waitForTimeout(300);
    await withContentSection.getByRole("tab", { name: "Password" }).click();

    // 30. Verify the password content is visible
    await expect(withContentSection.getByRole("tabpanel")).toContainText(
      "Update your password to keep your account secure",
    );

    // 31. Click the Notifications tab
    await withContentSection.getByRole("tab", { name: "Notifications" }).hover();
    await page.waitForTimeout(300);
    await withContentSection.getByRole("tab", { name: "Notifications" }).click();

    // 32. Verify the notifications content is visible
    await expect(withContentSection.getByRole("tabpanel")).toContainText(
      "Configure how you receive notifications",
    );

    // ------------------------------------------------------------
    // With Dropdown Example
    // ------------------------------------------------------------

    // 33. Get the with dropdown section
    const withDropdownSection = page.getByText("With Dropdown", { exact: true }).locator("..");

    // 34. Verify the Overview tab is selected by default
    await expect(withDropdownSection.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 35. Hover over the More options button
    await withDropdownSection.getByRole("button", { name: "More options" }).hover();

    // 36. Wait for 300ms
    await page.waitForTimeout(300);

    // 37. Click the More options button
    await withDropdownSection.getByRole("button", { name: "More options" }).click();

    // 38. Verify the dropdown menu is visible
    const dropdownMenu = page.getByRole("menu");
    await expect(dropdownMenu).toBeVisible();

    // 39. Verify menu items are present
    await expect(dropdownMenu.getByRole("menuitem", { name: "Settings" })).toBeVisible();
    await expect(dropdownMenu.getByRole("menuitem", { name: "Export" })).toBeVisible();
    await expect(dropdownMenu.getByRole("menuitem", { name: "Archive" })).toBeVisible();

    // 40. Click outside to close the dropdown
    await page.keyboard.press("Escape");
    await expect(dropdownMenu).toBeHidden();

    // ------------------------------------------------------------
    // Vertical Example
    // ------------------------------------------------------------

    // 41. Get the vertical section
    const verticalSection = page.getByText("Vertical", { exact: true }).locator("..");

    // 42. Verify the Account tab is selected by default
    await expect(verticalSection.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 43. Click the Password tab
    await verticalSection.getByRole("tab", { name: "Password" }).hover();
    await page.waitForTimeout(300);
    await verticalSection.getByRole("tab", { name: "Password" }).click();

    // 44. Verify the Password content is visible
    await expect(verticalSection.getByRole("tabpanel")).toContainText(
      "Update your password to keep your account secure",
    );

    // ------------------------------------------------------------
    // With Input and Button Example
    // ------------------------------------------------------------

    // 45. Get the with input and button section
    const withInputSection = page.getByText("With Input and Button", { exact: true }).locator("..");

    // 46. Verify the Overview tab is selected
    await expect(withInputSection.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 47. Verify the input and button are present
    await expect(withInputSection.getByRole("textbox", { name: "Search..." })).toBeVisible();
    await expect(withInputSection.getByRole("button", { name: "Action" })).toBeVisible();

    // 48. Type in the search input
    await withInputSection.getByRole("textbox", { name: "Search..." }).fill("test search");

    // 49. Verify the input value
    await expect(withInputSection.getByRole("textbox", { name: "Search..." })).toHaveValue(
      "test search",
    );

    // 50. Click the Analytics tab
    await withInputSection.getByRole("tab", { name: "Analytics" }).hover();
    await page.waitForTimeout(300);
    await withInputSection.getByRole("tab", { name: "Analytics" }).click();

    // 51. Verify the Analytics content is visible
    await expect(withInputSection.getByRole("tabpanel")).toContainText(
      "Detailed analytics and insights",
    );

    // ------------------------------------------------------------
    // Line Disabled Example (verify disabled tabs in line variant)
    // ------------------------------------------------------------

    // 52. Get the line disabled section
    const lineDisabledSection = page.getByText("Line Disabled", { exact: true }).locator("..");

    // 53. Verify the Overview tab is selected by default
    await expect(lineDisabledSection.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 54. Verify the Reports tab is disabled
    const lineDisabledTab = lineDisabledSection.getByRole("tab", { name: "Reports" });
    await expect(lineDisabledTab).toBeDisabled();
  });
});
