import { expect, type Locator, test } from "@playwright/test";

async function appearance(track: Locator) {
  return track.evaluate(async (element) => {
    // Flush pending styles, then wait for the real CSS transitions to settle.
    getComputedStyle(element).backgroundColor;
    await Promise.all(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
    const thumb = element.querySelector('[data-slot="switch-thumb"]');
    if (!thumb) throw new Error("Switch thumb is missing");
    const rootStyle = getComputedStyle(element);
    const thumbStyle = getComputedStyle(thumb);
    return {
      background: rootStyle.backgroundColor,
      border: rootStyle.borderTopColor,
      thumb: thumbStyle.backgroundColor,
      translate: thumbStyle.translate,
      thumbOffset: thumb.getBoundingClientRect().left - element.getBoundingClientRect().left,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    };
  });
}

for (const style of ["vega", "nova", "lyra", "maia", "mira", "luma", "rhea", "sera"]) {
  for (const theme of ["light", "dark"]) {
    for (const size of ["default", "sm"]) {
      for (const mode of ["controlled", "uncontrolled"]) {
        test(`${style} ${theme} ${size} ${mode}: appearance and interactions`, async ({ page }) => {
          await page.goto(`?${new URLSearchParams({ style, theme, size, mode })}`);
          const input = page.getByRole("switch", { name: "Airplane Mode", exact: true });
          const track = page.locator('[data-slot="switch"]').first();
          const control = track.locator('[data-slot="switch-control"]');
          await expect(input).not.toBeChecked();

          // Resolve the intended palette tokens in the browser's color space.
          const colors = await page.evaluate(
            ({ style, theme }) => {
              const probe = document.createElement("div");
              document.body.append(probe);
              const color = (value: string) => {
                probe.style.backgroundColor = value;
                return getComputedStyle(probe).backgroundColor;
              };
              const rounded = style === "luma" || style === "rhea";
              const result = {
                off: color(
                  rounded
                    ? "color-mix(in oklab, var(--input) 90%, transparent)"
                    : theme === "dark" && style !== "sera"
                      ? "color-mix(in oklab, var(--input) 80%, transparent)"
                      : "var(--input)",
                ),
                on: color("var(--primary)"),
                offThumb: color(theme === "dark" ? "var(--foreground)" : "var(--background)"),
                onThumb: color(
                  theme === "dark" ? "var(--primary-foreground)" : "var(--background)",
                ),
                offBorder: color(
                  style === "sera"
                    ? "color-mix(in oklab, var(--input) 50%, transparent)"
                    : "transparent",
                ),
                onBorder: color(rounded || style === "sera" ? "var(--primary)" : "transparent"),
              };
              probe.remove();
              return result;
            },
            { style, theme },
          );

          const off = await appearance(track);
          expect(off).toMatchObject({
            background: colors.off,
            border: colors.offBorder,
            thumb: colors.offThumb,
            translate: style === "sera" ? "1px" : "0px",
          });
          const dimensions =
            style === "luma"
              ? size === "sm"
                ? [28, 16]
                : [44, 20]
              : style === "rhea"
                ? size === "sm"
                  ? [24, 16]
                  : [32, 20]
                : style === "sera"
                  ? size === "sm"
                    ? [25, 14]
                    : [33, 18]
                  : size === "sm"
                    ? [24, 14]
                    : style === "mira"
                      ? [28, 16.6]
                      : [32, 18.4];
          expect(off.width).toBeCloseTo(dimensions[0], 1);
          expect(off.height).toBeCloseTo(dimensions[1], 1);

          await control.click();
          await expect(input).toBeChecked();
          const on = await appearance(track);
          expect(on).toMatchObject({
            background: colors.on,
            border: colors.onBorder,
            thumb: colors.onThumb,
          });
          expect(on.thumbOffset).toBeGreaterThan(off.thumbOffset);

          await page.getByText("Airplane Mode", { exact: true }).click();
          await expect(input).not.toBeChecked();
          expect(await appearance(track)).toEqual(off);

          await input.focus();
          await input.press("Space");
          await expect(input).toBeChecked();
          await input.press("Space");
          await expect(input).not.toBeChecked();
          expect(await appearance(track)).toEqual(off);

          for (const [index, checked] of [
            [1, false],
            [2, true],
          ] as const) {
            const disabledTrack = page.locator('[data-slot="switch"]').nth(index);
            const disabledInput = disabledTrack.getByRole("switch");
            await expect(disabledInput).toBeDisabled();
            // A physical click should leave disabled controls in their initial state.
            await disabledTrack.locator('[data-slot="switch-control"]').click({ force: true });
            await expect(disabledInput).toBeChecked({ checked });
            expect((await appearance(disabledTrack)).background).toBe(
              checked ? colors.on : colors.off,
            );
          }
        });
      }
    }
  }
}
