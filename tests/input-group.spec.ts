import { expect, test } from "@playwright/test";

test.describe("Input Group Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/input-group");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Verify the Basic section is visible
    await expect(page.getByText("Basic", { exact: true })).toBeVisible();

    // 2. Verify the default input is visible
    await expect(page.locator("#input-default-01")).toBeVisible();

    // 3. Verify the input group input is visible
    await expect(page.locator("#input-group-02")).toBeVisible();

    // 4. Verify the disabled input is visible and disabled
    const disabledInput = page.locator("#input-disabled-03");
    await expect(disabledInput).toBeVisible();
    await expect(disabledInput).toBeDisabled();

    // 5. Verify the invalid input is visible
    await expect(page.locator("#input-invalid-04")).toBeVisible();

    // 6. Type in the input group input
    await page.locator("#input-group-02").fill("Test input");

    // 7. Wait for interaction
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Addons Example
    // ------------------------------------------------------------

    // 8. Verify the With Addons section is visible
    await expect(page.getByText("With Addons", { exact: true })).toBeVisible();

    // 9. Verify addon inputs are visible using IDs
    await expect(page.locator("#input-icon-left-05")).toBeVisible();
    await expect(page.locator("#input-icon-right-07")).toBeVisible();
    await expect(page.locator("#input-icon-both-09")).toBeVisible();

    // 10. Verify the "Description" field description is visible
    await expect(page.getByText("This is a description of the input group.").first()).toBeVisible();

    // 11. Interact with the Multiple Icons input
    await page.locator("#input-icon-both-10").click();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Buttons Example
    // ------------------------------------------------------------

    // 12. Verify the With Buttons section is visible
    await expect(page.getByText("With Buttons", { exact: true })).toBeVisible();

    // 13. Verify buttons are visible
    await expect(page.getByRole("button", { name: "Default", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Outline", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Secondary", exact: true }).first(),
    ).toBeVisible();

    // 14. Click the "Default" button
    await page.getByRole("button", { name: "Default", exact: true }).hover();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Default", exact: true }).click();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Tooltip, Dropdown, Popover Example
    // ------------------------------------------------------------

    // 15. Verify the With Tooltip section is visible
    await expect(page.getByText("With Tooltip, Dropdown, Popover", { exact: true })).toBeVisible();

    // 16. Verify the Tooltip input is visible
    await expect(page.locator("#input-tooltip-20")).toBeVisible();

    // 17. Verify the Dropdown input is visible
    await expect(page.locator("#input-dropdown-21")).toBeVisible();

    // 18. Verify the dropdown trigger shows "+1"
    const dropdownTrigger = page.getByRole("button", { name: /^\+1/ });
    await expect(dropdownTrigger).toBeVisible();

    // 19. Click the dropdown trigger to open the dropdown
    await dropdownTrigger.click();

    // 20. Wait for the dropdown menu to appear and verify menuitem +44 is visible
    const menuItem44 = page.getByRole("menuitem", { name: "+44" });
    await expect(menuItem44).toBeVisible({ timeout: 10000 });

    // 21. Click on +44 to change the country
    await menuItem44.click();
    await page.waitForTimeout(300);

    // 22. Verify the dropdown now shows "+44"
    await expect(page.getByRole("button", { name: /^\+44/ })).toBeVisible();

    // 23. Verify the Popover input is visible
    await expect(page.locator("#input-secure-19")).toBeVisible();

    // 24. Verify the Button Group input is visible
    await expect(page.locator("#url")).toBeVisible();
    await expect(page.getByText("https://").first()).toBeVisible();
    await expect(page.getByText(".com")).toBeVisible();

    // ------------------------------------------------------------
    // With Kbd Example
    // ------------------------------------------------------------

    // 25. Verify the With Kbd section is visible
    await expect(page.getByText("With Kbd", { exact: true })).toBeVisible();

    // 26. Verify the "Input Group with Kbd" input is visible
    await expect(page.locator("#input-kbd-22")).toBeVisible();

    // 27. Verify the ⌘K shortcut is visible
    await expect(page.getByText("⌘K").first()).toBeVisible();

    // 28. Verify the Username field shows "shadcn"
    const usernameInput = page.locator("#input-username-26");
    await expect(usernameInput).toHaveValue("shadcn");

    // 29. Verify the username availability message
    await expect(page.getByText("This username is available.")).toBeVisible();

    // 30. Verify the search documentation input with "12 results"
    await expect(page.getByText("12 results")).toBeVisible();

    // 31. Verify the disabled search input shows "Disabled"
    await expect(page.locator("#input-search-disabled-28")).toBeDisabled();

    // 32. Verify the Spinner/Loading state
    const loadingInput = page.locator("#input-group-29");
    await expect(loadingInput).toBeDisabled();
    await expect(loadingInput).toHaveValue("shadcn");

    // ------------------------------------------------------------
    // In Card Example
    // ------------------------------------------------------------

    // 33. Get the In Card section
    const inCardSection = page.getByText("In Card", { exact: true }).locator("..");

    // 34. Verify the card title
    await expect(inCardSection.getByText("Card with Input Group")).toBeVisible();

    // 35. Verify the Email Address input
    await expect(inCardSection.getByRole("textbox", { name: "Email Address" })).toBeVisible();

    // 36. Verify the Website URL input
    await expect(inCardSection.getByRole("textbox", { name: "Website URL" })).toBeVisible();

    // 37. Verify the Feedback & Comments textarea
    await expect(inCardSection.getByRole("textbox", { name: "Feedback & Comments" })).toBeVisible();

    // 38. Verify the Cancel and Submit buttons
    await expect(inCardSection.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(inCardSection.getByRole("button", { name: "Submit" })).toBeVisible();

    // 39. Fill in the form
    await inCardSection.getByRole("textbox", { name: "Email Address" }).fill("test@example.com");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Textarea Example
    // ------------------------------------------------------------

    // 40. Verify the Textarea section header is visible (using the example wrapper)
    await expect(
      page.getByTestId("example-wrapper").getByText("Textarea", { exact: true }),
    ).toBeVisible();

    // 41. Verify the "Default Textarea (No Input Group)" is visible using ID
    await expect(page.locator("#textarea-header-footer-12")).toBeVisible();

    // 42. Verify the "Input Group" textarea is visible using ID
    await expect(page.locator("#textarea-header-footer-13")).toBeVisible();

    // 43. Verify the "Invalid" textarea is visible using ID
    await expect(page.locator("#textarea-header-footer-14")).toBeVisible();

    // 44. Verify the "Disabled" textarea is visible and disabled using ID
    const disabledTextarea = page.locator("#textarea-header-footer-15");
    await expect(disabledTextarea).toBeVisible();
    await expect(disabledTextarea).toBeDisabled();

    // 45. Verify the "Addon (block-start)" label is visible
    await expect(page.getByText("Ask, Search or Chat...")).toBeVisible();

    // 46. Verify the "Addon (block-end)" with character count
    await expect(page.getByText("0/280 characters")).toBeVisible();

    // 47. Verify the "Post Comment" button
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeVisible();

    // 48. Verify the Code Editor section
    await expect(page.getByText("script.js")).toBeVisible();
    await expect(page.getByText("Line 1, Column 1")).toBeVisible();
    await expect(page.getByText("JavaScript")).toBeVisible();

    // 49. Fill in a textarea using ID (Addon block-end textarea)
    await page.locator("#textarea-comment-31").fill("Hello world");
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 50. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 51. Wait for the docs page to load
    await page.waitForTimeout(500);

    // 52. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Input Group", level: 1 })).toBeVisible();

    // 53. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 54. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 55. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 56. Scroll down to see all examples
    await page.evaluate(() => {
      document.getElementById("ui-doc")?.scrollTo({ top: 5000, behavior: "smooth" });
    });

    // 57. Wait for scroll animation
    await page.waitForTimeout(1000);

    // 58. Verify the API Reference section is visible after scrolling
    await expect(page.getByRole("heading", { name: "API Reference", level: 2 })).toBeVisible();
  });
});
