import { expect, test } from "@playwright/test";

test("non-searchable submenu stays open while resting over its first option", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("option", { name: "Status", exact: true }).hover();
  const option = page.getByRole("option", { name: "To Do", exact: true });
  await option.hover();
  // Kobalte dismisses asynchronously; an immediate visibility check misses the regression.
  await page.waitForTimeout(1100);
  await expect(option).toBeVisible();
});

test("demo keeps non-searchable options open when moving between rows and fields", async ({
  page,
}) => {
  await page.goto("/?demo");
  await page.getByRole("button", { name: "Add Filter", exact: true }).click();
  for (const [field, first, second] of [
    ["Status", "To Do", "In Progress"],
    ["User Type", "Premium", "Standard"],
    ["Status", "To Do", "Done"],
  ]) {
    await page.getByRole("option", { name: field, exact: true }).hover();
    await page.getByRole("option", { name: first, exact: true }).hover();
    const next = page.getByRole("option", { name: second, exact: true });
    await next.hover();
    await page.waitForTimeout(1100);
    await expect(next).toBeVisible();
  }
  await page.getByRole("option", { name: "Done", exact: true }).click();
  await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
  await expect(page.getByRole("main")).toContainText("Done");
});

for (const [field, query, option, multi] of [
  ["Priority", "urgent", "Urgent", true],
  ["Assignee", "jane", "Jane Smith", true],
  ["Country", "france", "France", false],
] as const) {
  test(`searchable ${field} supports hover, search, and selection`, async ({ page }) => {
    await page.goto("/?demo");
    await page.getByRole("button", { name: "Add Filter", exact: true }).click();
    await page.getByRole("option", { name: field, exact: true }).hover();
    const search = page.getByPlaceholder(`Search ${field.toLowerCase()}...`, { exact: true });
    await expect(search).toBeVisible();
    await page.getByRole("listbox").last().getByRole("option").first().hover();
    await page.waitForTimeout(1100);
    await expect(search).toBeVisible();
    await search.fill(query);
    const choice = page.getByRole("option", { name: new RegExp(`${option}$`) });
    await expect(choice).toBeVisible();
    await choice.click();
    if (multi) {
      await expect(choice).toHaveAttribute("data-checked");
      await choice.click();
      await expect(choice).not.toHaveAttribute("data-checked");
      await choice.click();
      await page.keyboard.press("Escape");
    }
    await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
    await expect(page.getByRole("main")).toContainText(option);
  });
}

for (const field of ["Status", "Country"]) {
  test(`keyboard enters, leaves, and selects in ${field}`, async ({ page }) => {
    await page.goto("/?demo");
    await page.getByRole("button", { name: "Add Filter", exact: true }).click();
    const rootSearch = page.getByPlaceholder("Filter...", { exact: true });
    await rootSearch.fill(field);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("listbox").last().getByRole("option").first()).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(rootSearch).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(rootSearch).toBeHidden();
    await expect(page.getByRole("main")).toContainText(
      field === "Status" ? "In Progress" : "Australia",
    );
  });
}

for (const dismissal of ["Escape", "outside click"]) {
  test(`non-searchable submenu dismisses with ${dismissal}`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("option", { name: "Status", exact: true }).hover();
    const option = page.getByRole("option", { name: "To Do", exact: true });
    await option.hover();
    await page.waitForTimeout(1100);
    await expect(option).toBeVisible();
    if (dismissal === "Escape") await page.keyboard.press("Escape");
    else await page.mouse.click(10, 10);
    await expect(option).toBeHidden();
    await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
  });
}
