import { expect, test } from "@playwright/test";

test.describe("Progress Component", () => {
  test("examples", async ({ page }) => {
    await page.goto("http://localhost:5174/ui/progress");

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Progress Bar Example
    // ------------------------------------------------------------

    // 1. Get the progress bar section
    const progressBarSection = page.getByText("Progress Bar", { exact: true }).locator("..");

    // 2. Verify all 5 progress bars are visible
    const progressBars = progressBarSection.getByRole("progressbar");
    await expect(progressBars).toHaveCount(5);

    // 3. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // With Label Example
    // ------------------------------------------------------------

    // 4. Get the with label section
    const withLabelSection = page.getByText("With Label", { exact: true }).locator("..");

    // 5. Verify the progress bar with label is visible
    const labeledProgress = withLabelSection.getByRole("progressbar", { name: "Upload progress" });
    await expect(labeledProgress).toBeVisible();

    // 6. Verify the label text is present
    await expect(withLabelSection.getByText("Upload progress")).toBeVisible();

    // 7. Verify the value "56%" is displayed
    await expect(withLabelSection.getByText("56%")).toBeVisible();

    // 8. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Controlled Example
    // ------------------------------------------------------------

    // 9. Get the controlled section
    const controlledSection = page.getByText("Controlled", { exact: true }).locator("..");

    // 10. Verify the progress bar is visible
    const controlledProgress = controlledSection.getByRole("progressbar");
    await expect(controlledProgress).toBeVisible();

    // 11. Verify the slider is visible (use first() to get the thumb, not the hidden input)
    const slider = controlledSection.getByRole("slider").first();
    await expect(slider).toBeVisible();

    // 12. Verify the initial slider value is 50
    await expect(slider).toHaveAttribute("aria-valuenow", "50");

    // 13. Hover over the slider
    await slider.hover();

    // 14. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 15. Interact with the slider - drag to change value
    const sliderBoundingBox = await slider.boundingBox();
    if (sliderBoundingBox) {
      // Click at 75% of the slider width to change value
      await page.mouse.click(
        sliderBoundingBox.x + sliderBoundingBox.width * 0.75,
        sliderBoundingBox.y + sliderBoundingBox.height / 2,
      );
    }

    // 16. Wait for 300ms to let the value update
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // File Upload List Example
    // ------------------------------------------------------------

    // 17. Get the file upload list section
    const fileUploadSection = page.getByText("File Upload List", { exact: true }).locator("..");

    // 18. Verify the list is visible
    const fileList = fileUploadSection.getByRole("list");
    await expect(fileList).toBeVisible();

    // 19. Verify file names are displayed
    await expect(fileUploadSection.getByText("document.pdf")).toBeVisible();
    await expect(fileUploadSection.getByText("presentation.pptx")).toBeVisible();
    await expect(fileUploadSection.getByText("spreadsheet.xlsx")).toBeVisible();
    await expect(fileUploadSection.getByText("image.jpg")).toBeVisible();

    // 20. Verify time remaining labels
    await expect(fileUploadSection.getByText("2m 30s")).toBeVisible();
    await expect(fileUploadSection.getByText("45s")).toBeVisible();
    await expect(fileUploadSection.getByText("5m 12s")).toBeVisible();
    await expect(fileUploadSection.getByText("Complete")).toBeVisible();

    // 21. Verify there are 4 progress bars in the file list
    const fileProgressBars = fileUploadSection.getByRole("progressbar");
    await expect(fileProgressBars).toHaveCount(4);

    // 22. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Scroll
    // ------------------------------------------------------------

    // 23. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 24. Wait for docs to load
    await page.waitForTimeout(500);

    // 25. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Progress", level: 1 })).toBeVisible();

    // 26. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 27. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 28. Verify the With Label section is present
    await expect(page.getByRole("heading", { name: "With Label", level: 2 }).first()).toBeVisible();

    // 29. Verify the Indeterminate section is present
    await expect(page.getByRole("heading", { name: "Indeterminate", level: 2 })).toBeVisible();

    // 30. Verify the Custom Value Range section is present
    await expect(page.getByRole("heading", { name: "Custom Value Range", level: 2 })).toBeVisible();

    // 31. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 32. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 33. Wait for scroll to complete
    await page.waitForTimeout(500);

    // 34. Verify the File Upload List example heading is visible at the bottom
    await expect(page.getByRole("heading", { name: "File Upload List", level: 3 })).toBeVisible();
  });
});
