import { expect, test } from "@playwright/test";

test.describe("Sidebar", () => {
  test("default sidebar example", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/sidebar");
    await page.waitForLoadState("networkidle");

    // Get the iframe and switch to it
    const iframe = page.frameLocator("iframe");

    // 1. Verify sidebar structure is visible (default is expanded on desktop)
    await expect(iframe.getByText("Documentation")).toBeVisible();
    await expect(iframe.getByText("v1.0.1")).toBeVisible();

    // 2. Verify search input is present
    await expect(iframe.getByPlaceholder("Search the docs...")).toBeVisible();

    // 3. Verify navigation groups are present (using sidebar-group-label)
    await expect(iframe.getByTestId("sidebar-content").getByText("Getting Started")).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-content").getByText("Building Your Application"),
    ).toBeVisible();
    await expect(iframe.getByTestId("sidebar-content").getByText("API Reference")).toBeVisible();
    await expect(iframe.getByTestId("sidebar-content").getByText("Architecture")).toBeVisible();

    // 4. Verify navigation items
    await expect(iframe.getByRole("link", { name: "Installation" })).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Data Fetching" }),
    ).toBeVisible();

    // 5. Test toggle sidebar button (use the SidebarTrigger inside main content, not the rail)
    const toggleButton = iframe.getByRole("main").getByRole("button", { name: "Toggle Sidebar" });
    await toggleButton.click();
    await page.waitForTimeout(300);

    // 6. Toggle back
    await toggleButton.click();
    await page.waitForTimeout(300);

    // 7. Test version dropdown
    await iframe.getByRole("button", { name: /Documentation v1.0.1/ }).click();
    await page.waitForTimeout(300);

    // 8. Verify dropdown options
    await expect(iframe.getByText("v1.1.0-alpha")).toBeVisible();
    await expect(iframe.getByText("v2.0.0-beta1")).toBeVisible();

    // 9. Close dropdown by pressing Escape
    await page.keyboard.press("Escape");

    // ------------------------------------------------------------
    // Docs Page Test
    // ------------------------------------------------------------

    // 10. Switch to docs view
    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();

    // 11. Verify docs page structure
    await expect(page.getByRole("heading", { name: "Sidebar", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Installation", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Usage", level: 2 })).toBeVisible();
  });

  test("icon sidebar example", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/sidebar-icon");
    await page.waitForLoadState("networkidle");

    const iframe = page.frameLocator("iframe");

    // 1. Verify team switcher
    await expect(iframe.getByText("Acme Inc")).toBeVisible();
    await expect(iframe.getByText("Enterprise")).toBeVisible();

    // 2. Verify platform navigation
    await expect(iframe.getByText("Platform")).toBeVisible();
    await expect(iframe.getByRole("button", { name: "Playground" })).toBeVisible();
    await expect(iframe.getByRole("button", { name: "Models" })).toBeVisible();
    await expect(iframe.getByRole("button", { name: "Documentation" })).toBeVisible();

    // 3. Verify projects section
    await expect(iframe.getByText("Projects")).toBeVisible();
    await expect(iframe.getByRole("link", { name: "Design Engineering" })).toBeVisible();
    await expect(iframe.getByRole("link", { name: "Sales & Marketing" })).toBeVisible();
    await expect(iframe.getByRole("link", { name: "Travel" })).toBeVisible();

    // 4. Verify user section
    await expect(iframe.getByText("shadcn")).toBeVisible();
    await expect(iframe.getByText("m@example.com")).toBeVisible();

    // 5. Collapse the sidebar to icon mode (use the trigger in main content area)
    const toggleButton = iframe.getByRole("main").getByRole("button", { name: "Toggle Sidebar" });
    await toggleButton.click();
    await page.waitForTimeout(500);

    // 6. Verify sidebar is collapsed - data-state changes to "collapsed" and data-collapsible becomes "icon"
    await expect(iframe.locator('[data-state="collapsed"][data-collapsible="icon"]')).toBeVisible();

    // 7. Expand sidebar again
    await toggleButton.click();
    await page.waitForTimeout(500);

    // 8. Verify sidebar is expanded - data-state changes to "expanded", data-collapsible becomes empty
    await expect(iframe.locator('[data-state="expanded"]').first()).toBeVisible();

    // ------------------------------------------------------------
    // Docs Page Test
    // ------------------------------------------------------------

    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();
    await expect(page.getByRole("heading", { name: "Sidebar (Icon)", level: 1 })).toBeVisible();
  });

  test("inset sidebar example", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/sidebar-inset");
    await page.waitForLoadState("networkidle");

    const iframe = page.frameLocator("iframe");

    // 1. Verify right-side sidebar with table of contents
    await expect(iframe.getByText("Table of Contents")).toBeVisible();

    // 2. Verify main navigation structure (use sidebar-menu selector to be specific)
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Getting Started" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Building Your Application" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "API Reference" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Architecture" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Community" }),
    ).toBeVisible();

    // 3. Verify sub-navigation items
    await expect(iframe.getByRole("link", { name: "Installation" })).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu-sub").getByRole("link", { name: "Data Fetching" }).first(),
    ).toBeVisible();
    await expect(iframe.getByRole("link", { name: "Components" })).toBeVisible();

    // 4. Verify breadcrumb in main content
    await expect(iframe.getByTestId("breadcrumb-page")).toBeVisible();

    // 5. Test toggle sidebar (should be rotated 180deg for right-side)
    const toggleButton = iframe.getByRole("button", { name: "Toggle Sidebar" }).first();
    await toggleButton.click();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test
    // ------------------------------------------------------------

    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();
    await expect(page.getByRole("heading", { name: "Sidebar (Inset)", level: 1 })).toBeVisible();
  });

  test("floating sidebar example", async ({ page }) => {
    await page.goto("http://localhost:5173/ui/sidebar-floating");
    await page.waitForLoadState("networkidle");

    const iframe = page.frameLocator("iframe");

    // 1. Verify floating sidebar header
    await expect(iframe.getByRole("link", { name: /Documentation v1.0.0/ })).toBeVisible();

    // 2. Verify navigation groups are visible (use sidebar-menu to be specific)
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Getting Started" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Building Your Application" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "API Reference" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Architecture" }),
    ).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu").getByRole("link", { name: "Community" }),
    ).toBeVisible();

    // 3. Verify sub-navigation items
    await expect(iframe.getByRole("link", { name: "Installation" })).toBeVisible();
    await expect(iframe.getByRole("link", { name: "Routing" })).toBeVisible();
    await expect(
      iframe.getByTestId("sidebar-menu-sub").getByRole("link", { name: "Data Fetching" }).first(),
    ).toBeVisible();

    // 4. Verify breadcrumb
    await expect(iframe.getByTestId("breadcrumb-page")).toBeVisible();

    // 5. Test toggle sidebar
    const toggleButton = iframe.getByRole("button", { name: "Toggle Sidebar" });
    await toggleButton.click();
    await page.waitForTimeout(300);

    // 6. Toggle back
    await toggleButton.click();
    await page.waitForTimeout(300);

    // ------------------------------------------------------------
    // Docs Page Test
    // ------------------------------------------------------------

    await page.getByRole("button", { name: "Toggle between preview and docs" }).click();
    await expect(page.getByRole("heading", { name: "Sidebar (Floating)", level: 1 })).toBeVisible();
  });
});
