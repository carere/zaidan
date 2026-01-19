import { expect, test } from "@playwright/test";

test.describe("Toggle Group Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5181/ui/toggle-group");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Click the bold toggle
    const boldToggle = basicSection.getByRole("button", { name: "Toggle bold" });
    await boldToggle.hover();
    await page.waitForTimeout(300);
    await boldToggle.click();

    // 3. Verify bold toggle is now pressed
    await expect(boldToggle).toHaveAttribute("aria-pressed", "true");

    // 4. Click the italic toggle (multiple selection is enabled)
    const italicToggle = basicSection.getByRole("button", { name: "Toggle italic" });
    await italicToggle.hover();
    await page.waitForTimeout(300);
    await italicToggle.click();

    // 5. Verify both are pressed (multiple mode)
    await expect(boldToggle).toHaveAttribute("aria-pressed", "true");
    await expect(italicToggle).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Outline Example
    // ------------------------------------------------------------

    // 6. Get the outline section
    const outlineSection = page.getByText("Outline", { exact: true }).locator("..");

    // 7. Verify 'All' is selected by default
    const allButton = outlineSection.getByRole("button", { name: "Toggle all" });
    await expect(allButton).toHaveAttribute("aria-pressed", "true");

    // 8. Click on 'Missed' (single selection mode)
    const missedButton = outlineSection.getByRole("button", { name: "Toggle missed" });
    await missedButton.hover();
    await page.waitForTimeout(300);
    await missedButton.click();

    // 9. Verify 'Missed' is now selected and 'All' is not
    await expect(missedButton).toHaveAttribute("aria-pressed", "true");
    await expect(allButton).toHaveAttribute("aria-pressed", "false");

    // ------------------------------------------------------------
    // Sizes Example
    // ------------------------------------------------------------

    // 10. Get the sizes section
    const sizesSection = page.getByText("Sizes", { exact: true }).locator("..");

    // 11. Verify 'Top' is selected in both size groups
    const topButtons = sizesSection.getByRole("button", { name: "Toggle top" });
    await expect(topButtons.first()).toHaveAttribute("aria-pressed", "true");
    await expect(topButtons.last()).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Filter Example
    // ------------------------------------------------------------

    // 12. Get the filter section
    const filterSection = page.getByText("Filter", { exact: true }).locator("..");

    // 13. Verify 'All' is selected by default
    const filterAll = filterSection.getByRole("button", { name: "All" });
    await expect(filterAll).toHaveAttribute("aria-pressed", "true");

    // 14. Click on 'Active'
    const filterActive = filterSection.getByRole("button", { name: "Active" });
    await filterActive.hover();
    await page.waitForTimeout(300);
    await filterActive.click();

    // 15. Verify 'Active' is now selected
    await expect(filterActive).toHaveAttribute("aria-pressed", "true");
    await expect(filterAll).toHaveAttribute("aria-pressed", "false");

    // ------------------------------------------------------------
    // Sort Example
    // ------------------------------------------------------------

    // 16. Get the sort section
    const sortSection = page.getByText("Sort", { exact: true }).locator("..");

    // 17. Verify 'Newest' is selected by default
    const newestButton = sortSection.getByRole("button", { name: "Newest" });
    await expect(newestButton).toHaveAttribute("aria-pressed", "true");

    // 18. Click on 'Popular'
    const popularButton = sortSection.getByRole("button", { name: "Popular" });
    await popularButton.hover();
    await page.waitForTimeout(300);
    await popularButton.click();

    // 19. Verify 'Popular' is now selected
    await expect(popularButton).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // With Input and Select Example
    // ------------------------------------------------------------

    // 20. Get the with input and select section
    const withInputSection = page.getByText("With Input and Select", { exact: true }).locator("..");

    // 21. Verify 'Grid' is selected by default
    const gridButton = withInputSection.getByRole("button", { name: "Grid view" });
    await expect(gridButton).toHaveAttribute("aria-pressed", "true");

    // 22. Click on 'List'
    const listButton = withInputSection.getByRole("button", { name: "List view" });
    await listButton.hover();
    await page.waitForTimeout(300);
    await listButton.click();

    // 23. Verify 'List' is now selected
    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await expect(gridButton).toHaveAttribute("aria-pressed", "false");

    // 24. Verify the search input is present
    await expect(withInputSection.getByRole("searchbox", { name: "Search..." })).toBeVisible();

    // ------------------------------------------------------------
    // Vertical Example
    // ------------------------------------------------------------

    // 25. Get the vertical section
    const verticalSection = page.getByText("Vertical", { exact: true }).first().locator("..");

    // 26. Click the bold toggle in vertical layout
    const verticalBold = verticalSection.getByRole("button", { name: "Toggle bold" });
    await verticalBold.hover();
    await page.waitForTimeout(300);
    await verticalBold.click();

    // 27. Verify it's pressed
    await expect(verticalBold).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Vertical Outline Example
    // ------------------------------------------------------------

    // 28. Get the vertical outline section
    const verticalOutlineSection = page
      .getByText("Vertical Outline", { exact: true })
      .locator("..");

    // 29. Verify 'All' is selected by default
    const verticalAllButton = verticalOutlineSection.getByRole("button", { name: "Toggle all" });
    await expect(verticalAllButton).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 30. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 31. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Toggle Group", level: 1 })).toBeVisible();

    // 32. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 33. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 34. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 35. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 36. Verify the API Reference section is present
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();
  });
});
