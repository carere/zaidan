import { expect, test } from "@playwright/test";

test.describe("Not Found Pages", () => {
  test("shows page not found for nonexistent docs page", async ({ page }) => {
    await page.goto("/nonexistent-page");

    // Verify the NotFoundPage component renders with EmptyWithBorder pattern
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(
      page.getByText("The page \"nonexistent-page\" doesn't exist or couldn't be loaded."),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Try searching for pages...")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();
  });

  test("shows component not found for nonexistent UI component", async ({ page }) => {
    await page.goto("/ui/nonexistent-component");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("Component not found")).toBeVisible();
    await expect(
      page.getByText(
        "The component \"nonexistent-component\" doesn't exist or couldn't be loaded.",
      ),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Try searching for pages...")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();
  });

  test("shows component not found for nonexistent UI docs", async ({ page }) => {
    await page.goto("/ui/nonexistent/docs");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("Component not found")).toBeVisible();
    await expect(
      page.getByText("The component \"nonexistent\" doesn't exist or couldn't be loaded."),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Try searching for pages...")).toBeVisible();
  });

  test("shows component not found for nonexistent preview", async ({ page }) => {
    await page.goto("/preview/kobalte/nonexistent");

    // Verify the NotFoundPage component renders with correct title
    await expect(page.getByText("Component not found")).toBeVisible();
    await expect(
      page.getByText("The component \"nonexistent\" doesn't exist or couldn't be loaded."),
    ).toBeVisible();
  });
});
