import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";
import { LEGACY_REDIRECTS } from "@/lib/product-routing";

type BuiltResponse = {
  url: string;
  status: number;
  location: string | null;
  xRobotsTag: string | null;
  canonicalLinks: string[];
  body: string;
};

type NavigationEvidence = {
  pathname: string;
  search: string;
  hash: string;
  redirectCount: number;
};

const requestBuiltRoutes = (urls: string[]) =>
  (
    commands as unknown as {
      requestBuiltRoutes: (urls: string[]) => Promise<BuiltResponse[]>;
    }
  ).requestBuiltRoutes(urls);

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

async function renderCanonicalPreview(pathname: string) {
  dispose = render(
    () => (
      <iframe
        src={new URL(pathname, inject("builtAppUrl")).href}
        style={{ width: "1280px", height: "900px" }}
        title="Canonical Preview route"
      />
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Canonical Preview route")).toBeVisible();
}

async function renderSidebarCompatibilityNavigations() {
  const base = inject("builtAppUrl");
  dispose = render(
    () => (
      <>
        <iframe src={new URL("/ui/sidebar-inset", base).href} title="Sidebar default navigation" />
        <iframe
          src={new URL("/ui/sidebar-inset?keep=1#props", base).href}
          title="Sidebar fragment navigation"
        />
      </>
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Sidebar default navigation")).toBeVisible();
  await expect.element(page.getByTitle("Sidebar fragment navigation")).toBeVisible();
}

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

  it("focuses the exact accepted duplicate-suffixed Preview fragment", async () => {
    await renderCanonicalPreview("/preview/components/button#examples-1");
    const { inspectCanonicalPreview } = commands as unknown as {
      inspectCanonicalPreview: () => Promise<{
        activeId: string | null;
        iframeCount: number;
        hash: string;
        exampleIds: string[];
      }>;
    };
    const evidence = await inspectCanonicalPreview();

    expect(evidence.iframeCount).toBe(1);
    expect(evidence.hash).toBe("#examples-1");
    expect(evidence.exampleIds).toContain("examples-1");
    expect(evidence.activeId).toBe("examples-1");
  });

  it("maps a reordered Preview catalog by example identity", async () => {
    await renderCanonicalPreview("/preview/components/item#as-link");
    const { inspectCanonicalPreview } = commands as unknown as {
      inspectCanonicalPreview: () => Promise<{
        activeId: string | null;
        activeTitle: string | null;
      }>;
    };
    const evidence = await inspectCanonicalPreview();

    expect(evidence.activeId).toBe("as-link");
    expect(evidence.activeTitle).toBe("As Link");
  });

  it.each([
    {
      path: "/preview/components/aspect-ratio#16--9",
      anchor: "16--9",
      title: "16:9",
    },
    {
      path: "/preview/components/item#itemmedia-with-image",
      anchor: "itemmedia-with-image",
      title: "Default - ItemMedia image",
    },
    {
      path: "/preview/components/sidebar#basic",
      anchor: "basic",
      title: null,
    },
  ])("focuses the explicit $anchor Preview anchor contract", async ({ path, anchor, title }) => {
    await renderCanonicalPreview(path);
    const { inspectCanonicalPreview } = commands as unknown as {
      inspectCanonicalPreview: () => Promise<{
        activeId: string | null;
        activeIdentity: string | null;
        activeTitle: string | null;
      }>;
    };
    const evidence = await inspectCanonicalPreview();

    expect(evidence.activeId).toBe(anchor);
    expect(evidence.activeIdentity).toBe(anchor);
    if (title) expect(evidence.activeTitle).toBe(title);
  });

  it("preserves real Sidebar navigation fragments ahead of the default anchor", async () => {
    await renderSidebarCompatibilityNavigations();
    const { inspectSidebarCompatibilityNavigations } = commands as unknown as {
      inspectSidebarCompatibilityNavigations: () => Promise<{
        defaultNavigation: NavigationEvidence;
        fragmentNavigation: NavigationEvidence;
      }>;
    };
    const evidence = await inspectSidebarCompatibilityNavigations();

    expect(evidence.defaultNavigation).toEqual({
      pathname: "/components/sidebar",
      search: "",
      hash: "#sidebar-inset",
      redirectCount: 1,
    });
    expect(evidence.fragmentNavigation).toEqual({
      pathname: "/components/sidebar",
      search: "?keep=1",
      hash: "#props",
      redirectCount: 1,
    });
  });

  it("keeps legacy Preview renderers available beside canonical Preview routes", async () => {
    const base = inject("builtAppUrl");
    const paths = [
      "/preview/ui/kobalte/button",
      "/preview/blocks/kobalte/image-crop",
      "/preview/home",
    ];
    const responses = await requestBuiltRoutes(paths.map((path) => new URL(path, base).href));

    for (const [index, response] of responses.entries()) {
      expect(response.status, paths[index]).toBe(200);
      expect(response.location, paths[index]).toBeNull();
    }
  });

  it("returns every allowlisted compatibility redirect as a permanent one-hop response", async () => {
    const base = inject("builtAppUrl");
    const fixedCases = [
      ["/installation/astro?source=legacy", "/docs/installation/astro?source=legacy"],
      ["/ui/button/docs?source=legacy", "/components/button?source=legacy"],
      ["/ui/sidebar-inset", "/components/sidebar?_zaidan_legacy_anchor=sidebar-inset"],
      ["/blocks/sortable/docs?style=nova&keep=1", "/components/blocks/sortable?keep=1"],
      ["/changelog", "/docs/changelog"],
    ] as const;
    const fixedResponses = await requestBuiltRoutes(
      fixedCases.map(([source]) => new URL(source, base).href),
    );
    for (const [index, response] of fixedResponses.entries()) {
      expect(response.status, fixedCases[index]?.[0]).toBe(308);
      expect(response.location, fixedCases[index]?.[0]).toBe(fixedCases[index]?.[1]);
    }

    const sources = LEGACY_REDIRECTS.map(({ source }) => `${source}?keep=1&style=nova`);
    const responses = await requestBuiltRoutes(sources.map((source) => new URL(source, base).href));

    const destinations: string[] = [];
    for (const [index, response] of responses.entries()) {
      const source = sources[index] as string;
      expect(response.status, source).toBe(308);
      expect(response.location, source).not.toBeNull();
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
