import { expect, test } from "@playwright/test";

test.describe("Drawer Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/drawer");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Scrollable Content Example
    // ------------------------------------------------------------

    // 1. Click the 'Scrollable Content' button
    await page.getByRole("button", { name: "Scrollable Content", exact: true }).click();

    // 2. Wait for drawer to open
    await page.waitForTimeout(500);

    // 3. Verify the drawer is visible
    const scrollableDrawer = page.getByRole("dialog");
    await expect(scrollableDrawer).toBeVisible();

    // 4. Verify the drawer title
    await expect(scrollableDrawer.getByRole("heading", { name: "Move Goal" })).toBeVisible();

    // 5. Verify the drawer description
    await expect(scrollableDrawer.getByText("Set your daily activity goal.")).toBeVisible();

    // 6. Verify Submit button is visible
    await expect(scrollableDrawer.getByRole("button", { name: "Submit" })).toBeVisible();

    // 7. Click the 'Cancel' button to close
    await scrollableDrawer.getByRole("button", { name: "close" }).click();

    // 8. Wait for drawer to close completely
    await page.waitForTimeout(500);

    // 9. Verify the drawer is hidden
    await expect(scrollableDrawer).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Bottom Drawer
    // ------------------------------------------------------------

    // 10. Click the 'bottom' button
    await page.getByRole("button", { name: "bottom", exact: true }).click();

    // 11. Wait for drawer to open
    await page.waitForTimeout(500);

    // 12. Verify the bottom drawer is visible
    const bottomDrawer = page.getByRole("dialog");
    await expect(bottomDrawer).toBeVisible();

    // 13. Verify the drawer title
    await expect(bottomDrawer.getByRole("heading", { name: "Move Goal" })).toBeVisible();

    // 14. Click the 'Cancel' button to close
    await bottomDrawer.getByRole("button", { name: "close" }).click();

    // 15. Wait for drawer to close completely
    await page.waitForTimeout(500);

    // 16. Verify the drawer is hidden
    await expect(bottomDrawer).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Top Drawer
    // ------------------------------------------------------------

    // 17. Click the 'top' button
    await page.getByRole("button", { name: "top", exact: true }).click();

    // 18. Wait for drawer to open
    await page.waitForTimeout(500);

    // 19. Verify the top drawer is visible
    const topDrawer = page.getByRole("dialog");
    await expect(topDrawer).toBeVisible();

    // 20. Verify the drawer title
    await expect(topDrawer.getByRole("heading", { name: "Move Goal" })).toBeVisible();

    // 21. Click the 'Cancel' button to close
    await topDrawer.getByRole("button", { name: "close" }).click();

    // 22. Wait for drawer to close completely
    await page.waitForTimeout(500);

    // 23. Verify the drawer is hidden
    await expect(topDrawer).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Right Drawer
    // ------------------------------------------------------------

    // 24. Click the 'right' button
    await page.getByRole("button", { name: "right", exact: true }).click();

    // 25. Wait for drawer to open
    await page.waitForTimeout(500);

    // 26. Verify the right drawer is visible
    const rightDrawer = page.getByRole("dialog");
    await expect(rightDrawer).toBeVisible();

    // 27. Verify the drawer title
    await expect(rightDrawer.getByRole("heading", { name: "Move Goal" })).toBeVisible();

    // 28. Click the 'Cancel' button to close
    await rightDrawer.getByRole("button", { name: "close" }).click();

    // 29. Wait for drawer to close completely
    await page.waitForTimeout(500);

    // 30. Verify the drawer is hidden
    await expect(rightDrawer).toBeHidden();

    // ------------------------------------------------------------
    // Sides Example - Left Drawer
    // ------------------------------------------------------------

    // 31. Click the 'left' button
    await page.getByRole("button", { name: "left", exact: true }).click();

    // 32. Wait for drawer to open
    await page.waitForTimeout(500);

    // 33. Verify the left drawer is visible
    const leftDrawer = page.getByRole("dialog");
    await expect(leftDrawer).toBeVisible();

    // 34. Verify the drawer title
    await expect(leftDrawer.getByRole("heading", { name: "Move Goal" })).toBeVisible();

    // 35. Click the 'Cancel' button to close
    await leftDrawer.getByRole("button", { name: "close" }).click();

    // 36. Wait for drawer to close completely
    await page.waitForTimeout(500);

    // 37. Verify the drawer is hidden
    await expect(leftDrawer).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test
    // ------------------------------------------------------------

    // 38. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 39. Wait for docs view to load
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");

    // 40. Verify the main Drawer heading is visible
    await expect(page.locator("h1").filter({ hasText: "Drawer" })).toBeVisible({ timeout: 10000 });

    // 41. Verify the docs content is visible by checking for the main doc container
    await expect(page.locator("#ui-doc")).toBeVisible();

    // 42. Verify there's a table (props table) in the docs
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });
});
