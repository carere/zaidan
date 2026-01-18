import { expect, test } from "@playwright/test";

test.describe("Input Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/input");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Basic Example
    // ------------------------------------------------------------

    // 1. Verify the basic email input is visible (first email input on page)
    const basicInput = page.getByPlaceholder("Email").first();
    await expect(basicInput).toBeVisible();

    // 2. Type in the input
    await basicInput.fill("test@example.com");

    // 3. Verify the value is set
    await expect(basicInput).toHaveValue("test@example.com");

    // ------------------------------------------------------------
    // Invalid Example
    // ------------------------------------------------------------

    // 4. Verify the error input is visible with aria-invalid
    const invalidInput = page.getByPlaceholder("Error");
    await expect(invalidInput).toBeVisible();
    await expect(invalidInput).toHaveAttribute("aria-invalid", "true");

    // ------------------------------------------------------------
    // With Label Example
    // ------------------------------------------------------------

    // 5. Verify the labeled input is visible
    const labeledInput = page.getByPlaceholder("name@example.com");
    await expect(labeledInput).toBeVisible();

    // 6. Type in the labeled input
    await labeledInput.fill("john@example.com");
    await expect(labeledInput).toHaveValue("john@example.com");

    // ------------------------------------------------------------
    // With Description Example
    // ------------------------------------------------------------

    // 7. Verify the description text is present
    await expect(page.getByText("Choose a unique username for your account.")).toBeVisible();

    // 8. Verify and fill the username input
    const usernameInput = page.getByPlaceholder("Enter your username");
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill("johndoe");
    await expect(usernameInput).toHaveValue("johndoe");

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 9. Verify the disabled input is visible and disabled (second email input in list)
    const disabledInput = page
      .locator('[data-slot="example"]')
      .filter({ hasText: "Disabled" })
      .getByRole("textbox");
    await expect(disabledInput).toBeVisible();
    await expect(disabledInput).toBeDisabled();

    // ------------------------------------------------------------
    // Input Types Example
    // ------------------------------------------------------------

    // 10. Verify password input is visible
    const passwordInput = page.getByPlaceholder("Password");
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("secretPassword123");

    // 11. Verify URL input
    const urlInput = page.getByPlaceholder("https://example.com");
    await expect(urlInput).toBeVisible();

    // 12. Verify number input
    const numberInput = page.getByRole("spinbutton", { name: "Number" });
    await expect(numberInput).toBeVisible();
    await numberInput.fill("42");

    // 13. Verify date input
    const dateInput = page.locator('[type="date"]');
    await expect(dateInput).toBeVisible();

    // 14. Verify time input
    const timeInput = page.locator('[type="time"]');
    await expect(timeInput).toBeVisible();

    // 15. Verify file input
    const fileInput = page.locator('[type="file"]');
    await expect(fileInput).toBeVisible();

    // ------------------------------------------------------------
    // With Select Example
    // ------------------------------------------------------------

    // 16. Verify the amount input is visible
    const amountInput = page.getByPlaceholder("Enter amount");
    await expect(amountInput).toBeVisible();
    await amountInput.fill("100");

    // 17. Verify the currency select is visible and click it
    const currencySelect = page.getByRole("button", { name: "USD" });
    await expect(currencySelect).toBeVisible();
    await currencySelect.click();

    // 18. Wait for dropdown and select EUR
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: "EUR" }).click();

    // ------------------------------------------------------------
    // With Button Example
    // ------------------------------------------------------------

    // 19. Verify the search input is visible
    const searchInput = page.getByPlaceholder("Search...");
    await expect(searchInput).toBeVisible();

    // 20. Verify the search button is visible
    const searchButton = page.getByRole("button", { name: "Search", exact: true });
    await expect(searchButton).toBeVisible();

    // 21. Fill the search input
    await searchInput.fill("test query");

    // 22. Hover over the search button
    await searchButton.hover();
    await page.waitForTimeout(200);

    // ------------------------------------------------------------
    // With Native Select Example
    // ------------------------------------------------------------

    // 23. Verify the phone input for native select is visible (exact match)
    const nativePhoneInput = page.locator('[placeholder="(555) 123-4567"]');
    await expect(nativePhoneInput).toBeVisible();
    await nativePhoneInput.fill("555-987-6543");

    // 24. Verify the country code select is visible
    const countryCodeSelect = page.getByRole("combobox");
    await expect(countryCodeSelect).toBeVisible();

    // 25. Select a different country code
    await countryCodeSelect.selectOption("+44");

    // ------------------------------------------------------------
    // Form Example
    // ------------------------------------------------------------

    // 26. Fill in the name field
    const nameInput = page.getByPlaceholder("John Doe");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Jane Smith");

    // 27. Fill in the email field
    const formEmailInput = page.getByPlaceholder("john@example.com");
    await formEmailInput.fill("jane@example.com");

    // 28. Verify email description is present
    await expect(page.getByText("We'll never share your email with anyone.")).toBeVisible();

    // 29. Fill in the address field
    const addressInput = page.getByPlaceholder("123 Main St");
    await addressInput.fill("456 Oak Avenue");

    // 30. Verify the Cancel button is visible
    const cancelButton = page.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();

    // 31. Verify the Submit button is visible
    const submitButton = page.getByRole("button", { name: "Submit" });
    await expect(submitButton).toBeVisible();

    // 32. Hover over buttons
    await cancelButton.hover();
    await page.waitForTimeout(200);
    await submitButton.hover();
    await page.waitForTimeout(200);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 33. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 34. Wait for docs to load
    await page.waitForTimeout(500);

    // 35. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Input", level: 1 })).toBeVisible();

    // 36. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 37. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 38. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 39. Scroll to bottom to verify all examples are loaded
    await page.keyboard.press("End");
    await page.waitForTimeout(500);
  });
});
