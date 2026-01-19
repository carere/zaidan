import { expect, test } from "@playwright/test";

test.describe("Pagination Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5176/ui/pagination");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the pagination navigation is visible
    const basicPagination = basicSection.getByRole("navigation", { name: "pagination" });
    await expect(basicPagination).toBeVisible();

    // 3. Verify Previous link is visible
    await expect(basicPagination.getByRole("link", { name: "Go to previous page" })).toBeVisible();

    // 4. Verify page numbers are visible
    await expect(basicPagination.getByRole("link", { name: "1" })).toBeVisible();
    await expect(basicPagination.getByRole("link", { name: "2" })).toBeVisible();
    await expect(basicPagination.getByRole("link", { name: "3" })).toBeVisible();

    // 5. Verify ellipsis is visible (More pages)
    await expect(basicPagination.getByText("More pages")).toBeVisible();

    // 6. Verify Next link is visible
    await expect(basicPagination.getByRole("link", { name: "Go to next page" })).toBeVisible();

    // 7. Hover over Previous link
    await basicPagination.getByRole("link", { name: "Go to previous page" }).hover();
    await page.waitForTimeout(300);

    // 8. Hover over page 2 link (active)
    await basicPagination.getByRole("link", { name: "2" }).hover();
    await page.waitForTimeout(300);

    // 9. Hover over Next link
    await basicPagination.getByRole("link", { name: "Go to next page" }).hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Simple Example
    // ------------------------------------------------------------

    // 10. Get the simple section
    const simpleSection = page.getByText("Simple", { exact: true }).locator("..");

    // 11. Verify the pagination navigation is visible
    const simplePagination = simpleSection.getByRole("navigation", { name: "pagination" });
    await expect(simplePagination).toBeVisible();

    // 12. Verify all 5 page numbers are visible
    await expect(simplePagination.getByRole("link", { name: "1" })).toBeVisible();
    await expect(simplePagination.getByRole("link", { name: "2" })).toBeVisible();
    await expect(simplePagination.getByRole("link", { name: "3" })).toBeVisible();
    await expect(simplePagination.getByRole("link", { name: "4" })).toBeVisible();
    await expect(simplePagination.getByRole("link", { name: "5" })).toBeVisible();

    // 13. Hover over page 1 link
    await simplePagination.getByRole("link", { name: "1" }).hover();
    await page.waitForTimeout(300);

    // 14. Hover over page 3 link
    await simplePagination.getByRole("link", { name: "3" }).hover();
    await page.waitForTimeout(300);

    // 15. Hover over page 5 link
    await simplePagination.getByRole("link", { name: "5" }).hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Select Example
    // ------------------------------------------------------------

    // 16. Verify the "With Select" section title is visible
    await expect(page.getByText("With Select", { exact: true })).toBeVisible();

    // 17. Verify the "Rows per page" label is visible
    await expect(page.getByText("Rows per page")).toBeVisible();

    // 18. Verify the select dropdown is visible with default value "25"
    // Note: The button's accessible name is "25" (the selected value)
    const selectTrigger = page.getByRole("button", { name: "25" });
    await expect(selectTrigger).toBeVisible();

    // 19. Verify the third pagination navigation is visible (there are 3 paginations)
    const allPaginations = page.getByRole("navigation", { name: "pagination" });
    await expect(allPaginations.nth(2)).toBeVisible();

    // 20. Verify Previous link is visible in the third pagination
    await expect(
      allPaginations.nth(2).getByRole("link", { name: "Go to previous page" }),
    ).toBeVisible();

    // 21. Verify Next link is visible
    await expect(
      allPaginations.nth(2).getByRole("link", { name: "Go to next page" }),
    ).toBeVisible();

    // 22. Click on the select dropdown to open it
    await selectTrigger.click();

    // 23. Wait for dropdown to open
    await page.waitForTimeout(300);

    // 24. Verify dropdown options are visible
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole("option", { name: "10", exact: true })).toBeVisible();
    await expect(listbox.getByRole("option", { name: "25", exact: true })).toBeVisible();
    await expect(listbox.getByRole("option", { name: "50", exact: true })).toBeVisible();
    await expect(listbox.getByRole("option", { name: "100", exact: true })).toBeVisible();

    // 25. Select option "50"
    await listbox.getByRole("option", { name: "50", exact: true }).click();

    // 26. Wait for selection
    await page.waitForTimeout(300);

    // 27. Verify the select now shows "50" - need to get fresh reference
    const updatedSelectTrigger = page.getByRole("button", { name: "50" });
    await expect(updatedSelectTrigger).toBeVisible();

    // 28. Hover over Previous link in third pagination
    await allPaginations.nth(2).getByRole("link", { name: "Go to previous page" }).hover();
    await page.waitForTimeout(300);

    // 29. Hover over Next link
    await allPaginations.nth(2).getByRole("link", { name: "Go to next page" }).hover();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 30. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 31. Wait for docs to load
    await page.waitForTimeout(1000);

    // 32. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Pagination", level: 1 })).toBeVisible();

    // 33. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 34. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 35. Verify the SolidJS Router section is present
    await expect(page.getByRole("heading", { name: "SolidJS Router", level: 2 })).toBeVisible();

    // 36. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 37. Scroll to the bottom of the page to verify all content loads
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 38. Verify the Basic example heading in docs
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();

    // 39. Verify the Simple example heading in docs
    await expect(page.getByRole("heading", { name: "Simple", level: 3 })).toBeVisible();

    // 40. Verify the With Select example heading in docs
    await expect(page.getByRole("heading", { name: "With Select", level: 3 })).toBeVisible();
  });
});
