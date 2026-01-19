import { expect, test } from "@playwright/test";

test.describe("Separator Component", () => {
  test("examples", async ({ page }) => {
    await page.goto(`http://localhost:${process.env.FRONTEND_PORT || 5181}/ui/separator`);

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Horizontal Example
    // ------------------------------------------------------------

    // 1. Get the horizontal section
    const horizontalSection = page.getByText("Horizontal", { exact: true }).locator("..");

    // 2. Verify the horizontal section is visible
    await expect(horizontalSection).toBeVisible();

    // 3. Verify the separator content is present
    await expect(horizontalSection.getByText("shadcn/ui")).toBeVisible();
    await expect(
      horizontalSection.getByText("The Foundation for your Design System"),
    ).toBeVisible();

    // 4. Verify the horizontal separator is present
    await expect(horizontalSection.locator("[data-slot='separator']").first()).toBeVisible();

    // 5. Wait for visual inspection
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Vertical Example
    // ------------------------------------------------------------

    // 6. Get the vertical section
    const verticalSection = page.getByText("Vertical", { exact: true }).first().locator("..");

    // 7. Verify the vertical section is visible
    await expect(verticalSection).toBeVisible();

    // 8. Verify the navigation items are present
    await expect(verticalSection.getByText("Blog")).toBeVisible();
    await expect(verticalSection.getByText("Docs")).toBeVisible();
    await expect(verticalSection.getByText("Source")).toBeVisible();

    // 9. Verify vertical separators are present (orientation=vertical)
    const verticalSeparators = verticalSection.locator(
      "[data-slot='separator'][data-orientation='vertical']",
    );
    await expect(verticalSeparators.first()).toBeVisible();

    // 10. Wait for visual inspection
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Vertical Menu Example
    // ------------------------------------------------------------

    // 11. Get the vertical menu section
    const verticalMenuSection = page.getByText("Vertical Menu", { exact: true }).locator("..");

    // 12. Verify the vertical menu section is visible
    await expect(verticalMenuSection).toBeVisible();

    // 13. Verify menu items are present
    await expect(verticalMenuSection.getByText("Settings")).toBeVisible();
    await expect(verticalMenuSection.getByText("Manage preferences")).toBeVisible();
    await expect(verticalMenuSection.getByText("Account")).toBeVisible();
    await expect(verticalMenuSection.getByText("Profile & security")).toBeVisible();
    await expect(verticalMenuSection.getByText("Help")).toBeVisible();
    await expect(verticalMenuSection.getByText("Support & docs")).toBeVisible();

    // 14. Verify vertical separators are present
    const menuSeparators = verticalMenuSection.locator(
      "[data-slot='separator'][data-orientation='vertical']",
    );
    await expect(menuSeparators.first()).toBeVisible();

    // 15. Wait for visual inspection
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // In List Example
    // ------------------------------------------------------------

    // 16. Get the in list section
    const inListSection = page.getByText("In List", { exact: true }).locator("..");

    // 17. Verify the in list section is visible
    await expect(inListSection).toBeVisible();

    // 18. Verify list items are present
    await expect(inListSection.getByText("Item 1")).toBeVisible();
    await expect(inListSection.getByText("Value 1")).toBeVisible();
    await expect(inListSection.getByText("Item 2")).toBeVisible();
    await expect(inListSection.getByText("Value 2")).toBeVisible();
    await expect(inListSection.getByText("Item 3")).toBeVisible();
    await expect(inListSection.getByText("Value 3")).toBeVisible();

    // 19. Verify horizontal separators are present in the list
    const listSeparators = inListSection.locator(
      "[data-slot='separator'][data-orientation='horizontal']",
    );
    await expect(listSeparators.first()).toBeVisible();

    // 20. Wait for visual inspection
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 21. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 22. Wait for docs page to load
    await page.waitForTimeout(500);

    // 23. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Separator", level: 1 })).toBeVisible();

    // 24. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 25. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 26. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 27. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 28. Wait for scroll to complete
    await page.waitForTimeout(500);

    // 29. Verify the In List example section is visible in docs
    await expect(page.getByRole("heading", { name: "In List", level: 3 })).toBeVisible();
  });
});
