import { expect, test } from "@playwright/test";

test.describe("Spinner Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5178/ui/spinner");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the basic section is visible
    await expect(basicSection).toBeVisible();

    // 3. Verify spinners are present (check for status role with "Loading" label)
    const basicSpinners = basicSection.getByRole("status", { name: "Loading" });
    await expect(basicSpinners).toHaveCount(2);

    // ------------------------------------------------------------
    // In Buttons Example
    // ------------------------------------------------------------

    // 4. Get the buttons section
    const buttonsSection = page.getByText("In Buttons", { exact: true }).locator("..");

    // 5. Verify the buttons section is visible
    await expect(buttonsSection).toBeVisible();

    // 6. Verify the Submit button with spinner is present
    const submitButton = buttonsSection.getByRole("button", { name: /Submit/ });
    await expect(submitButton).toBeVisible();

    // 7. Hover over the Submit button
    await submitButton.hover();

    // 8. Wait for 300ms to simulate user interaction
    await page.waitForTimeout(300);

    // 9. Verify the Disabled button is present and disabled
    const disabledButton = buttonsSection.getByRole("button", { name: /Disabled/ });
    await expect(disabledButton).toBeVisible();
    await expect(disabledButton).toBeDisabled();

    // 10. Verify the Outline button is present
    const outlineButton = buttonsSection.getByRole("button", { name: /Outline/ });
    await expect(outlineButton).toBeVisible();
    await expect(outlineButton).toBeDisabled();

    // ------------------------------------------------------------
    // In Badges Example
    // ------------------------------------------------------------

    // 11. Get the badges section
    const badgesSection = page.getByText("In Badges", { exact: true }).locator("..");

    // 12. Verify the badges section is visible
    await expect(badgesSection).toBeVisible();

    // 13. Verify badges with spinners are present (4 badges total)
    const badges = badgesSection.getByRole("status").filter({ hasText: "Badge" });
    await expect(badges).toHaveCount(4);

    // ------------------------------------------------------------
    // In Input Group Example
    // ------------------------------------------------------------

    // 14. Get the input group section
    const inputGroupSection = page.getByText("In Input Group", { exact: true }).locator("..");

    // 15. Verify the input group section is visible
    await expect(inputGroupSection).toBeVisible();

    // 16. Verify the input field is present
    const inputField = inputGroupSection.getByRole("textbox", { name: "Input Group" });
    await expect(inputField).toBeVisible();

    // 17. Click on the input field
    await inputField.click();

    // 18. Type in the input field
    await inputField.fill("Testing spinner in input group");

    // 19. Wait for 300ms
    await page.waitForTimeout(300);

    // 20. Verify the input has the text
    await expect(inputField).toHaveValue("Testing spinner in input group");

    // 21. Clear the input field
    await inputField.clear();

    // ------------------------------------------------------------
    // In Empty State Example
    // ------------------------------------------------------------

    // 22. Get the empty state section
    const emptyStateSection = page.getByText("In Empty State", { exact: true }).locator("..");

    // 23. Verify the empty state section is visible
    await expect(emptyStateSection).toBeVisible();

    // 24. Verify the empty state title is visible
    await expect(emptyStateSection.getByText("No projects yet")).toBeVisible();

    // 25. Verify the empty state description is visible
    await expect(emptyStateSection.getByText(/You haven't created any projects yet/)).toBeVisible();

    // 26. Verify the "Create project" link is visible
    const createProjectLink = emptyStateSection.getByRole("link", { name: "Create project" });
    await expect(createProjectLink).toBeVisible();

    // 27. Hover over the Create project link
    await createProjectLink.hover();

    // 28. Wait for 300ms
    await page.waitForTimeout(300);

    // 29. Verify the "Import project" button is visible
    const importProjectButton = emptyStateSection.getByRole("button", { name: "Import project" });
    await expect(importProjectButton).toBeVisible();

    // 30. Hover over the Import project button
    await importProjectButton.hover();

    // 31. Wait for 300ms
    await page.waitForTimeout(300);

    // 32. Verify the "Learn more" link is visible
    const learnMoreLink = emptyStateSection.getByRole("link", { name: "Learn more" });
    await expect(learnMoreLink).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 33. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 34. Wait for the docs to load
    await page.waitForTimeout(500);

    // 35. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Spinner", level: 1 })).toBeVisible();

    // 36. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 37. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 38. Verify the Customization section is present
    await expect(page.getByRole("heading", { name: "Customization", level: 2 })).toBeVisible();

    // 39. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 40. Verify all example subsections in docs
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Buttons", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Badges", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Input Group", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Empty State", level: 3 })).toBeVisible();

    // 41. Verify the API Reference section is present
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();

    // 42. Scroll to the bottom of the docs page to verify all content loaded
    await page.evaluate(() => {
      const docContainer = document.querySelector('[id="ui-doc"]');
      if (docContainer) {
        docContainer.scrollTo(0, docContainer.scrollHeight);
      }
    });

    // 43. Wait for scroll to complete
    await page.waitForTimeout(300);

    // 44. Verify the API table is visible at the bottom
    await expect(page.getByRole("table")).toBeVisible();
  });
});
