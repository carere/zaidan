import { expect, test } from "@playwright/test";

test.describe("", () => {
  test("examples", async ({ page }) => {
    await page.goto(`http://localhost:${process.env.FRONTEND_PORT}/ui/native-select`);
    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the basic select is visible
    const basicSelect = basicSection.getByRole("combobox");
    await expect(basicSelect).toBeVisible();

    // 3. Verify default placeholder text
    await expect(basicSelect).toHaveValue("");

    // 4. Hover over the select
    await basicSelect.hover();

    // 5. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 6. Select an option
    await basicSelect.selectOption("apple");

    // 7. Verify the selected value
    await expect(basicSelect).toHaveValue("apple");

    // 8. Verify disabled option exists (Grapes)
    const grapesOption = basicSection.locator('option[value="grapes"]');
    await expect(grapesOption).toBeDisabled();

    // ------------------------------------------------------------
    // With Groups Example
    // ------------------------------------------------------------

    // 9. Get the with groups section
    const groupsSection = page.getByText("With Groups", { exact: true }).locator("..");

    // 10. Verify the select with groups is visible
    const groupsSelect = groupsSection.getByRole("combobox");
    await expect(groupsSelect).toBeVisible();

    // 11. Hover over the select
    await groupsSelect.hover();

    // 12. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 13. Select a fruit option
    await groupsSelect.selectOption("banana");

    // 14. Verify the selected value
    await expect(groupsSelect).toHaveValue("banana");

    // 15. Select a vegetable option
    await groupsSelect.selectOption("carrot");

    // 16. Verify the selected value changed
    await expect(groupsSelect).toHaveValue("carrot");

    // ------------------------------------------------------------
    // Sizes Example
    // ------------------------------------------------------------

    // 17. Get the sizes section
    const sizesSection = page.getByText("Sizes", { exact: true }).locator("..");

    // 18. Verify both size variants are visible
    const sizeSelects = sizesSection.getByRole("combobox");
    await expect(sizeSelects).toHaveCount(2);

    // 19. Hover over the first (small) select
    await sizeSelects.first().hover();

    // 20. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 21. Select an option in the small select
    await sizeSelects.first().selectOption("apple");

    // 22. Verify the selected value
    await expect(sizeSelects.first()).toHaveValue("apple");

    // 23. Select an option in the default select
    await sizeSelects.last().selectOption("blueberry");

    // 24. Verify the selected value
    await expect(sizeSelects.last()).toHaveValue("blueberry");

    // ------------------------------------------------------------
    // With Field Example
    // ------------------------------------------------------------

    // 25. Get the with field section
    const fieldSection = page.getByText("With Field", { exact: true }).locator("..");

    // 26. Verify the field label is visible
    await expect(fieldSection.locator('[data-slot="field-label"]')).toBeVisible();

    // 27. Verify the select is visible
    const fieldSelect = fieldSection.getByRole("combobox", { name: "Country" });
    await expect(fieldSelect).toBeVisible();

    // 28. Verify the field description is visible
    await expect(fieldSection.locator('[data-slot="field-description"]')).toBeVisible();

    // 29. Hover over the select
    await fieldSelect.hover();

    // 30. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 31. Select a country
    await fieldSelect.selectOption("ca");

    // 32. Verify the selected value
    await expect(fieldSelect).toHaveValue("ca");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 33. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 34. Verify the disabled select is visible
    const disabledSelect = disabledSection.getByRole("combobox");
    await expect(disabledSelect).toBeVisible();

    // 35. Verify the select is disabled
    await expect(disabledSelect).toBeDisabled();

    // ------------------------------------------------------------
    // Invalid Example
    // ------------------------------------------------------------

    // 36. Get the invalid section
    const invalidSection = page.getByText("Invalid", { exact: true }).locator("..");

    // 37. Verify the invalid select is visible
    const invalidSelect = invalidSection.getByRole("combobox");
    await expect(invalidSelect).toBeVisible();

    // 38. Verify the select has aria-invalid attribute
    await expect(invalidSelect).toHaveAttribute("aria-invalid", "true");

    // 39. Hover over the select
    await invalidSelect.hover();

    // 40. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 41. Select an option
    await invalidSelect.selectOption("banana");

    // 42. Verify the selected value
    await expect(invalidSelect).toHaveValue("banana");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 43. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 44. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Native Select", level: 1 })).toBeVisible();

    // 45. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 46. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 47. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 48. Scroll to bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 49. Wait for scroll to complete
    await page.waitForTimeout(500);

    // 50. Verify the Accessibility section is visible at the bottom
    await expect(page.getByRole("heading", { name: "Accessibility", level: 2 })).toBeVisible();
  });
});
