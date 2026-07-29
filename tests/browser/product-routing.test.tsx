import { describe, expect, inject, it } from "vitest";
import { commands } from "vitest/browser";
import { LEGACY_REDIRECTS, resolveCompatibilityRedirect } from "@/lib/product-routing";

type BuiltResponse = {
  url: string;
  status: number;
  location: string | null;
  xRobotsTag: string | null;
  canonicalLinks: string[];
  body: string;
};

const requestBuiltRoutes = (urls: string[]) =>
  (
    commands as unknown as {
      requestBuiltRoutes: (urls: string[]) => Promise<BuiltResponse[]>;
    }
  ).requestBuiltRoutes(urls);

describe("built canonical routing", () => {
  it("serves all five Product Surface roots without a broad fallback", async () => {
    const base = inject("builtAppUrl");
    const paths = ["/", "/docs", "/components", "/charts", "/create"];
    const responses = await requestBuiltRoutes(paths.map((path) => new URL(path, base).href));

    for (const [index, response] of responses.entries()) {
      expect(response.status, paths[index]).toBe(200);
      expect(response.body, paths[index]).not.toContain("404 - Not Found");
    }
    expect(responses[1]?.body).toContain('data-product-surface="docs"');
    expect(responses[2]?.body).toContain('data-product-surface="components"');
    expect(responses[3]?.body).toContain('data-product-surface="charts"');
    expect(responses[4]?.body).toContain('data-product-surface="create"');

    const unknown = await requestBuiltRoutes([new URL("/not-allowlisted", base).href]);
    expect(unknown[0]?.status).toBe(404);
  });

  it("serves or rejects canonical Preview requests at the route boundary", async () => {
    const base = inject("builtAppUrl");
    const cases = [
      ["/preview/components/button#variants--sizes", 200],
      ["/preview/blocks/image-crop#avatar-crop", 200],
      ["/preview/create", 200],
      ["/preview/create?preset=v1-A", 200],
      ["/preview/components/button?style=nova", 404],
      ["/preview/components/unknown", 404],
      ["/preview/blocks/unknown", 404],
      ["/preview/charts/unknown", 404],
      ["/preview/create?preset=v1-0", 404],
      ["/preview/create?style=nova", 404],
    ] as const;
    const responses = await requestBuiltRoutes(cases.map(([path]) => new URL(path, base).href));

    for (const [index, response] of responses.entries()) {
      expect(response.status, cases[index]?.[0]).toBe(cases[index]?.[1]);
    }

    const canonicalPaths = [
      "/components/button",
      "/components/blocks/image-crop",
      "/create",
      "/create",
    ];
    for (const [index, response] of responses.slice(0, canonicalPaths.length).entries()) {
      expect(response.xRobotsTag).toBe("noindex, follow");
      expect(response.canonicalLinks).toContain(
        new URL(canonicalPaths[index] as string, "https://zaidan.carere.dev").href,
      );
    }
  });

  it("returns every allowlisted compatibility redirect as a permanent one-hop response", async () => {
    const base = inject("builtAppUrl");
    const sources = LEGACY_REDIRECTS.map(({ source }) => `${source}?keep=1&style=nova`);
    const responses = await requestBuiltRoutes(sources.map((source) => new URL(source, base).href));

    const destinations: string[] = [];
    for (const [index, response] of responses.entries()) {
      const source = sources[index] as string;
      const expected = resolveCompatibilityRedirect(source);
      expect(response.status, source).toBe(308);
      expect(response.location, source).toBe(expected);
      if (response.location) destinations.push(new URL(response.location, base).href);
    }

    const finalResponses = await requestBuiltRoutes(destinations);
    for (const [index, response] of finalResponses.entries()) {
      expect(
        response.status,
        `${destinations[index]} redirected more than once to ${response.location}`,
      ).toBe(200);
      expect(response.location, `${destinations[index]} redirected more than once`).toBeNull();
    }
  });
});
