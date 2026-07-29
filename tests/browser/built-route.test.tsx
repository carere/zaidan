import { render } from "solid-js/web";
import { afterEach, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

it("drives and captures a built route with its same-origin Preview", async () => {
  const builtAppUrl = inject("builtAppUrl");
  let resolveLoaded: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });

  dispose = render(
    () => (
      <iframe
        src={builtAppUrl}
        style={{ width: "1280px", height: "900px" }}
        title="Built Zaidan route"
        onLoad={() => resolveLoaded?.()}
      />
    ),
    document.body,
  );

  const route = page.getByTitle("Built Zaidan route");
  await expect.element(route).toBeVisible();
  await loaded;

  const { inspectBuiltRoute } = commands as unknown as {
    inspectBuiltRoute: () => Promise<{
      heading: string | null;
      previewPath: string | null;
    }>;
  };
  const evidence = await inspectBuiltRoute();
  const capture = await route.screenshot({ save: false });

  expect(evidence.heading).toBe("The best foundation for your next SolidJS project");
  expect(evidence.previewPath).toMatch(/^\/preview\/home(?:\?|$)/);
  expect(capture.length).toBeGreaterThan(1_000);
});
