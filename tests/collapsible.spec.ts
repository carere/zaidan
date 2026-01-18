import { expect, test } from "@playwright/test";

test.describe("Collapsible Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/collapsible");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // File Tree Example
    // ------------------------------------------------------------

    // 1. Get the file tree section
    const fileTreeSection = page.getByText("File Tree", { exact: true }).locator("..");

    // 2. Verify the Explorer tab is selected
    await expect(fileTreeSection.getByRole("tab", { name: "Explorer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 3. Hover over the 'components' folder button
    await fileTreeSection.getByRole("button", { name: "components" }).hover();

    // 4. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 5. Click the 'components' folder to expand it
    await fileTreeSection.getByRole("button", { name: "components" }).click();

    // 6. Verify the collapsible expanded - check for nested content
    await expect(fileTreeSection.getByRole("button", { name: "ui" })).toBeVisible();
    await expect(fileTreeSection.getByRole("button", { name: "login-form.tsx" })).toBeVisible();
    await expect(fileTreeSection.getByRole("button", { name: "register-form.tsx" })).toBeVisible();

    // 7. Hover over the 'ui' folder button
    await fileTreeSection.getByRole("button", { name: "ui" }).hover();

    // 8. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 9. Click the 'ui' folder to expand it (nested collapsible)
    await fileTreeSection.getByRole("button", { name: "ui" }).click();

    // 10. Verify the nested collapsible expanded - check for nested files
    await expect(fileTreeSection.getByRole("button", { name: "button.tsx" })).toBeVisible();
    await expect(fileTreeSection.getByRole("button", { name: "card.tsx" })).toBeVisible();
    await expect(fileTreeSection.getByRole("button", { name: "dialog.tsx" })).toBeVisible();

    // 11. Collapse the 'components' folder
    await fileTreeSection.getByRole("button", { name: "components" }).click();

    // 12. Verify the content is collapsed - nested items should be hidden
    await expect(fileTreeSection.getByRole("button", { name: "ui" })).toBeHidden();

    // 13. Expand and test another folder
    await fileTreeSection.getByRole("button", { name: "lib" }).hover();
    await page.waitForTimeout(300);
    await fileTreeSection.getByRole("button", { name: "lib" }).click();

    // 14. Verify lib folder contents
    await expect(fileTreeSection.getByRole("button", { name: "utils.ts" })).toBeVisible();

    // 15. Collapse the lib folder
    await fileTreeSection.getByRole("button", { name: "lib" }).click();
    await expect(fileTreeSection.getByRole("button", { name: "utils.ts" })).toBeHidden();

    // ------------------------------------------------------------
    // Settings Example
    // ------------------------------------------------------------

    // 16. Get the settings section
    const settingsSection = page.getByText("Settings", { exact: true }).locator("..");

    // 17. Verify the card title and description
    await expect(settingsSection.getByTestId("card-title")).toHaveText("Radius");
    await expect(settingsSection.getByTestId("card-description")).toHaveText(
      "Set the corner radius of the element.",
    );

    // 18. Verify initial state - only 2 input fields visible
    const initialInputs = settingsSection.getByRole("textbox");
    await expect(initialInputs).toHaveCount(2);

    // 19. Find and click the expand/maximize button (the icon-only button in the collapsible)
    const expandButton = settingsSection.getByTestId("collapsible-trigger");
    await expandButton.hover();
    await page.waitForTimeout(300);
    await expandButton.click();

    // 20. Verify expanded state - should now have 4 input fields
    await expect(settingsSection.getByRole("textbox")).toHaveCount(4);

    // 21. Click again to collapse
    await expandButton.click();

    // 22. Verify collapsed state - back to 2 input fields
    await expect(settingsSection.getByRole("textbox")).toHaveCount(2);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 23. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 24. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Collapsible", level: 1 })).toBeVisible();

    // 25. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 26. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 27. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 28. Verify the File Tree example heading is present
    await expect(page.getByRole("heading", { name: "File Tree", level: 3 })).toBeVisible();

    // 29. Verify the Settings example heading is present
    await expect(page.getByRole("heading", { name: "Settings", level: 3 })).toBeVisible();

    // 30. Scroll to bottom to see all examples
    await page.evaluate(() => {
      const mainContent = document.querySelector("main");
      if (mainContent) {
        mainContent.scrollTo(0, mainContent.scrollHeight);
      }
    });

    // 31. Wait for scroll to complete
    await page.waitForTimeout(500);
  });
});
