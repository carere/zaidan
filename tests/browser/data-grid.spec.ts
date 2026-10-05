import { expect, test } from "@playwright/test";

const viewportSelector = '[data-slot="data-grid-scroll-area"] [data-slot="scroll-area-viewport"]';

test("wheel over an unconstrained grid scrolls the page", async ({ page }) => {
  await page.goto("/tests/browser/data-grid.html");
  const viewport = page.locator(viewportSelector);
  await expect(viewport).toBeVisible();
  expect(await viewport.evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0);
  await viewport.hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  expect(await viewport.evaluate((el) => el.scrollTop)).toBe(0);
});

test("vertical touch drag starting on a row scrolls the page", async ({ page, context }) => {
  await page.goto("/tests/browser/data-grid.html");
  const viewport = page.locator(viewportSelector);
  await expect(viewport).toBeVisible();
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Grid viewport is missing");
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const before = await page.evaluate(() => scrollY);
  await session.send("Input.synthesizeScrollGesture", {
    x: box.x + 40,
    y: box.y + 100,
    yDistance: -120,
    speed: 600,
    gestureSourceType: "touch",
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  expect(await viewport.evaluate((el) => el.scrollTop)).toBe(0);
  await session.detach();
});

for (const edge of ["left", "right"] as const) {
  test(`horizontal scrolling stays inside the grid at its ${edge} edge`, async ({ page }) => {
    await page.goto("/tests/browser/data-grid.html");
    const viewport = page.locator(viewportSelector);
    await expect(viewport).toBeVisible();
    expect(await viewport.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);
    await page.evaluate(() => scrollTo(100, 100));
    await viewport.hover();
    await page.mouse.wheel(40, 0);
    await expect.poll(() => viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await viewport.evaluate((el, edge) => {
      el.scrollLeft = edge === "right" ? el.scrollWidth : 0;
    }, edge);
    const before = await page.evaluate(() => scrollX);
    expect(before).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeGreaterThan(before);
    // Let the previous wheel sequence finish before starting an edge gesture.
    await page.waitForTimeout(350);
    await page.mouse.wheel(edge === "right" ? 120 : -120, 0);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => scrollX)).toBe(before);
    expect(await viewport.evaluate((el) => getComputedStyle(el).overscrollBehaviorX)).toBe(
      "contain",
    );
  });
}

for (const edge of ["top", "bottom"] as const) {
  test(`height-constrained grid scrolls internally and chains at its ${edge} edge`, async ({
    page,
  }) => {
    await page.goto("/tests/browser/data-grid.html?constrained");
    const viewport = page.locator(viewportSelector);
    await expect(viewport).toBeVisible();
    expect(await viewport.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(40);
    await page.evaluate(() => scrollTo(0, 100));
    await viewport.hover();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 40);
    await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await viewport.evaluate((el, edge) => {
      el.scrollTop = edge === "bottom" ? el.scrollHeight : 0;
    }, edge);
    await page.waitForTimeout(350);
    await page.mouse.wheel(0, edge === "bottom" ? 60 : -60);
    if (edge === "bottom") {
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    } else {
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before);
    }
    expect(await viewport.evaluate((el) => el.scrollTop)).toBe(
      await viewport.evaluate(
        (el, edge) => (edge === "bottom" ? el.scrollHeight - el.clientHeight : 0),
        edge,
      ),
    );
  });
}
