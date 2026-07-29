import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";

type BuiltResponse = {
  status: number;
  body: string;
};

const CANONICAL_DOCS_PATHS = [
  "/docs",
  "/docs/installation",
  "/docs/installation/vite",
  "/docs/installation/astro",
  "/docs/installation/tanstack-start",
  "/docs/installation/tanstack-router",
  "/docs/installation/solid-start",
  "/docs/installation/manual",
  "/docs/customization",
  "/docs/dark-mode",
  "/docs/zaidan-agent",
  "/docs/faq",
  "/docs/roadmap",
  "/docs/changelog",
  "/docs/changelog/image-crop-and-agent-docs",
  "/docs/changelog/sortable-and-design-refresh",
  "/docs/changelog/zaidan-agent",
  "/docs/changelog/launch",
] as const;

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
