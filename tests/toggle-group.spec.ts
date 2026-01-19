import { expect, test } from "@playwright/test";

test.describe("Toggle Group Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5175/ui/toggle-group");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example - Multiple selection toggle group
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Click the 'Toggle bold' button
    await basicSection.getByRole("button", { name: "Toggle bold" }).click();

    // 3. Verify the bold button is pressed
    await expect(basicSection.getByRole("button", { name: "Toggle bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 4. Click the 'Toggle italic' button
    await basicSection.getByRole("button", { name: "Toggle italic" }).click();

    // 5. Verify both bold and italic are pressed (multiple selection)
    await expect(basicSection.getByRole("button", { name: "Toggle bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(basicSection.getByRole("button", { name: "Toggle italic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 6. Click bold again to deselect
    await basicSection.getByRole("button", { name: "Toggle bold" }).click();

    // 7. Verify bold is no longer pressed
    await expect(basicSection.getByRole("button", { name: "Toggle bold" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // ------------------------------------------------------------
    // Outline Example - Single selection toggle group
    // ------------------------------------------------------------

    // 8. Get the outline section
    const outlineSection = page.getByText("Outline", { exact: true }).first().locator("..");

    // 9. Verify 'All' is initially selected
    await expect(outlineSection.getByRole("button", { name: "Toggle all" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 10. Click 'Toggle missed' button
    await outlineSection.getByRole("button", { name: "Toggle missed" }).click();

    // 11. Verify 'Missed' is now selected and 'All' is deselected (single selection)
    await expect(outlineSection.getByRole("button", { name: "Toggle missed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(outlineSection.getByRole("button", { name: "Toggle all" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // ------------------------------------------------------------
    // With Icons Example - Multiple selection with icon fill
    // ------------------------------------------------------------

    // 12. Get the with icons section
    const withIconsSection = page.getByText("With Icons", { exact: true }).first().locator("..");

    // 13. Click the 'Toggle star' button
    await withIconsSection.getByRole("button", { name: "Toggle star" }).click();

    // 14. Verify star is pressed
    await expect(withIconsSection.getByRole("button", { name: "Toggle star" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 15. Click the 'Toggle heart' button
    await withIconsSection.getByRole("button", { name: "Toggle heart" }).click();

    // 16. Verify both star and heart are pressed
    await expect(withIconsSection.getByRole("button", { name: "Toggle star" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(withIconsSection.getByRole("button", { name: "Toggle heart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // ------------------------------------------------------------
    // Filter Example - Single selection
    // ------------------------------------------------------------

    // 17. Get the filter section
    const filterSection = page.getByText("Filter", { exact: true }).locator("..");

    // 18. Click 'Active' button
    await filterSection.getByRole("button", { name: "Active" }).click();

    // 19. Verify 'Active' is selected
    await expect(filterSection.getByRole("button", { name: "Active" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 20. Click 'Completed' button
    await filterSection.getByRole("button", { name: "Completed" }).click();

    // 21. Verify 'Completed' is selected and 'Active' is deselected
    await expect(filterSection.getByRole("button", { name: "Completed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(filterSection.getByRole("button", { name: "Active" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // ------------------------------------------------------------
    // Sort Example - Single selection with icons
    // ------------------------------------------------------------

    // 22. Get the sort section
    const sortSection = page.getByText("Sort", { exact: true }).locator("..");

    // 23. Verify 'Newest' is initially selected
    await expect(sortSection.getByRole("button", { name: "Newest" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 24. Click 'Oldest' button
    await sortSection.getByRole("button", { name: "Oldest" }).click();

    // 25. Verify 'Oldest' is selected
    await expect(sortSection.getByRole("button", { name: "Oldest" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // ------------------------------------------------------------
    // With Input and Select Example
    // ------------------------------------------------------------

    // 26. Get the with input and select section
    const withInputSection = page.getByText("With Input and Select", { exact: true }).locator("..");

    // 27. Verify search input is visible
    await expect(withInputSection.getByRole("searchbox", { name: "Search..." })).toBeVisible();

    // 28. Verify Grid view is selected by default
    await expect(withInputSection.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 29. Click List view button
    await withInputSection.getByRole("button", { name: "List view" }).click();

    // 30. Verify List view is now selected
    await expect(withInputSection.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // ------------------------------------------------------------
    // Vertical Example - Multiple selection vertical
    // ------------------------------------------------------------

    // 31. Get the vertical section
    const verticalSection = page.getByText("Vertical", { exact: true }).first().locator("..");

    // 32. Click 'Toggle underline' in vertical section
    await verticalSection.getByRole("button", { name: "Toggle underline" }).click();

    // 33. Verify underline is pressed
    await expect(verticalSection.getByRole("button", { name: "Toggle underline" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // ------------------------------------------------------------
    // Vertical Outline Example - Single selection vertical
    // ------------------------------------------------------------

    // 34. Get the vertical outline section
    const verticalOutlineSection = page
      .getByText("Vertical Outline", { exact: true })
      .first()
      .locator("..");

    // 35. Verify 'All' is initially selected
    await expect(
      verticalOutlineSection.getByRole("button", { name: "Toggle all" }),
    ).toHaveAttribute("aria-pressed", "true");

    // 36. Click 'Toggle active' button
    await verticalOutlineSection.getByRole("button", { name: "Toggle active" }).click();

    // 37. Verify 'Active' is selected
    await expect(
      verticalOutlineSection.getByRole("button", { name: "Toggle active" }),
    ).toHaveAttribute("aria-pressed", "true");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 38. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 39. Wait for docs to load
    await page.waitForTimeout(1000);

    // 40. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Toggle Group", level: 1 })).toBeVisible();

    // 41. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 42. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 43. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 44. Scroll to the bottom to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 45. Wait for scroll
    await page.waitForTimeout(500);

    // 46. Verify the API Reference section is visible
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();
  });
});
