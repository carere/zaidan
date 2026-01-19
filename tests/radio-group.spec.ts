import { expect, test } from "@playwright/test";

test.describe("Radio Group Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5180/ui/radio-group");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the default selection (Comfortable)
    const comfortableRadio = basicSection.getByRole("radio", { name: "Comfortable" });
    await expect(comfortableRadio).toBeChecked();

    // 3. Click the 'Default' label to select the radio
    await basicSection.getByText("Default", { exact: true }).click();

    // 4. Verify 'Default' is now checked
    await expect(basicSection.getByRole("radio", { name: "Default" })).toBeChecked();
    await expect(comfortableRadio).not.toBeChecked();

    // 5. Click the 'Compact' label
    await basicSection.getByText("Compact", { exact: true }).click();

    // 6. Verify 'Compact' is now checked
    await expect(basicSection.getByRole("radio", { name: "Compact" })).toBeChecked();

    // ------------------------------------------------------------
    // With Descriptions Example
    // ------------------------------------------------------------

    // 7. Get the with descriptions section
    const descriptionsSection = page.getByText("With Descriptions", { exact: true }).locator("..");

    // 8. Verify Plus is the default selection
    const plusRadio = descriptionsSection.getByRole("radio", { name: /Plus/ });
    await expect(plusRadio).toBeChecked();

    // 9. Click the 'Pro' text to select the radio
    await descriptionsSection.locator("div").filter({ hasText: /^Pro$/ }).first().click();

    // 10. Verify 'Pro' is now checked
    await expect(descriptionsSection.getByRole("radio", { name: /Pro/ })).toBeChecked();

    // 11. Click the 'Enterprise' text
    await descriptionsSection
      .locator("div")
      .filter({ hasText: /^Enterprise$/ })
      .first()
      .click();

    // 12. Verify 'Enterprise' is now checked
    await expect(descriptionsSection.getByRole("radio", { name: /Enterprise/ })).toBeChecked();

    // ------------------------------------------------------------
    // With FieldSet Example
    // ------------------------------------------------------------

    // 13. Get the with fieldset section
    const fieldsetSection = page.getByText("With FieldSet", { exact: true }).locator("..");

    // 14. Verify Medium is the default selection
    const mediumRadio = fieldsetSection.getByRole("radio", { name: "Medium" });
    await expect(mediumRadio).toBeChecked();

    // 15. Verify the fieldset legend
    await expect(fieldsetSection.getByText("Battery Level", { exact: true })).toBeVisible();
    await expect(fieldsetSection.getByText("Choose your preferred battery level.")).toBeVisible();

    // 16. Click the 'High' label
    await fieldsetSection.getByText("High", { exact: true }).click();

    // 17. Verify 'High' is now checked
    await expect(fieldsetSection.getByRole("radio", { name: "High" })).toBeChecked();

    // 18. Click the 'Low' label
    await fieldsetSection.getByText("Low", { exact: true }).click();

    // 19. Verify 'Low' is now checked
    await expect(fieldsetSection.getByRole("radio", { name: "Low" })).toBeChecked();

    // ------------------------------------------------------------
    // Grid Layout Example
    // ------------------------------------------------------------

    // 20. Get the grid layout section
    const gridSection = page.getByText("Grid Layout", { exact: true }).locator("..");

    // 21. Verify Medium is the default selection in grid
    const gridMediumRadio = gridSection.getByRole("radio", { name: "Medium" });
    await expect(gridMediumRadio).toBeChecked();

    // 22. Click the 'Small' text
    await gridSection
      .locator("div")
      .filter({ hasText: /^Small$/ })
      .first()
      .click();

    // 23. Verify 'Small' is now checked
    await expect(gridSection.getByRole("radio", { name: "Small" })).toBeChecked();

    // 24. Click the 'Large' text
    await gridSection
      .locator("div")
      .filter({ hasText: /^Large$/ })
      .first()
      .click();

    // 25. Verify 'Large' is now checked
    await expect(gridSection.getByRole("radio", { name: "Large", exact: true })).toBeChecked();

    // 26. Click the 'X-Large' text
    await gridSection
      .locator("div")
      .filter({ hasText: /^X-Large$/ })
      .first()
      .click();

    // 27. Verify 'X-Large' is now checked
    await expect(gridSection.getByRole("radio", { name: "X-Large" })).toBeChecked();

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 28. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 29. Verify Option 2 is the default selection (it's disabled but pre-selected)
    await expect(disabledSection.getByRole("radio", { name: "Option 2" })).toBeChecked();

    // 30. Verify all radios are disabled
    await expect(disabledSection.getByRole("radio", { name: "Option 1" })).toBeDisabled();
    await expect(disabledSection.getByRole("radio", { name: "Option 2" })).toBeDisabled();
    await expect(disabledSection.getByRole("radio", { name: "Option 3" })).toBeDisabled();

    // ------------------------------------------------------------
    // Invalid Example
    // ------------------------------------------------------------

    // 31. Get the invalid section
    const invalidSection = page.getByText("Invalid", { exact: true }).locator("..");

    // 32. Verify the fieldset legend
    await expect(invalidSection.getByText("Notification Preferences")).toBeVisible();
    await expect(
      invalidSection.getByText("Choose how you want to receive notifications."),
    ).toBeVisible();

    // 33. Verify Email only is the default selection
    await expect(invalidSection.getByRole("radio", { name: "Email only" })).toBeChecked();

    // 34. Click the 'SMS only' label
    await invalidSection.getByText("SMS only", { exact: true }).click();

    // 35. Verify 'SMS only' is now checked
    await expect(invalidSection.getByRole("radio", { name: "SMS only" })).toBeChecked();

    // 36. Click the 'Both Email & SMS' label
    await invalidSection.getByText("Both Email & SMS", { exact: true }).click();

    // 37. Verify 'Both Email & SMS' is now checked
    await expect(invalidSection.getByRole("radio", { name: "Both Email & SMS" })).toBeChecked();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 38. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 39. Wait for page transition
    await page.waitForTimeout(500);

    // 40. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Radio Group", level: 1 })).toBeVisible();

    // 41. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 42. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 43. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();
  });
});
