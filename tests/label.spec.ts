import { expect, test } from "@playwright/test";

test.describe("Label Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/label");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // With Checkbox Example
    // ------------------------------------------------------------

    // 1. Get the checkbox section
    const checkboxSection = page.getByText("With Checkbox", { exact: true }).locator("..");

    // 2. Verify the checkbox label is visible
    await expect(checkboxSection.getByText("Accept terms and conditions")).toBeVisible();

    // 3. Hover over the label (checkbox has hidden input with overlay)
    await checkboxSection.getByText("Accept terms and conditions").hover();

    // 4. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 5. Click the label to check the checkbox
    await checkboxSection.getByText("Accept terms and conditions").click();

    // 6. Verify the checkbox is checked
    await expect(checkboxSection.getByRole("checkbox")).toBeChecked();

    // 7. Click the label again to toggle checkbox
    await checkboxSection.getByText("Accept terms and conditions").click();

    // 8. Verify the checkbox is unchecked
    await expect(checkboxSection.getByRole("checkbox")).not.toBeChecked();

    // ------------------------------------------------------------
    // With Input Example
    // ------------------------------------------------------------

    // 9. Get the input section
    const inputSection = page.getByText("With Input", { exact: true }).locator("..");

    // 10. Verify the label is visible
    await expect(inputSection.getByText("Username")).toBeVisible();

    // 11. Hover over the input
    await inputSection.getByRole("textbox", { name: "Username" }).hover();

    // 12. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 13. Click the input
    await inputSection.getByRole("textbox", { name: "Username" }).click();

    // 14. Type in the input
    await inputSection.getByRole("textbox", { name: "Username" }).fill("testuser");

    // 15. Verify the input value
    await expect(inputSection.getByRole("textbox", { name: "Username" })).toHaveValue("testuser");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 16. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 17. Verify the disabled label is visible (using label role)
    await expect(disabledSection.locator("label")).toBeVisible();

    // 18. Verify the input is disabled
    await expect(disabledSection.getByRole("textbox", { name: "Disabled" })).toBeDisabled();

    // ------------------------------------------------------------
    // With Textarea Example
    // ------------------------------------------------------------

    // 19. Get the textarea section
    const textareaSection = page.getByText("With Textarea", { exact: true }).locator("..");

    // 20. Verify the label is visible
    await expect(textareaSection.getByText("Message")).toBeVisible();

    // 21. Hover over the textarea
    await textareaSection.getByRole("textbox", { name: "Message" }).hover();

    // 22. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 23. Click the textarea
    await textareaSection.getByRole("textbox", { name: "Message" }).click();

    // 24. Type in the textarea
    await textareaSection
      .getByRole("textbox", { name: "Message" })
      .fill("Hello, this is a test message!");

    // 25. Verify the textarea value
    await expect(textareaSection.getByRole("textbox", { name: "Message" })).toHaveValue(
      "Hello, this is a test message!",
    );

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 26. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 27. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Label", level: 1 })).toBeVisible();

    // 28. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 29. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 30. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 31. Verify all example headings are present
    await expect(page.getByRole("heading", { name: "With Checkbox", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Input", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Disabled", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Textarea", level: 3 })).toBeVisible();

    // 32. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 33. Wait for scroll to complete
    await page.waitForTimeout(500);
  });
});
