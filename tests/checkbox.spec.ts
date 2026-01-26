import { expect, test } from "@playwright/test";

test.describe("Checkbox Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/checkbox");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the checkbox is visible and unchecked
    const basicCheckbox = basicSection.getByRole("checkbox", {
      name: "Accept terms and conditions",
    });
    await expect(basicCheckbox).toBeVisible();
    await expect(basicCheckbox).not.toBeChecked();

    // 3. Click the label to check the checkbox (Kobalte checkbox control intercepts pointer events)
    await basicSection.getByText("Accept terms and conditions").click();

    // 4. Verify the checkbox is now checked
    await expect(basicCheckbox).toBeChecked();

    // 5. Click the label again to uncheck it
    await basicSection.getByText("Accept terms and conditions").click();

    // 6. Verify the checkbox is now unchecked
    await expect(basicCheckbox).not.toBeChecked();

    // ------------------------------------------------------------
    // With Description Example
    // ------------------------------------------------------------

    // 7. Get the with description section
    const withDescSection = page.getByText("With Description", { exact: true }).locator("..");

    // 8. Verify the checkbox is visible and checked by default
    const descCheckbox = withDescSection.getByRole("checkbox", {
      name: "Accept terms and conditions",
    });
    await expect(descCheckbox).toBeVisible();
    await expect(descCheckbox).toBeChecked();

    // 9. Verify the description text is visible
    await expect(
      withDescSection.getByText(
        "By clicking this checkbox, you agree to the terms and conditions.",
      ),
    ).toBeVisible();

    // 10. Toggle the checkbox by clicking the label
    await withDescSection.getByText("Accept terms and conditions", { exact: true }).click();
    await expect(descCheckbox).not.toBeChecked();

    // ------------------------------------------------------------
    // Invalid Example
    // ------------------------------------------------------------

    // 11. Get the invalid section
    const invalidSection = page.getByText("Invalid", { exact: true }).locator("..");

    // 12. Verify the checkbox is visible
    const invalidCheckbox = invalidSection.getByRole("checkbox", {
      name: "Accept terms and conditions",
    });
    await expect(invalidCheckbox).toBeVisible();

    // 13. Toggle the invalid checkbox by clicking the label
    await invalidSection.getByText("Accept terms and conditions").click();
    await expect(invalidCheckbox).toBeChecked();

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 14. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 15. Verify the checkbox is visible and disabled
    const disabledCheckbox = disabledSection.getByRole("checkbox", {
      name: "Enable notifications",
    });
    await expect(disabledCheckbox).toBeVisible();
    await expect(disabledCheckbox).toBeDisabled();

    // ------------------------------------------------------------
    // With Title Example
    // ------------------------------------------------------------

    // 16. Get the with title section
    const withTitleSection = page.getByText("With Title", { exact: true }).locator("..");

    // 17. Verify the first checkbox (enabled) is visible and checked by default
    const titleCheckbox1 = withTitleSection
      .getByRole("checkbox", { name: /Enable notifications/ })
      .first();
    await expect(titleCheckbox1).toBeVisible();
    await expect(titleCheckbox1).toBeChecked();

    // 18. Verify the second checkbox (disabled) is visible and disabled
    const titleCheckbox2 = withTitleSection
      .getByRole("checkbox", { name: /Enable notifications/ })
      .nth(1);
    await expect(titleCheckbox2).toBeVisible();
    await expect(titleCheckbox2).toBeDisabled();

    // 19. Toggle the first checkbox by clicking its title
    await withTitleSection.getByText("Enable notifications", { exact: true }).first().click();
    await expect(titleCheckbox1).not.toBeChecked();

    // ------------------------------------------------------------
    // In Table Example
    // ------------------------------------------------------------

    // 20. Get the in table section
    const tableSection = page.getByText("In Table", { exact: true }).locator("..");

    // 21. Verify the table is visible
    const table = tableSection.getByRole("table");
    await expect(table).toBeVisible();

    // 22. Verify Sarah Chen's row is selected by default
    const sarahRow = table.getByRole("row", { name: /Sarah Chen/ });
    await expect(sarahRow).toBeVisible();
    const sarahCheckbox = sarahRow.getByRole("checkbox");
    await expect(sarahCheckbox).toBeChecked();

    // 23. Verify Marcus Rodriguez's row is not selected
    const marcusRow = table.getByRole("row", { name: /Marcus Rodriguez/ });
    const marcusCheckbox = marcusRow.getByRole("checkbox");
    await expect(marcusCheckbox).not.toBeChecked();

    // 24. Click Marcus's checkbox to select him (use force: true for table checkboxes)
    await marcusCheckbox.click({ force: true });
    await expect(marcusCheckbox).toBeChecked();

    // 25. Click the "select all" checkbox in the header
    const selectAllCheckbox = table.getByRole("columnheader").first().getByRole("checkbox");
    await selectAllCheckbox.click({ force: true });

    // 26. Verify all rows are now selected
    await expect(sarahCheckbox).toBeChecked();
    await expect(marcusCheckbox).toBeChecked();
    const priyaCheckbox = table.getByRole("row", { name: /Priya Patel/ }).getByRole("checkbox");
    await expect(priyaCheckbox).toBeChecked();
    const davidCheckbox = table.getByRole("row", { name: /David Kim/ }).getByRole("checkbox");
    await expect(davidCheckbox).toBeChecked();

    // 27. Click select all again to deselect all
    await selectAllCheckbox.click({ force: true });

    // 28. Verify all rows are now deselected
    await expect(sarahCheckbox).not.toBeChecked();
    await expect(marcusCheckbox).not.toBeChecked();
    await expect(priyaCheckbox).not.toBeChecked();
    await expect(davidCheckbox).not.toBeChecked();

    // ------------------------------------------------------------
    // Group Example
    // ------------------------------------------------------------

    // 29. Get the group section
    const groupSection = page.getByText("Group", { exact: true }).locator("..");

    // 30. Verify the group label is visible
    await expect(groupSection.getByText("Show these items on the desktop:")).toBeVisible();

    // 31. Verify all checkboxes are visible and unchecked by default
    const hardDisksCheckbox = groupSection.getByRole("checkbox", { name: "Hard disks" });
    const externalDisksCheckbox = groupSection.getByRole("checkbox", { name: "External disks" });
    const cdsCheckbox = groupSection.getByRole("checkbox", { name: "CDs, DVDs, and iPods" });
    const serversCheckbox = groupSection.getByRole("checkbox", { name: "Connected servers" });

    await expect(hardDisksCheckbox).toBeVisible();
    await expect(hardDisksCheckbox).not.toBeChecked();
    await expect(externalDisksCheckbox).toBeVisible();
    await expect(externalDisksCheckbox).not.toBeChecked();
    await expect(cdsCheckbox).toBeVisible();
    await expect(cdsCheckbox).not.toBeChecked();
    await expect(serversCheckbox).toBeVisible();
    await expect(serversCheckbox).not.toBeChecked();

    // 32. Check a few checkboxes by clicking their labels
    await groupSection.getByText("Hard disks").click();
    await groupSection.getByText("CDs, DVDs, and iPods").click();

    // 33. Verify the selected checkboxes are checked
    await expect(hardDisksCheckbox).toBeChecked();
    await expect(cdsCheckbox).toBeChecked();
    await expect(externalDisksCheckbox).not.toBeChecked();
    await expect(serversCheckbox).not.toBeChecked();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 34. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 35. Wait for docs view to load
    await page.waitForTimeout(500);

    // 36. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Checkbox", level: 1 })).toBeVisible();

    // 37. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 38. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 39. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 40. Verify all example subsections are present
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Description", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invalid", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Disabled", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Title", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Table", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Group", level: 3 })).toBeVisible();

    // 41. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 42. Wait for scroll animation
    await page.waitForTimeout(300);
  });
});
