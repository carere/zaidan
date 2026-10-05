import { expect, test } from "@playwright/test";

for (const style of ["vega", "nova", "lyra", "maia", "mira", "luma", "rhea", "sera"]) {
  for (const theme of ["light", "dark"]) {
    test(`${style} ${theme} docs demo: circle clicks select like label clicks`, async ({
      page,
    }) => {
      await page.goto(`/tests/browser/radio-group.html?${new URLSearchParams({ style, theme })}`);
      const demo = page.getByRole("region", { name: "Docs demo" });
      await expect(demo.getByRole("radio", { name: "Comfortable" })).toBeChecked();
      await demo.locator('[data-slot="radio-group-item"]').first().click();
      await expect(demo.getByRole("radio", { name: "Default", exact: true })).toBeChecked();
      await expect(demo.getByRole("radio", { name: "Default", exact: true })).toBeFocused();
      // Click the same physical center again with its selected indicator visible.
      await demo.locator('[data-slot="radio-group-item"]').first().click();
      await expect(demo.getByRole("radio", { name: "Default", exact: true })).toBeChecked();
      await demo.getByText("Compact", { exact: true }).click();
      await expect(demo.getByRole("radio", { name: "Compact" })).toBeChecked();
      await expect(demo.locator('[data-slot="radio-group-indicator"]')).toHaveCount(1);
      const circle = demo.locator('[data-slot="radio-group-item"]').last();
      const icon = circle.locator(".z-radio-group-indicator-icon");
      const circleBox = await circle.boundingBox();
      const iconBox = await icon.boundingBox();
      if (!circleBox || !iconBox) throw new Error("Missing circle or selected indicator");
      expect(circleBox.width).toBe(style === "sera" ? 18 : 16);
      expect(circleBox.height).toBe(circleBox.width);
      expect(iconBox.x + iconBox.width / 2).toBeCloseTo(circleBox.x + circleBox.width / 2, 1);
      expect(iconBox.y + iconBox.height / 2).toBeCloseTo(circleBox.y + circleBox.height / 2, 1);

      const cards = page.getByRole("region", { name: "Choice cards" });
      await cards.getByText("For growing businesses.", { exact: true }).click();
      await expect(cards.locator('input[value="pro"]')).toBeChecked();
      await cards.locator('[data-slot="radio-group-item"]').last().click();
      await expect(cards.locator('input[value="enterprise"]')).toBeChecked();
      await cards.getByText("Plus", { exact: true }).click();
      await expect(cards.locator('input[value="plus"]')).toBeChecked();
    });
  }
}

for (const mode of ["controlled", "uncontrolled"]) {
  test(`${mode}: circle, label, keyboard and form behavior`, async ({ page }) => {
    await page.goto(`/tests/browser/radio-group.html?mode=${mode}`);
    const form = page.locator("form");
    const first = form.getByRole("radio", { name: "First", exact: true });
    const last = form.getByRole("radio", { name: "Last", exact: true });
    const disabled = form.getByRole("radio", { name: "Disabled item" });
    const changes = form.getByLabel("Change count");
    await expect(first).toBeChecked();
    await expect(disabled).toBeDisabled();
    await form.locator('[data-slot="radio-group-item"]').last().click();
    await expect(last).toBeChecked();
    await expect(last).toBeFocused();
    await expect(changes).toHaveText("1");
    await form.locator('[data-slot="radio-group-item"]').last().click();
    await expect(last).toBeChecked();
    await expect(changes).toHaveText("1");
    await form.getByText("First", { exact: true }).click();
    await expect(first).toBeChecked();
    await expect(changes).toHaveText("2");
    await form.locator('[data-slot="radio-group-item"]').nth(1).click();
    // Send a physical click even though Playwright knows the associated input is disabled.
    await form.getByText("Disabled item", { exact: true }).click({ force: true });
    await expect(first).toBeChecked();
    await expect(disabled).not.toBeChecked();
    await expect(changes).toHaveText("2");
    await first.focus();
    await first.press("ArrowDown");
    await expect(last).toBeChecked();
    await expect(last).toBeFocused();
    await last.press("ArrowDown");
    await expect(first).toBeChecked();
    await first.press("ArrowUp");
    await expect(last).toBeChecked();
    await last.press("Space");
    await expect(last).toBeChecked();
    await form.getByRole("button", { name: "Submit" }).click();
    await expect(form.getByLabel("Submitted value")).toHaveText("last");
  });

  for (const state of ["disabled", "readonly"]) {
    test(`${mode} ${state}: circles, labels and keyboard cannot change selection`, async ({
      page,
    }) => {
      await page.goto(`/tests/browser/radio-group.html?mode=${mode}&${state}`);
      const form = page.locator("form");
      const first = form.getByRole("radio", { name: "First", exact: true });
      const last = form.getByRole("radio", { name: "Last", exact: true });
      if (state === "disabled") await expect(last).toBeDisabled();
      await form
        .locator('[data-slot="radio-group-item"]')
        .last()
        .click({ force: state === "disabled" });
      await form.getByText("Last", { exact: true }).click({ force: state === "disabled" });
      await last.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowUp");
      await expect(first).toBeChecked();
      await expect(last).not.toBeChecked();
      await expect(form.getByLabel("Change count")).toHaveText("0");
    });
  }
}
