import { expect, test } from "@playwright/test";

test("non-searchable submenu stays open while resting over its first option", async ({ page }) => {
  await page.goto("/tests/browser/filters.html");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitem", { name: "Status", exact: true }).hover();
  const option = page.getByRole("menuitemcheckbox", { name: "To Do", exact: true });
  await option.hover();
  // Kobalte dismisses asynchronously; an immediate visibility check misses the regression.
  await page.waitForTimeout(1100);
  await expect(option).toBeVisible();
});

test("demo keeps non-searchable options open when moving between rows and fields", async ({
  page,
}) => {
  await page.goto("/tests/browser/filters.html?demo");
  await page.getByRole("button", { name: "Add Filter", exact: true }).click();
  for (const [field, first, second] of [
    ["Status", "To Do", "In Progress"],
    ["User Type", "Premium", "Standard"],
    ["Status", "To Do", "Done"],
  ]) {
    await page.getByRole("menuitem", { name: field, exact: true }).hover();
    await page.getByRole("menuitemcheckbox", { name: first, exact: true }).hover();
    const next = page.getByRole("menuitemcheckbox", { name: second, exact: true });
    await next.hover();
    await page.waitForTimeout(1100);
    await expect(next).toBeVisible();
  }
  await page.getByRole("menuitemcheckbox", { name: "Done", exact: true }).click();
  await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
  await expect(page.getByRole("main")).toContainText("Done");
});

for (const [field, query, option, multi] of [
  ["Priority", "urgent", "Urgent", true],
  ["Assignee", "jane", "Jane Smith", true],
  ["Country", "france", "France", false],
] as const) {
  test(`searchable ${field} supports hover, search, and selection`, async ({ page }) => {
    await page.goto("/tests/browser/filters.html?demo");
    await page.getByRole("button", { name: "Add Filter", exact: true }).click();
    await page.getByRole("menuitem", { name: field, exact: true }).hover();
    const search = page.getByPlaceholder(`Search ${field.toLowerCase()}...`, { exact: true });
    await expect(search).toBeVisible();
    await page.getByRole("menu").last().getByRole("menuitemcheckbox").first().hover();
    await page.waitForTimeout(1100);
    await expect(search).toBeVisible();
    await search.fill(query);
    const choice = page.getByRole("menuitemcheckbox", { name: new RegExp(`${option}$`) });
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
    await page.goto("/tests/browser/filters.html?demo");
    await page.getByRole("button", { name: "Add Filter", exact: true }).click();
    const rootSearch = page.getByPlaceholder("Filter...", { exact: true });
    await rootSearch.fill(field);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    if (field === "Country") {
      await expect(page.getByPlaceholder("Search country...", { exact: true })).toBeFocused();
      await page.keyboard.press("ArrowDown");
    }
    await expect(page.getByRole("menu").last().getByRole("menuitemcheckbox").first()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("menuitem", { name: field, exact: true })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    if (field === "Country") {
      await expect(page.getByPlaceholder("Search country...", { exact: true })).toBeFocused();
      await page.keyboard.press("ArrowDown");
    }
    await expect(page.getByRole("menu").last().getByRole("menuitemcheckbox").first()).toBeFocused();
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
    await page.goto("/tests/browser/filters.html");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitem", { name: "Status", exact: true }).hover();
    const option = page.getByRole("menuitemcheckbox", { name: "To Do", exact: true });
    await option.hover();
    await page.waitForTimeout(1100);
    await expect(option).toBeVisible();
    if (dismissal === "Escape") await page.keyboard.press("Escape");
    else await page.mouse.click(10, 10);
    await expect(option).toBeHidden();
    await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
  });
}

test("moving within an open field trigger does not close or remount its submenu", async ({
  page,
}) => {
  await page.goto("/tests/browser/filters.html");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const trigger = page.getByRole("menuitem", { name: "Status", exact: true });
  await trigger.hover();
  const submenu = page.getByRole("menu", { name: "Status", exact: true });
  await expect(submenu).toBeVisible();
  const originalId = await submenu.getAttribute("id");
  if (!originalId) throw new Error("Status submenu has no id");
  const box = await trigger.boundingBox();
  if (!box) throw new Error("Status trigger is missing");
  for (let step = 0; step < 6; step++) {
    await page.mouse.move(box.x + 30 + step * 10, box.y + box.height / 2);
    await page.waitForTimeout(200);
    await expect(submenu).toHaveAttribute("id", originalId);
  }
});

test("Enter on a focused non-searchable option adds exactly one filter", async ({ page }) => {
  await page.goto("/tests/browser/filters.html?demo");
  await page.getByRole("button", { name: "Add Filter", exact: true }).click();
  const search = page.getByPlaceholder("Filter...", { exact: true });
  await search.fill("Status");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  const option = page.getByRole("menuitemcheckbox", { name: "To Do", exact: true });
  await option.hover();
  await expect(option).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
  await expect(page.getByRole("button", { name: "To Do", exact: true })).toHaveCount(1);
});

test("native keyboard navigation advances through virtualized options", async ({ page }) => {
  await page.goto("/tests/browser/filters.html?virtualized");
  await page.getByRole("button", { name: "Filter", exact: true }).press("Enter");
  await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Product", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByPlaceholder("Search product...", { exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Product 0001", exact: true }),
  ).toBeFocused();
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitemcheckbox", {
        name: `Product ${String(index + 2).padStart(4, "0")}`,
        exact: true,
      }),
    ).toBeFocused();
  }
  const option = page.getByRole("menuitemcheckbox", { name: "Product 0031", exact: true });
  await expect(option).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(option).toHaveAttribute("aria-checked", "true");
});

test("search inputs are reachable through primitive keyboard navigation", async ({ page }) => {
  await page.goto("/tests/browser/filters.html?demo");
  await page.getByRole("button", { name: "Add Filter", exact: true }).press("Enter");
  await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeFocused();
  await page.keyboard.type("Country");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Country", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByPlaceholder("Search country...", { exact: true })).toBeFocused();
  await page.keyboard.type("france");
  await page.keyboard.press("ArrowDown");
  const france = page.getByRole("menuitemcheckbox", { name: /France$/ });
  await expect(france).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByPlaceholder("Filter...", { exact: true })).toBeHidden();
  await expect(page.getByRole("main")).toContainText("France");
});
