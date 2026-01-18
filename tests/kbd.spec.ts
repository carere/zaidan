import { expect, test } from "@playwright/test";

test.describe("Kbd Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5175/ui/kbd");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the Ctrl kbd is visible
    await expect(basicSection.getByText("Ctrl", { exact: true })).toBeVisible();

    // 3. Verify the ⌘K kbd is visible
    await expect(basicSection.getByText("⌘K")).toBeVisible();

    // 4. Verify the Ctrl + B kbd is visible
    await expect(basicSection.getByText("Ctrl + B")).toBeVisible();

    // ------------------------------------------------------------
    // Modifier Keys Example
    // ------------------------------------------------------------

    // 5. Get the modifier keys section
    const modifierSection = page.getByText("Modifier Keys", { exact: true }).locator("..");

    // 6. Verify the ⌘ kbd is visible
    await expect(modifierSection.getByText("⌘", { exact: true })).toBeVisible();

    // 7. Verify the C kbd is visible
    await expect(modifierSection.getByText("C", { exact: true })).toBeVisible();

    // ------------------------------------------------------------
    // KbdGroup Example
    // ------------------------------------------------------------

    // 8. Get the KbdGroup section
    const groupSection = page.getByText("KbdGroup", { exact: true }).locator("..");

    // 9. Verify the grouped keys are visible
    await expect(groupSection.getByText("Ctrl", { exact: true })).toBeVisible();
    await expect(groupSection.getByText("Shift", { exact: true })).toBeVisible();
    await expect(groupSection.getByText("P", { exact: true })).toBeVisible();

    // ------------------------------------------------------------
    // Arrow Keys Example
    // ------------------------------------------------------------

    // 10. Get the Arrow Keys section
    const arrowSection = page.getByText("Arrow Keys", { exact: true }).locator("..");

    // 11. Verify arrow keys are visible
    await expect(arrowSection.getByText("↑")).toBeVisible();
    await expect(arrowSection.getByText("↓")).toBeVisible();
    await expect(arrowSection.getByText("←")).toBeVisible();
    await expect(arrowSection.getByText("→")).toBeVisible();

    // ------------------------------------------------------------
    // With Icons Example
    // ------------------------------------------------------------

    // 12. Get the With Icons section and verify it exists
    const iconsSection = page.getByText("With Icons", { exact: true }).locator("..");
    await expect(iconsSection).toBeVisible();

    // ------------------------------------------------------------
    // With Icons and Text Example
    // ------------------------------------------------------------

    // 13. Get the With Icons and Text section
    const iconsTextSection = page.getByText("With Icons and Text", { exact: true }).locator("..");

    // 14. Verify the Left kbd with icon is visible
    await expect(iconsTextSection.getByText("Left")).toBeVisible();

    // 15. Verify the Voice Enabled kbd with icon is visible
    await expect(iconsTextSection.getByText("Voice Enabled")).toBeVisible();

    // ------------------------------------------------------------
    // InputGroup Example
    // ------------------------------------------------------------

    // 16. Get the InputGroup section
    const inputSection = page.getByText("InputGroup", { exact: true }).locator("..");

    // 17. Verify the Space kbd is visible
    await expect(inputSection.getByText("Space")).toBeVisible();

    // 18. Verify the input field is present and interactable
    const inputField = inputSection.getByRole("textbox");
    await expect(inputField).toBeVisible();

    // 19. Click and type in the input field
    await inputField.click();
    await inputField.fill("Test input");

    // 20. Verify the input value
    await expect(inputField).toHaveValue("Test input");

    // ------------------------------------------------------------
    // Tooltip Example
    // ------------------------------------------------------------

    // 21. Get the Tooltip section
    const tooltipSection = page.getByText("Tooltip", { exact: true }).locator("..");

    // 22. Find and hover over the button
    const tooltipButton = tooltipSection.getByRole("button");
    await expect(tooltipButton).toBeVisible();

    // 23. Hover over the button to trigger tooltip
    await tooltipButton.hover();

    // 24. Wait for tooltip to appear
    await page.waitForTimeout(100);

    // 25. Verify the tooltip content is visible
    await expect(page.getByText("Save Changes")).toBeVisible();

    // 26. Verify the S kbd is visible inside the tooltip
    await expect(page.getByRole("tooltip").getByText("S", { exact: true })).toBeVisible();

    // 27. Move mouse away from tooltip
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    // ------------------------------------------------------------
    // With samp Example
    // ------------------------------------------------------------

    // 28. Get the With samp section
    const sampSection = page.getByText("With samp", { exact: true }).locator("..");

    // 29. Verify the File text is visible
    await expect(sampSection.getByText("File")).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 30. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 31. Wait for docs to load
    await page.waitForTimeout(500);

    // 32. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Kbd", level: 1 })).toBeVisible();

    // 33. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 34. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 35. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 36. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 37. Wait for scroll to complete
    await page.waitForTimeout(300);

    // 38. Verify the API Reference section is visible
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();
  });
});
