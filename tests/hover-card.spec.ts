import { expect, test } from "@playwright/test";

test.describe("Hover Card", () => {
  test("examples", async ({ page }) => {
    await page.goto(`http://localhost:${process.env.FRONTEND_PORT}/ui/hover-card`);

    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------
    // Sides Example
    // ------------------------------------------------------------

    // 1. Get the sides section
    const sidesSection = page.getByText("Sides", { exact: true }).locator("..");

    // 2. Hover over the 'top' button and verify hover card appears
    await sidesSection.getByRole("link", { name: "top", exact: true }).hover();

    // 3. Wait for hover card to appear (openDelay is 100ms)
    await page.waitForTimeout(200);

    // 4. Verify the hover card content is visible
    await expect(page.getByRole("heading", { name: "Hover Card", level: 4 })).toBeVisible();
    await expect(
      page.getByText("This hover card appears on the top side of the trigger."),
    ).toBeVisible();

    // 5. Move mouse away to close hover card
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);

    // 6. Hover over the 'right' button
    await sidesSection.getByRole("link", { name: "right", exact: true }).hover();
    await page.waitForTimeout(200);

    // 7. Verify hover card content for right side
    await expect(
      page.getByText("This hover card appears on the right side of the trigger."),
    ).toBeVisible();

    // 8. Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);

    // 9. Hover over the 'bottom' button
    await sidesSection.getByRole("link", { name: "bottom", exact: true }).hover();
    await page.waitForTimeout(200);

    // 10. Verify hover card content for bottom side
    await expect(
      page.getByText("This hover card appears on the bottom side of the trigger."),
    ).toBeVisible();

    // 11. Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);

    // 12. Hover over the 'left' button
    await sidesSection.getByRole("link", { name: "left", exact: true }).hover();
    await page.waitForTimeout(200);

    // 13. Verify hover card content for left side
    await expect(
      page.getByText("This hover card appears on the left side of the trigger."),
    ).toBeVisible();

    // 14. Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);

    // ------------------------------------------------------------
    // In Dialog Example
    // ------------------------------------------------------------

    // 15. Get the in dialog section
    const inDialogSection = page.getByText("In Dialog", { exact: true }).locator("..");

    // 16. Hover over the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).hover();

    // 17. Wait for 300ms to simulate user navigation
    await page.waitForTimeout(300);

    // 18. Click the 'Open Dialog' button
    await inDialogSection.getByRole("button", { name: "Open Dialog", exact: true }).click();

    // 19. Verify the dialog is visible
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 20. Verify dialog title and description
    await expect(dialog.getByRole("heading", { name: "Hover Card Example" })).toBeVisible();
    await expect(
      dialog.getByText("Hover over the button below to see the hover card."),
    ).toBeVisible();

    // 21. Hover over the 'Hover me' link inside the dialog
    await dialog.getByRole("link", { name: "Hover me", exact: true }).hover();

    // 22. Wait for hover card to appear
    await page.waitForTimeout(200);

    // 23. Verify hover card content inside dialog
    await expect(page.getByText("This hover card appears inside a dialog.")).toBeVisible();

    // 24. Close the dialog by clicking the dismiss button
    await dialog.getByRole("button", { name: "Dismiss", exact: true }).click();

    // 25. Verify the dialog is hidden
    await expect(dialog).toBeHidden();

    // ------------------------------------------------------------
    // Docs Page Test - Toggle to Docs and Verify Content
    // ------------------------------------------------------------

    // 26. Click the toggle button to switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 27. Verify the docs page is visible by checking for the main heading
    await expect(page.getByRole("heading", { name: "Hover Card", level: 1 })).toBeVisible();

    // 28. Verify the Installation section is present
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();

    // 29. Verify the Usage section is present
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();

    // 30. Verify the Examples section is present
    await expect(page.getByRole("heading", { name: "Examples", level: 2 })).toBeVisible();

    // 31. Verify individual example headings in docs
    await expect(page.getByRole("heading", { name: "Sides", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Dialog", level: 3 })).toBeVisible();

    // 32. Scroll to the bottom of the page to see all examples
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) {
        main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
      }
    });

    // 33. Wait for scroll to complete
    await page.waitForTimeout(500);
  });
});
