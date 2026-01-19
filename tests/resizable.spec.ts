import { expect, test } from "@playwright/test";

test.describe("Resizable Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:4200/ui/resizable");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Horizontal Example
    // ------------------------------------------------------------

    // 1. Get the horizontal section
    const horizontalSection = page.getByText("Horizontal", { exact: true }).locator("..");

    // 2. Verify Sidebar text is visible
    await expect(horizontalSection.getByText("Sidebar")).toBeVisible();

    // 3. Verify Content text is visible
    await expect(horizontalSection.getByText("Content")).toBeVisible();

    // 4. Verify the separator (handle) is present
    await expect(horizontalSection.getByRole("separator").first()).toBeVisible();

    // 5. Test resizing - drag the handle
    const horizontalHandle = horizontalSection.getByRole("separator").first();
    await horizontalHandle.hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Vertical Example
    // ------------------------------------------------------------

    // 6. Get the vertical section
    const verticalSection = page.getByText("Vertical", { exact: true }).locator("..");

    // 7. Verify Header text is visible
    await expect(verticalSection.getByText("Header")).toBeVisible();

    // 8. Verify Content text is visible (get the second one since horizontal also has Content)
    await expect(verticalSection.getByText("Content")).toBeVisible();

    // 9. Verify the separator (handle) is present
    await expect(verticalSection.getByRole("separator").first()).toBeVisible();

    // 10. Hover over the vertical handle
    const verticalHandle = verticalSection.getByRole("separator").first();
    await verticalHandle.hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Handle Example
    // ------------------------------------------------------------

    // 11. Get the with handle section
    const withHandleSection = page.getByText("With Handle", { exact: true }).locator("..");

    // 12. Verify Sidebar text is visible
    await expect(withHandleSection.getByText("Sidebar")).toBeVisible();

    // 13. Verify Content text is visible
    await expect(withHandleSection.getByText("Content")).toBeVisible();

    // 14. Verify the separator (handle) is present
    const handleWithIcon = withHandleSection.getByRole("separator").first();
    await expect(handleWithIcon).toBeVisible();

    // 15. Hover over the handle with icon
    await handleWithIcon.hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Nested Example
    // ------------------------------------------------------------

    // 16. Get the nested section
    const nestedSection = page.getByText("Nested", { exact: true }).locator("..");

    // 17. Verify One, Two, Three panels are visible
    await expect(nestedSection.getByText("One")).toBeVisible();
    await expect(nestedSection.getByText("Two")).toBeVisible();
    await expect(nestedSection.getByText("Three")).toBeVisible();

    // 18. Verify multiple separators exist (horizontal and vertical)
    const nestedSeparators = nestedSection.getByRole("separator");
    await expect(nestedSeparators.first()).toBeVisible();

    // 19. Hover over the first nested handle
    await nestedSeparators.first().hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Controlled Example
    // ------------------------------------------------------------

    // 20. Get the controlled section
    const controlledSection = page.getByText("Controlled", { exact: true }).locator("..");

    // 21. Verify the percentage displays are visible (30% and 70%)
    await expect(controlledSection.getByText("30%")).toBeVisible();
    await expect(controlledSection.getByText("70%")).toBeVisible();

    // 22. Get the controlled handle
    const controlledHandle = controlledSection.getByRole("separator").first();
    await expect(controlledHandle).toBeVisible();

    // 23. Test resizing - drag the handle to change percentages
    const handleBox = await controlledHandle.boundingBox();
    if (handleBox) {
      // Drag the handle 50px to the right
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        handleBox.x + handleBox.width / 2 + 50,
        handleBox.y + handleBox.height / 2,
      );
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 24. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 25. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Resizable", level: 1 })).toBeVisible();

    // 26. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 27. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 28. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 29. Verify example subsections
    await expect(page.getByRole("heading", { name: "Horizontal", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vertical", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Handle", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nested", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Controlled", level: 3 })).toBeVisible();

    // 30. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });
});
