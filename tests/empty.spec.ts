import { expect, test } from "@playwright/test";

test.describe("Empty Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5174/ui/empty");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the basic example is visible
    await expect(basicSection).toBeVisible();

    // 3. Verify the title "No projects yet" is visible
    await expect(basicSection.getByText("No projects yet")).toBeVisible();

    // 4. Verify the description is visible
    await expect(basicSection.getByText("You haven't created any projects yet.")).toBeVisible();

    // 5. Hover over the 'Create project' link
    await basicSection.getByRole("link", { name: "Create project", exact: true }).hover();

    // 6. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 7. Verify the 'Import project' button is visible
    await expect(
      basicSection.getByRole("button", { name: "Import project", exact: true }),
    ).toBeVisible();

    // 8. Hover over the 'Learn more' link
    await basicSection.getByRole("link", { name: "Learn more" }).hover();

    // 9. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Muted Background Example
    // ------------------------------------------------------------

    // 10. Get the with muted background section
    const mutedSection = page.getByText("With Muted Background", { exact: true }).locator("..");

    // 11. Verify the section is visible
    await expect(mutedSection).toBeVisible();

    // 12. Verify the title "No results found" is visible
    await expect(mutedSection.getByText("No results found", { exact: true })).toBeVisible();

    // 13. Hover over the 'Try again' button
    await mutedSection.getByRole("button", { name: "Try again", exact: true }).hover();

    // 14. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Border Example
    // ------------------------------------------------------------

    // 15. Get the with border section
    const borderSection = page.getByText("With Border", { exact: true }).locator("..");

    // 16. Verify the section is visible
    await expect(borderSection).toBeVisible();

    // 17. Verify the title "404 - Not Found" is visible
    await expect(borderSection.getByText("404 - Not Found", { exact: true })).toBeVisible();

    // 18. Verify the search input is visible
    await expect(
      borderSection.getByPlaceholder("Try searching for pages...").first(),
    ).toBeVisible();

    // 19. Click on the search input
    await borderSection.getByPlaceholder("Try searching for pages...").first().click();

    // 20. Type in the search input
    await borderSection.getByPlaceholder("Try searching for pages...").first().fill("test search");

    // 21. Wait for 300ms
    await page.waitForTimeout(300);

    // 22. Clear the input
    await borderSection.getByPlaceholder("Try searching for pages...").first().clear();

    // 23. Hover over the 'Contact support' link
    await borderSection.getByRole("link", { name: "Contact support" }).hover();

    // 24. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Icon Example
    // ------------------------------------------------------------

    // 25. Get the with icon section
    const iconSection = page.getByText("With Icon", { exact: true }).locator("..");

    // 26. Verify the section is visible
    await expect(iconSection).toBeVisible();

    // 27. Verify the title "Nothing to see here" is visible
    await expect(iconSection.getByText("Nothing to see here")).toBeVisible();

    // 28. Hover over the 'New Post' button
    await iconSection.getByRole("button", { name: "New Post", exact: true }).hover();

    // 29. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 30. Verify the 'creating your first post' link is visible
    await expect(iconSection.getByRole("link", { name: "creating your first post" })).toBeVisible();

    // ------------------------------------------------------------
    // With Muted Background Alt Example
    // ------------------------------------------------------------

    // 31. Get the with muted background alt section
    const mutedAltSection = page
      .getByText("With Muted Background Alt", { exact: true })
      .locator("..");

    // 32. Verify the section is visible
    await expect(mutedAltSection).toBeVisible();

    // 33. Verify the title "404 - Not Found" is visible
    await expect(mutedAltSection.getByText("404 - Not Found", { exact: true })).toBeVisible();

    // 34. Verify the search input is visible
    await expect(
      mutedAltSection.getByPlaceholder("Try searching for pages...").first(),
    ).toBeVisible();

    // ------------------------------------------------------------
    // In Card Example
    // ------------------------------------------------------------

    // 35. Get the in card section
    const cardSection = page.getByText("In Card", { exact: true }).locator("..");

    // 36. Verify the section is visible
    await expect(cardSection).toBeVisible();

    // 37. Verify the title "No projects yet" is visible
    await expect(cardSection.getByText("No projects yet")).toBeVisible();

    // 38. Hover over the 'Create project' link
    await cardSection.getByRole("link", { name: "Create project", exact: true }).hover();

    // 39. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 40. Hover over the 'Import project' button
    await cardSection.getByRole("button", { name: "Import project", exact: true }).hover();

    // 41. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 42. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 43. Wait for docs to load
    await page.waitForTimeout(500);

    // 44. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Empty", level: 1 })).toBeVisible();

    // 45. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 46. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 47. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 48. Scroll to the bottom to verify all examples are present
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 49. Wait for scroll animation
    await page.waitForTimeout(300);

    // 50. Verify the "In Card" example heading is visible in docs
    await expect(page.getByRole("heading", { name: "In Card", level: 3 })).toBeVisible();
  });
});
