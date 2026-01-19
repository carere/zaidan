import { expect, test } from "@playwright/test";

test.describe("Table Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5180/ui/table");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the table caption is visible
    await expect(basicSection.getByText("A list of your recent invoices.")).toBeVisible();

    // 3. Verify the table headers
    await expect(basicSection.getByRole("columnheader", { name: "Invoice" })).toBeVisible();
    await expect(basicSection.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(basicSection.getByRole("columnheader", { name: "Method" })).toBeVisible();
    await expect(basicSection.getByRole("columnheader", { name: "Amount" })).toBeVisible();

    // 4. Verify table data (first row)
    await expect(basicSection.getByRole("cell", { name: "INV001" })).toBeVisible();
    await expect(basicSection.getByRole("cell", { name: "Paid", exact: true })).toBeVisible();
    await expect(basicSection.getByRole("cell", { name: "Credit Card" }).first()).toBeVisible();
    await expect(basicSection.getByRole("cell", { name: "$250.00" })).toBeVisible();

    // ------------------------------------------------------------
    // With Footer Example
    // ------------------------------------------------------------

    // 5. Get the with footer section
    const withFooterSection = page.getByText("With Footer", { exact: true }).locator("..");

    // 6. Verify the footer is visible
    await expect(withFooterSection.getByRole("cell", { name: "Total" })).toBeVisible();
    await expect(withFooterSection.getByRole("cell", { name: "$2,500.00" })).toBeVisible();

    // ------------------------------------------------------------
    // Simple Example
    // ------------------------------------------------------------

    // 7. Get the simple section
    const simpleSection = page.getByText("Simple", { exact: true }).locator("..");

    // 8. Verify the table headers
    await expect(simpleSection.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(simpleSection.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(simpleSection.getByRole("columnheader", { name: "Role" })).toBeVisible();

    // 9. Verify table data
    await expect(simpleSection.getByRole("cell", { name: "Sarah Chen" })).toBeVisible();
    await expect(simpleSection.getByRole("cell", { name: "sarah.chen@acme.com" })).toBeVisible();
    await expect(simpleSection.getByRole("cell", { name: "Admin" })).toBeVisible();

    // ------------------------------------------------------------
    // With Badges Example
    // ------------------------------------------------------------

    // 10. Get the with badges section
    const withBadgesSection = page.getByText("With Badges", { exact: true }).locator("..");

    // 11. Verify the table headers
    await expect(withBadgesSection.getByRole("columnheader", { name: "Task" })).toBeVisible();
    await expect(withBadgesSection.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(withBadgesSection.getByRole("columnheader", { name: "Priority" })).toBeVisible();

    // 12. Verify badges are visible
    await expect(withBadgesSection.getByText("Completed")).toBeVisible();
    await expect(withBadgesSection.getByText("In Progress")).toBeVisible();
    await expect(withBadgesSection.getByText("Pending")).toBeVisible();
    await expect(withBadgesSection.getByText("High")).toBeVisible();
    await expect(withBadgesSection.getByText("Medium")).toBeVisible();
    await expect(withBadgesSection.getByText("Low")).toBeVisible();

    // ------------------------------------------------------------
    // With Actions Example
    // ------------------------------------------------------------

    // 13. Get the with actions section
    const withActionsSection = page.getByText("With Actions", { exact: true }).locator("..");

    // 14. Verify the table headers
    await expect(withActionsSection.getByRole("columnheader", { name: "Product" })).toBeVisible();
    await expect(withActionsSection.getByRole("columnheader", { name: "Price" })).toBeVisible();
    await expect(withActionsSection.getByRole("columnheader", { name: "Actions" })).toBeVisible();

    // 15. Verify the dropdown trigger buttons are visible
    const actionButtons = withActionsSection.getByRole("button", { name: "Open menu" });
    await expect(actionButtons).toHaveCount(3);

    // 16. Click the first action button
    await actionButtons.first().hover();
    await page.waitForTimeout(300);
    await actionButtons.first().click();

    // 17. Verify the dropdown menu is visible
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();

    // 18. Close the dropdown by pressing Escape
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // With Select Example
    // ------------------------------------------------------------

    // 19. Get the with select section
    const withSelectSection = page.getByText("With Select", { exact: true }).locator("..");

    // 20. Verify the table headers
    await expect(withSelectSection.getByRole("columnheader", { name: "Task" })).toBeVisible();
    await expect(withSelectSection.getByRole("columnheader", { name: "Assignee" })).toBeVisible();
    await expect(
      withSelectSection.getByRole("columnheader", { name: "Status", exact: true }),
    ).toBeVisible();

    // 21. Verify the select buttons are visible with default values
    await expect(withSelectSection.getByRole("button", { name: "Sarah Chen" })).toBeVisible();
    await expect(withSelectSection.getByRole("button", { name: "Marc Rodriguez" })).toBeVisible();
    await expect(withSelectSection.getByRole("button", { name: "Emily Watson" })).toBeVisible();

    // 22. Click the first select to open it
    await withSelectSection.getByRole("button", { name: "Sarah Chen" }).hover();
    await page.waitForTimeout(300);
    await withSelectSection.getByRole("button", { name: "Sarah Chen" }).click();

    // 23. Verify the select options are visible
    await expect(page.getByRole("option", { name: "Sarah Chen" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Marc Rodriguez" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Emily Watson" })).toBeVisible();
    await expect(page.getByRole("option", { name: "David Kim" })).toBeVisible();

    // 24. Close the select by pressing Escape
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // With Input Example
    // ------------------------------------------------------------

    // 25. Get the with input section
    const withInputSection = page.getByText("With Input", { exact: true }).locator("..");

    // 26. Verify the table headers
    await expect(withInputSection.getByRole("columnheader", { name: "Product" })).toBeVisible();
    await expect(withInputSection.getByRole("columnheader", { name: "Quantity" })).toBeVisible();
    await expect(withInputSection.getByRole("columnheader", { name: "Price" })).toBeVisible();

    // 27. Verify the input fields are visible
    const spinbuttons = withInputSection.getByRole("spinbutton");
    await expect(spinbuttons).toHaveCount(3);

    // 28. Verify the input values
    await expect(spinbuttons.nth(0)).toHaveValue("1");
    await expect(spinbuttons.nth(1)).toHaveValue("2");
    await expect(spinbuttons.nth(2)).toHaveValue("1");

    // 29. Type in the first input field
    await spinbuttons.nth(0).click();
    await spinbuttons.nth(0).fill("5");
    await expect(spinbuttons.nth(0)).toHaveValue("5");

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Verify
    // ------------------------------------------------------------

    // 30. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 31. Wait for navigation to docs view
    await page.waitForTimeout(500);
    await page.waitForLoadState("networkidle");

    // 32. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Table", level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // 33. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 34. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 35. Verify the Data Table section is present
    await expect(page.getByRole("heading", { name: "Data Table", level: 2 })).toBeVisible();

    // 36. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 37. Scroll to the bottom of the page to verify all examples are present
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 38. Verify all example headings are present
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Footer", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Simple", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Badges", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Actions", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Select", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Input", level: 3 })).toBeVisible();
  });
});
