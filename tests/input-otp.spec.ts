import { expect, test } from "@playwright/test";

test.describe("Input OTP Examples", () => {
  test("examples", async ({ page }) => {
    await page.goto("/ui/input-otp");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Form Example
    // ------------------------------------------------------------

    // 1. Verify the card title is visible
    await expect(page.getByText("Verify your login")).toBeVisible();

    // 2. Verify the email is displayed
    await expect(page.getByText("m@example.com")).toBeVisible();

    // 3. Verify the verification code input is visible
    const formOtpInput = page.getByRole("textbox", { name: "Verification code" });
    await expect(formOtpInput).toBeVisible();

    // 4. Verify the Resend Code button is visible
    await expect(page.getByRole("button", { name: "Resend Code" })).toBeVisible();

    // 5. Verify the Verify button is visible
    await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();

    // 6. Verify the Contact support link is visible
    await expect(page.getByRole("link", { name: "Contact support" })).toBeVisible();

    // ------------------------------------------------------------
    // Simple Example
    // ------------------------------------------------------------

    // 7. Verify the Simple label is visible
    await expect(page.getByText("Simple").first()).toBeVisible();

    // 8. Verify the Simple input is visible
    const simpleOtpInput = page.getByRole("textbox", { name: "Simple" });
    await expect(simpleOtpInput).toBeVisible();

    // ------------------------------------------------------------
    // Digits Only Example
    // ------------------------------------------------------------

    // 9. Verify the Digits Only label is visible
    await expect(page.getByText("Digits Only").first()).toBeVisible();

    // 10. Verify the input is visible
    const digitsOnlyOtpInput = page.getByRole("textbox", { name: "Digits Only" });
    await expect(digitsOnlyOtpInput).toBeVisible();

    // ------------------------------------------------------------
    // With Separator Example
    // ------------------------------------------------------------

    // 11. Verify the With Separator label is visible
    await expect(page.getByText("With Separator").first()).toBeVisible();

    // 12. Verify the input is visible
    const separatorOtpInput = page.getByRole("textbox", { name: "With Separator" });
    await expect(separatorOtpInput).toBeVisible();

    // ------------------------------------------------------------
    // Alphanumeric Example
    // ------------------------------------------------------------

    // 13. Verify the Alphanumeric label is visible
    await expect(page.getByText("Alphanumeric").first()).toBeVisible();

    // 14. Verify the description is visible
    await expect(page.getByText("Accepts both letters and numbers.")).toBeVisible();

    // 15. Verify the input is visible
    const alphanumericOtpInput = page.getByRole("textbox", { name: "Alphanumeric" });
    await expect(alphanumericOtpInput).toBeVisible();

    // ------------------------------------------------------------
    // Disabled Example
    // ------------------------------------------------------------

    // 16. Verify the Disabled label is visible
    await expect(page.getByText("Disabled").first()).toBeVisible();

    // 17. Verify the input is visible and disabled
    const disabledOtpInput = page.getByRole("textbox", { name: "Disabled" });
    await expect(disabledOtpInput).toBeVisible();
    await expect(disabledOtpInput).toBeDisabled();

    // ------------------------------------------------------------
    // 4 Digits Example
    // ------------------------------------------------------------

    // 18. Verify the 4 Digits label is visible
    await expect(page.getByText("4 Digits").first()).toBeVisible();

    // 19. Verify the description is visible
    await expect(page.getByText("Common pattern for PIN codes.")).toBeVisible();

    // 20. Verify the input is visible
    const fourDigitsOtpInput = page.getByRole("textbox", { name: "4 Digits" });
    await expect(fourDigitsOtpInput).toBeVisible();

    // ------------------------------------------------------------
    // Invalid State Example
    // ------------------------------------------------------------

    // 21. Verify the Invalid State label is visible
    await expect(page.getByText("Invalid State").first()).toBeVisible();

    // 22. Verify the description is visible
    await expect(page.getByText("Example showing the invalid error state.")).toBeVisible();

    // 23. Verify the input is visible
    const invalidOtpInput = page.getByRole("textbox", { name: "Invalid State" });
    await expect(invalidOtpInput).toBeVisible();

    // 24. Verify the error message is visible
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Invalid code. Please try again.")).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 25. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 26. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Input OTP", level: 1 })).toBeVisible();

    // 27. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 28. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 29. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 30. Scroll to the bottom to see all examples in docs
    await page.keyboard.press("End");
    await page.waitForTimeout(500);

    // 31. Verify the Invalid State example heading is visible in docs
    await expect(page.getByRole("heading", { name: "Invalid State", level: 3 })).toBeVisible();
  });
});
