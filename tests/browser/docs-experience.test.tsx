import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";

type BuiltResponse = {
  status: number;
  body: string;
};

const CANONICAL_DOCS_CASES = [
  ["/docs", "docs/introduction", "Build from a shared foundation"],
  ["/docs/installation", "docs/installation", "Pick Your Framework"],
  ["/docs/installation/vite", "docs/installation/vite", "Set up Vite"],
  ["/docs/installation/astro", "docs/installation/astro", "Set up Astro"],
  [
    "/docs/installation/tanstack-start",
    "docs/installation/tanstack-start",
    "Set up TanStack Start",
  ],
  [
    "/docs/installation/tanstack-router",
    "docs/installation/tanstack-router",
    "Set up TanStack Router",
  ],
  ["/docs/installation/solid-start", "docs/installation/solid-start", "Set up Solid Start"],
  ["/docs/installation/manual", "docs/installation/manual", "Install manually"],
  ["/docs/customization", "docs/customization", "Colors & base colors"],
  ["/docs/dark-mode", "docs/dark-mode", "Automatic Detection & SSR"],
  ["/docs/zaidan-agent", "docs/zaidan-agent", "Port From a shadcn-Compatible Registry"],
  ["/docs/faq", "docs/faq", "Why does this project exist ?"],
  ["/docs/roadmap", "docs/roadmap", "Enrich the Registry with More Blocks and Components"],
  ["/docs/changelog", "docs/changelog", "Follow what changed"],
  [
    "/docs/changelog/image-crop-and-agent-docs",
    "changelog/image-crop-and-agent-docs",
    "This update is focused on two things:",
  ],
  [
    "/docs/changelog/sortable-and-design-refresh",
    "changelog/sortable-and-design-refresh",
    "Three updates land together this month",
  ],
  ["/docs/changelog/zaidan-agent", "changelog/zaidan-agent", "The first stable release of"],
  [
    "/docs/changelog/launch",
    "changelog/launch",
    "Zaidan is now live: a SolidJS component registry",
  ],
] as const;

const CANONICAL_DOCS_PATHS = CANONICAL_DOCS_CASES.map(([path]) => path);

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

async function renderDocsRoute(pathname: string, width: number, height: number) {
  let resolveLoaded: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });
  dispose = render(
    () => (
      <iframe
        src={new URL(pathname, inject("builtAppUrl")).href}
        style={{ width: `${width}px`, height: `${height}px` }}
        title="Canonical Docs route"
        onLoad={() => resolveLoaded?.()}
      />
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Canonical Docs route")).toBeVisible();
  await loaded;
}

describe("canonical Docs experience", () => {
  it("renders one authored document in the approved desktop shell", async () => {
    await renderDocsRoute("/docs/installation/vite", 1440, 900);
    const { inspectDesktopDocs } = commands as unknown as {
      inspectDesktopDocs: () => Promise<{
        canonicalPath: string | null;
        h1: string[];
        authoredCount: number;
        authoredHeading: string | null;
        leftRailVisible: boolean;
        rightTocVisible: boolean;
        readingWidth: number;
        activeNavigation: string | null;
        activeItemVisible: boolean;
        tocItems: string[];
        landmarkLabels: string[];
      }>;
    };
    const evidence = await inspectDesktopDocs();

    expect(evidence.canonicalPath).toBe("/docs/installation/vite");
    expect(evidence.h1).toEqual(["Vite"]);
    expect(evidence.authoredCount).toBe(1);
    expect(evidence.authoredHeading).toBe("Set up Vite");
    expect(evidence.leftRailVisible).toBe(true);
    expect(evidence.rightTocVisible).toBe(true);
    expect(evidence.readingWidth).toBeLessThanOrEqual(640);
    expect(evidence.activeNavigation).toBe("Vite");
    expect(evidence.activeItemVisible).toBe(true);
    expect(evidence.tocItems).toContain("Run the CLI");
    expect(evidence.landmarkLabels).toEqual(
      expect.arrayContaining(["Docs hierarchy", "Table of contents", "Adjacent Docs pages"]),
    );
  });

  it("reveals the active item on an initial deep Changelog load", async () => {
    await renderDocsRoute("/docs/changelog/launch", 1024, 320);
    const { inspectInitialDeepDocs } = commands as unknown as {
      inspectInitialDeepDocs: () => Promise<{
        activeNavigation: string | null;
        activeItemVisible: boolean;
        railScrollTop: number;
      }>;
    };
    const evidence = await inspectInitialDeepDocs();

    expect(evidence.activeNavigation).toBe("February 2026 — Zaidan Launch");
    expect(evidence.activeItemVisible).toBe(true);
    expect(evidence.railScrollTop).toBeGreaterThan(0);
  });

  it("focuses TOC fragments and route headings while traversing boundaries", async () => {
    await renderDocsRoute("/docs/installation/vite", 1440, 900);
    const { exerciseDocsNavigation } = commands as unknown as {
      exerciseDocsNavigation: () => Promise<{
        tocHash: string;
        tocFocus: string | null;
        nextPath: string;
        nextFocus: string | null;
        collapsed: string | null;
        persistedGroups: string[];
        restoredCollapsed: string | null;
        motionBehavior: ScrollBehavior;
      }>;
    };
    const evidence = await exerciseDocsNavigation();

    expect(evidence.tocHash).toBe("#run-the-cli");
    expect(evidence.tocFocus).toBe("run-the-cli");
    expect(evidence.nextPath).toBe("/docs/installation/astro");
    expect(evidence.nextFocus).toBe("Astro");
    expect(evidence.collapsed).toBe("false");
    expect(evidence.persistedGroups).not.toContain("guides");
    expect(evidence.restoredCollapsed).toBe("false");
    expect(evidence.motionBehavior).toBe("auto");
  });

  it("uses one mobile reading column with Product Header hierarchy and collapsible TOC", async () => {
    await renderDocsRoute("/docs/dark-mode", 390, 844);
    const { exerciseMobileDocs } = commands as unknown as {
      exerciseMobileDocs: () => Promise<{
        leftRailVisible: boolean;
        rightTocVisible: boolean;
        horizontalOverflow: boolean;
        mobileTocVisible: boolean;
        tocClosedAfterSelection: boolean;
        focusedSection: string | null;
        menuGroups: string[];
        activeMenuItem: string | null;
      }>;
    };
    const evidence = await exerciseMobileDocs();

    expect(evidence.leftRailVisible).toBe(false);
    expect(evidence.rightTocVisible).toBe(false);
    expect(evidence.horizontalOverflow).toBe(false);
    expect(evidence.mobileTocVisible).toBe(true);
    expect(evidence.tocClosedAfterSelection).toBe(true);
    expect(evidence.focusedSection).toBe("quick-start");
    expect(evidence.menuGroups).toEqual(["Getting Started", "Installation", "Guides", "Changelog"]);
    expect(evidence.activeMenuItem).toBe("Dark Mode");
  });

  it("passes automated WCAG accessibility validation on desktop and mobile", async () => {
    const { auditDocsAccessibility } = commands as unknown as {
      auditDocsAccessibility: () => Promise<
        { id: string; impact: string | null; targets: string[][] }[]
      >;
    };

    await renderDocsRoute("/docs", 1440, 900);
    const desktopViolations = await auditDocsAccessibility();
    expect(desktopViolations).toEqual([]);

    dispose?.();
    dispose = undefined;
    await renderDocsRoute("/docs/changelog", 390, 844);
    const mobileViolations = await auditDocsAccessibility();
    expect(mobileViolations).toEqual([]);
  });

  it("server-renders every canonical Docs source exactly once", async () => {
    const requestBuiltRoutes = (
      commands as unknown as {
        requestBuiltRoutes: (urls: string[]) => Promise<BuiltResponse[]>;
      }
    ).requestBuiltRoutes;
    const base = inject("builtAppUrl");
    const responses = await requestBuiltRoutes(
      CANONICAL_DOCS_PATHS.map((path) => new URL(path, base).href),
    );

    for (const [index, response] of responses.entries()) {
      const path = CANONICAL_DOCS_PATHS[index];
      expect(response.status, path).toBe(200);
      expect(response.body.match(/data-authored-docs-content/g)?.length, path).toBe(1);
      expect(response.body, path).toContain(`data-canonical-route="${path}"`);
    }
  });

  it("renders each route's authored source and sentinel exactly once", async () => {
    const { inspectCanonicalDocsSources } = commands as unknown as {
      inspectCanonicalDocsSources: (routes: { url: string; sentinel: string }[]) => Promise<
        {
          path: string;
          authoredCount: number;
          source: string | null;
          sentinelCount: number;
        }[]
      >;
    };
    const base = inject("builtAppUrl");
    const evidence = await inspectCanonicalDocsSources(
      CANONICAL_DOCS_CASES.map(([path, , sentinel]) => ({
        url: new URL(path, base).href,
        sentinel,
      })),
    );

    expect(evidence).toEqual(
      CANONICAL_DOCS_CASES.map(([path, source]) => ({
        path,
        authoredCount: 1,
        source,
        sentinelCount: 1,
      })),
    );
  });

  it("combines the authored Installation introduction with canonical child cards", async () => {
    await renderDocsRoute("/docs/installation", 1440, 900);
    const { inspectDocsOverview } = commands as unknown as {
      inspectDocsOverview: () => Promise<{
        authoredIntroduction: string | null;
        cardPaths: string[];
        newHeadingCount: number;
      }>;
    };
    const evidence = await inspectDocsOverview();

    expect(evidence.authoredIntroduction).toContain("Get started with Zaidan");
    expect(evidence.cardPaths).toEqual([
      "/docs/installation/vite",
      "/docs/installation/astro",
      "/docs/installation/tanstack-start",
      "/docs/installation/tanstack-router",
      "/docs/installation/solid-start",
      "/docs/installation/manual",
    ]);
    expect(evidence.newHeadingCount).toBe(0);
  });
});
