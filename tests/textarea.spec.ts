import { expect, test } from "@playwright/test";

test.describe("Textarea Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5179/ui/textarea");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Get the basic section
    const basicSection = page.getByText("Basic", { exact: true }).locator("..");

    // 2. Verify the textarea is visible
    const basicTextarea = basicSection.getByRole("textbox", { name: "Type your message here." });
    await expect(basicTextarea).toBeVisible();

    // 3. Type in the textarea
    await basicTextarea.fill("Hello, this is a test message!");

    // 4. Verify the text was entered
    await expect(basicTextarea).toHaveValue("Hello, this is a test message!");

    // 5. Clear the textarea
    await basicTextarea.clear();
    await expect(basicTextarea).toHaveValue("");

    // ------------------------------------------------------------
    // Invalid Example
    // ------------------------------------------------------------

    // 6. Get the invalid section
    const invalidSection = page.getByText("Invalid", { exact: true }).locator("..");

    // 7. Verify the invalid textarea is visible
    const invalidTextarea = invalidSection.getByRole("textbox", {
      name: "Type your message here.",
    });
    await expect(invalidTextarea).toBeVisible();

    // 8. Verify the textarea has aria-invalid attribute
    await expect(invalidTextarea).toHaveAttribute("aria-invalid", "true");

    // 9. Type in the invalid textarea
    await invalidTextarea.fill("This field is marked as invalid");

    // 10. Verify the text was entered
    await expect(invalidTextarea).toHaveValue("This field is marked as invalid");

    // ------------------------------------------------------------
    // With Label Example
    // ------------------------------------------------------------

    // 11. Get the with label section
    const withLabelSection = page.getByText("With Label", { exact: true }).locator("..");

    // 12. Verify the label is visible
    await expect(withLabelSection.getByText("Message", { exact: true })).toBeVisible();

    // 13. Verify the textarea is visible and has the correct id
    const labeledTextarea = withLabelSection.getByRole("textbox", { name: "Message" });
    await expect(labeledTextarea).toBeVisible();

    // 14. Type in the labeled textarea
    await labeledTextarea.fill("Message with label");

    // 15. Verify the text was entered
    await expect(labeledTextarea).toHaveValue("Message with label");

    // ------------------------------------------------------------
    // With Description Example
    // ------------------------------------------------------------

    // 16. Get the with description section
    const withDescriptionSection = page
      .getByText("With Description", { exact: true })
      .locator("..");

    // 17. Verify the label is visible
    await expect(withDescriptionSection.getByText("Message").first()).toBeVisible();

    // 18. Verify the description is visible
    await expect(
      withDescriptionSection.getByText("Type your message and press enter to send."),
    ).toBeVisible();

    // 19. Verify the textarea is visible
    const descriptionTextarea = withDescriptionSection.getByRole("textbox", { name: "Message" });
    await expect(descriptionTextarea).toBeVisible();

    // 20. Type in the textarea with description
    await descriptionTextarea.fill("Message with description");

    // 21. Verify the text was entered
    await expect(descriptionTextarea).toHaveValue("Message with description");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 22. Get the disabled section
    const disabledSection = page.getByText("Disabled", { exact: true }).locator("..");

    // 23. Verify the disabled textarea is visible
    const disabledTextarea = disabledSection.getByRole("textbox", { name: "Message" });
    await expect(disabledTextarea).toBeVisible();

    // 24. Verify the textarea is disabled
    await expect(disabledTextarea).toBeDisabled();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 25. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 26. Wait for the docs page to load
    await page.waitForTimeout(500);

    // 27. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Textarea", level: 1 })).toBeVisible();

    // 28. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 29. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 30. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 31. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 32. Wait for scroll to complete
    await page.waitForTimeout(300);

    // 33. Verify example sections are visible in docs
    await expect(page.getByRole("heading", { name: "Basic", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invalid", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Label", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "With Description", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Disabled", level: 3 })).toBeVisible();
  });
});
