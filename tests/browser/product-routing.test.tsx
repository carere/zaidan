import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";
import { Example } from "@/components/example";
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

async function renderProductRoute(pathname: string, width: number, height: number) {
  let resolveLoaded: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });
  dispose = render(
    () => (
      <iframe
        src={new URL(pathname, inject("builtAppUrl")).href}
        style={{ width: `${width}px`, height: `${height}px` }}
        title="Product Header route"
        onLoad={() => resolveLoaded?.()}
      />
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Product Header route")).toBeVisible();
  await loaded;
}

async function inspectHomeShowcase(width: number, colorMode: "light" | "dark" = "light") {
  await renderProductRoute("/", width, 900);
  const { inspectHomeShowcase: inspect } = commands as unknown as {
    inspectHomeShowcase: (colorMode: "light" | "dark") => Promise<{
      columnCount: number;
      content: string[];
      fadeCount: number;
      iframeCount: number;
      installCommand: string | null;
      mobileArtworkCount: number;
      mobileArtworkSource: string | null;
      mobileControlCount: number;
      nativeShowcaseVisible: boolean;
      overflow: number;
      pathname: string;
      search: string;
    }>;
  };
  return inspect(colorMode);
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
  it.each([
    [768, 2, "light"],
    [1024, 3, "light"],
    [1440, 4, "light"],
    [1440, 4, "dark"],
  ] as const)("renders %s px Home as a native %s-column showcase in %s mode", async (width, columnCount, colorMode) => {
    const evidence = await inspectHomeShowcase(width, colorMode);

    expect(evidence.nativeShowcaseVisible).toBe(true);
    expect(evidence.columnCount).toBe(columnCount);
    expect(evidence.fadeCount).toBe(2);
    expect(evidence.mobileArtworkCount).toBe(0);
    expect(evidence.iframeCount).toBe(0);
    expect(evidence.content).toEqual([
      "Registry pulse",
      "Design Configuration",
      "Components in this surface",
      "Latest release",
      "Contributors",
      "Create a project",
      "Community",
      "Calendar",
      "Catalog coverage",
      "Install from the registry",
    ]);
    expect(evidence.installCommand).toBe(
      "bunx shadcn@latest add https://zaidan.dev/r/kobalte/button.json",
    );
    expect(evidence.overflow).toBeLessThanOrEqual(0);
    expect(evidence.pathname).toBe("/");
    expect(evidence.search).toBe("");
  });

  it.each([
    "light",
    "dark",
  ] as const)("renders deterministic %s mobile artwork without live controls", async (colorMode) => {
    const evidence = await inspectHomeShowcase(390, colorMode);

    expect(evidence.nativeShowcaseVisible).toBe(false);
    expect(evidence.columnCount).toBe(0);
    expect(evidence.fadeCount).toBe(0);
    expect(evidence.mobileArtworkCount).toBe(1);
    expect(evidence.mobileArtworkSource).toContain(`home-showcase-${colorMode}.svg`);
    expect(evidence.mobileControlCount).toBe(0);
    expect(evidence.iframeCount).toBe(0);
    expect(evidence.overflow).toBeLessThanOrEqual(0);
  });

  it("copies the Home install command with keyboard focus and preserves the URL", async () => {
    await renderProductRoute("/", 1440, 900);
    const { exerciseHomeInstallCopy } = commands as unknown as {
      exerciseHomeInstallCopy: () => Promise<{
        copiedText: string;
        focusedLabel: string | null;
        liveStatus: string | null;
        pathname: string;
        search: string;
      }>;
    };
    const evidence = await exerciseHomeInstallCopy();

    expect(evidence.copiedText).toBe(
      "bunx shadcn@latest add https://zaidan.dev/r/kobalte/button.json",
    );
    expect(evidence.focusedLabel).toBe("Copy install command");
    expect(evidence.liveStatus).toBe("Install command copied");
    expect(evidence.pathname).toBe("/");
    expect(evidence.search).toBe("");
  });

  it("renders the complete desktop Product Header and measures its sticky offset", async () => {
    await renderProductRoute("/components/button", 1440, 900);
    const { inspectDesktopProductHeader } = commands as unknown as {
      inspectDesktopProductHeader: () => Promise<{
        surfaces: string[];
        activeSurface: string | null;
        searchVisible: boolean;
        githubVisible: boolean;
        modeVisible: boolean;
        createVisible: boolean;
        headerHeight: number;
        offset: number;
      }>;
    };
    const evidence = await inspectDesktopProductHeader();

    expect(evidence.surfaces).toEqual(["Home", "Docs", "Components", "Charts", "Create"]);
    expect(evidence.activeSurface).toBe("Components");
    expect(evidence.searchVisible).toBe(true);
    expect(evidence.githubVisible).toBe(true);
    expect(evidence.modeVisible).toBe(true);
    expect(evidence.createVisible).toBe(true);
    expect(evidence.headerHeight).toBeGreaterThan(0);
    expect(evidence.offset).toBe(evidence.headerHeight);
  });

  it("keeps compact controls available and traps, restores, and moves mobile focus", async () => {
    await renderProductRoute("/components/button#examples", 390, 844);
    const { exerciseMobileProductHeader } = commands as unknown as {
      exerciseMobileProductHeader: () => Promise<{
        compactSearchVisible: boolean;
        modeVisible: boolean;
        mobileCreateVisible: boolean;
        hierarchyVisible: boolean;
        focusTrapped: boolean;
        restoredLabel: string | null;
        shortcutLabel: string | null;
        commandShortcutLabel: string | null;
        selectedFocusId: string | null;
        selectedFocusTag: string | null;
        selectedFocusText: string | null;
        selectedHash: string;
        postSelectionRestoredLabel: string | null;
        reducedMotionDuration: string;
      }>;
    };
    const evidence = await exerciseMobileProductHeader();

    expect(evidence.compactSearchVisible).toBe(true);
    expect(evidence.modeVisible).toBe(true);
    expect(evidence.mobileCreateVisible).toBe(true);
    expect(evidence.hierarchyVisible).toBe(true);
    expect(evidence.focusTrapped).toBe(true);
    expect(evidence.restoredLabel).toBe("Open Product menu");
    expect(evidence.shortcutLabel).toBe("Open Command Search");
    expect(evidence.commandShortcutLabel).toBe("Open Command Search");
    expect(evidence.selectedFocusId).toBe("");
    expect(evidence.selectedFocusTag).toBe("H1");
    expect(evidence.selectedFocusText).toBe("Button");
    expect(evidence.selectedHash).toBe("#examples");
    expect(evidence.postSelectionRestoredLabel).toBe("Open Product menu");
    expect(evidence.reducedMotionDuration).toBe("0s");
  });

  it("keeps derived Preview anchor identities reactive", async () => {
    const [title, setTitle] = createSignal("First title");
    const [anchor, setAnchor] = createSignal<string>();
    dispose = render(
      () => (
        <Example title={title()} anchor={anchor()} data-testid="reactive-preview-anchor">
          Preview
        </Example>
      ),
      document.body,
    );
    const example = page.getByTestId("reactive-preview-anchor");

    await expect.element(example).toHaveAttribute("id", "first-title");
    await expect.element(example).toHaveAttribute("data-preview-anchor", "first-title");

    setTitle("Updated title");
    await expect.element(example).toHaveAttribute("id", "updated-title");
    await expect.element(example).toHaveAttribute("data-preview-anchor", "updated-title");

    setAnchor("authored-anchor");
    await expect.element(example).toHaveAttribute("id", "authored-anchor");
    await expect.element(example).toHaveAttribute("data-preview-anchor", "authored-anchor");

    setAnchor(undefined);
    await expect.element(example).toHaveAttribute("id", "updated-title");
    await expect.element(example).toHaveAttribute("data-preview-anchor", "updated-title");
  });

  it("serves all five Product Surface roots without a broad fallback", async () => {
    const base = inject("builtAppUrl");
    const paths = ["/", "/docs", "/components", "/charts", "/create"];
    const responses = await requestBuiltRoutes(paths.map((path) => new URL(path, base).href));

    for (const [index, response] of responses.entries()) {
      expect(response.status, paths[index]).toBe(200);
      expect(response.body, paths[index]).not.toContain("404 - Not Found");
    }
    expect(responses[0]?.body).toContain('data-product-surface="home"');
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

  it("keeps legacy Component and Block Preview renderers available until contraction", async () => {
    const base = inject("builtAppUrl");
    const paths = ["/preview/ui/kobalte/button", "/preview/blocks/kobalte/image-crop"];
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
      ["/preview/home?style=nova&keep=1", "/?keep=1"],
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
