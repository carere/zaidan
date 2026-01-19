import { expect, test } from "@playwright/test";

test.describe("Switch Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/switch");

    // Wait for the page to be ready
    await page.waitForSelector('[data-slot="switch"]');

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the switch is present
    const airplaneModeSwitch = basicSection.getByRole("switch", { name: "Airplane Mode" });
    await expect(airplaneModeSwitch).toBeVisible();

    // 3. Verify switch is unchecked initially
    await expect(airplaneModeSwitch).not.toBeChecked();

    // 4. Click the label to toggle it on
    await basicSection.getByText("Airplane Mode", { exact: true }).click();

    // 5. Wait for 300ms
    await page.waitForTimeout(300);

    // 6. Verify switch is now checked
    await expect(airplaneModeSwitch).toBeChecked();

    // 7. Click again to toggle it off
    await basicSection.getByText("Airplane Mode", { exact: true }).click();

    // 8. Verify switch is unchecked again
    await expect(airplaneModeSwitch).not.toBeChecked();

    // ------------------------------------------------------------
    // With Description Example
    // ------------------------------------------------------------

    // 9. Get the with description section
    const withDescriptionSection = page
      .getByText("With Description", { exact: true })
      .locator("..");

    // 10. Verify the switch is present
    const shareAcrossDevicesSwitch = withDescriptionSection.getByRole("switch");
    await expect(shareAcrossDevicesSwitch).toBeVisible();

    // 11. Verify the title is present
    await expect(withDescriptionSection.getByText("Share across devices")).toBeVisible();

    // 12. Verify the description is present
    await expect(
      withDescriptionSection.getByText(
        "Focus is shared across devices, and turns off when you leave the app.",
      ),
    ).toBeVisible();

    // 13. Verify switch is unchecked initially
    await expect(shareAcrossDevicesSwitch).not.toBeChecked();

    // 14. Click the title text (label) to toggle the switch
    await withDescriptionSection.getByText("Share across devices", { exact: true }).click();

    // 15. Wait for 300ms
    await page.waitForTimeout(300);

    // 16. Verify switch is now checked
    await expect(shareAcrossDevicesSwitch).toBeChecked();

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 17. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 18. Verify disabled unchecked switch is present and disabled
    const disabledUncheckedSwitch = disabledSection.getByRole("switch", {
      name: "Disabled (Unchecked)",
    });
    await expect(disabledUncheckedSwitch).toBeVisible();
    await expect(disabledUncheckedSwitch).toBeDisabled();
    await expect(disabledUncheckedSwitch).not.toBeChecked();

    // 19. Verify disabled checked switch is present and disabled
    const disabledCheckedSwitch = disabledSection.getByRole("switch", {
      name: "Disabled (Checked)",
    });
    await expect(disabledCheckedSwitch).toBeVisible();
    await expect(disabledCheckedSwitch).toBeDisabled();
    await expect(disabledCheckedSwitch).toBeChecked();

    // ------------------------------------------------------------
    // Sizes Example
    // ------------------------------------------------------------

    // 20. Get the sizes section
    const sizesSection = page.getByText("Sizes", { exact: true }).locator("..");

    // 21. Verify small switch is present
    const smallSwitch = sizesSection.getByRole("switch", { name: "Small" });
    await expect(smallSwitch).toBeVisible();

    // 22. Click the small switch label
    await sizesSection.getByText("Small", { exact: true }).click();

    // 23. Wait for 300ms
    await page.waitForTimeout(300);

    // 24. Verify small switch is now checked
    await expect(smallSwitch).toBeChecked();

    // 25. Verify default switch is present
    const defaultSwitch = sizesSection.getByRole("switch", { name: "Default" });
    await expect(defaultSwitch).toBeVisible();

    // 26. Click the default switch label
    await sizesSection.getByText("Default", { exact: true }).click();

    // 27. Wait for 300ms
    await page.waitForTimeout(300);

    // 28. Verify default switch is now checked
    await expect(defaultSwitch).toBeChecked();
  });
});
