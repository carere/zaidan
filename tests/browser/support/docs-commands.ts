import axeCore from "axe-core";
import type { Frame } from "playwright";

type DocsCommandContext = {
  provider: {
    getCommandsContext: (sessionId: string) => {
      frame: () => Promise<Frame>;
    };
  };
  sessionId: string;
};

const getCommandFrame = async (context: unknown) => {
  const commandContext = context as DocsCommandContext;
  return commandContext.provider.getCommandsContext(commandContext.sessionId).frame();
};

const getCanonicalDocsTestFrame = async (context: unknown) => {
  const testFrame = await getCommandFrame(context);
  const routeFrame = testFrame.frameLocator('iframe[title="Canonical Docs route"]');
  const shell = routeFrame.locator("[data-docs-shell]");
  await shell.waitFor({ state: "visible" });
  return { testFrame, routeFrame, shell };
};

export const docsBrowserCommands = {
  async inspectCanonicalDocsSources(context: unknown, routes: { url: string; sentinel: string }[]) {
    const testFrame = await getCommandFrame(context);
    const routePage = await testFrame.page().context().newPage();
    try {
      const evidence = [];
      for (const route of routes) {
        await routePage.goto(route.url, { waitUntil: "domcontentloaded" });
        const shell = routePage.locator("[data-docs-shell]");
        await shell.waitFor({ state: "visible" });
        const authored = shell.locator("[data-authored-docs-content]");
        await authored.waitFor({ state: "visible" });
        const content = (await authored.textContent()) ?? "";
        evidence.push({
          path: new URL(route.url).pathname,
          authoredCount: await authored.count(),
          source: await authored.getAttribute("data-authored-source"),
          sentinelCount: content.split(route.sentinel).length - 1,
        });
      }
      return evidence;
    } finally {
      await routePage.close();
    }
  },

  async auditDocsAccessibility(context: unknown, state?: "product-menu" | "on-this-page") {
    const { testFrame, routeFrame, shell } = await getCanonicalDocsTestFrame(context);
    if (state === "product-menu") {
      await routeFrame
        .locator("[data-product-header]")
        .getByRole("button", { name: "Open Product menu" })
        .click();
      await routeFrame.getByRole("dialog").waitFor({ state: "visible" });
    } else if (state === "on-this-page") {
      const mobileToc = shell.locator("[data-mobile-toc]");
      await mobileToc.locator("summary").click();
      await mobileToc.getByRole("link").first().waitFor({ state: "visible" });
    }
    const iframe = await testFrame.locator('iframe[title="Canonical Docs route"]').elementHandle();
    const applicationFrame = await iframe?.contentFrame();
    if (!applicationFrame) throw new TypeError("Canonical Docs frame is unavailable");
    await applicationFrame.addScriptTag({ content: axeCore.source });
    return applicationFrame.evaluate(async () => {
      const axe = (
        window as typeof window & {
          axe: {
            run: (
              root: Document,
              options: { runOnly: { type: "tag"; values: string[] } },
            ) => Promise<{
              violations: {
                id: string;
                impact: string | null;
                nodes: { target: string[] }[];
              }[];
            }>;
          };
        }
      ).axe;
      const results = await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      });
      return results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map(({ target }) => target),
      }));
    });
  },

  async inspectDesktopDocs(context: unknown) {
    const { shell } = await getCanonicalDocsTestFrame(context);
    const article = shell.locator("article");
    const rightToc = shell.locator("[data-docs-right-toc]");
    return {
      canonicalPath: await shell.getAttribute("data-canonical-route"),
      h1: await shell.getByRole("heading", { level: 1 }).allTextContents(),
      authoredCount: await shell.locator("[data-authored-docs-content]").count(),
      authoredHeading: await shell
        .locator("[data-authored-docs-content]")
        .getByRole("heading", { level: 2 })
        .first()
        .textContent(),
      leftRailVisible: await shell.locator("[data-docs-left-rail]").isVisible(),
      rightTocVisible: await rightToc.isVisible(),
      readingWidth: await article.evaluate((element) => element.getBoundingClientRect().width),
      activeNavigation: await shell
        .locator('[data-docs-left-rail] [aria-current="page"]')
        .textContent(),
      activeItemVisible: await shell
        .locator('[data-docs-left-rail] [aria-current="page"]')
        .evaluate((element) => {
          const item = element.getBoundingClientRect();
          const rail = element.closest("nav")?.getBoundingClientRect();
          return Boolean(rail && item.top >= rail.top && item.bottom <= rail.bottom);
        }),
      tocItems: await rightToc.getByRole("link").allTextContents(),
      landmarkLabels: await shell
        .getByRole("navigation")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("aria-label") ?? ""),
        ),
    };
  },

  async inspectInitialDeepDocs(context: unknown) {
    const { shell } = await getCanonicalDocsTestFrame(context);
    const rail = shell.locator('[data-docs-left-rail] nav[aria-label="Docs hierarchy"]');
    const activeItem = rail.locator('[aria-current="page"]');
    await activeItem.waitFor({ state: "visible" });
    await activeItem.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    return {
      activeNavigation: await activeItem.textContent(),
      activeItemVisible: await activeItem.evaluate((element) => {
        const item = element.getBoundingClientRect();
        const navigation = element.closest("nav")?.getBoundingClientRect();
        return Boolean(
          navigation && item.top >= navigation.top && item.bottom <= navigation.bottom,
        );
      }),
      railScrollTop: await rail.evaluate((element) => element.scrollTop),
    };
  },

  async exerciseDocsNavigation(context: unknown) {
    const { testFrame, routeFrame, shell } = await getCanonicalDocsTestFrame(context);
    await testFrame.page().emulateMedia({ reducedMotion: "reduce" });
    await routeFrame.locator("body").evaluate(() => {
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function scrollIntoView(options) {
        document.documentElement.dataset.lastScrollBehavior =
          typeof options === "object" ? (options.behavior ?? "auto") : "auto";
        original.call(this, options);
      };
    });

    await shell
      .locator("[data-docs-right-toc]")
      .getByRole("link", { name: "Run the CLI", exact: true })
      .click();
    const tocHash = await routeFrame.locator("body").evaluate(() => window.location.hash);
    const tocFocus = await routeFrame
      .locator("body")
      .evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? null);
    const motionBehavior = await routeFrame
      .locator("html")
      .getAttribute("data-last-scroll-behavior");

    await shell.getByRole("link", { name: "Next: Astro", exact: true }).click();
    await routeFrame
      .locator('[data-canonical-route="/docs/installation/astro"]')
      .waitFor({ state: "visible" });
    await testFrame.waitForTimeout(100);
    const nextPath = await routeFrame.locator("body").evaluate(() => window.location.pathname);
    const nextFocus = await routeFrame
      .locator("body")
      .evaluate(() => document.activeElement?.textContent?.trim() ?? null);

    const guides = routeFrame
      .locator("[data-docs-left-rail]")
      .getByRole("button", { name: "Guides", exact: true });
    await guides.click();
    const collapsed = await guides.getAttribute("aria-expanded");
    const persistedGroups = await routeFrame
      .locator("body")
      .evaluate(() => JSON.parse(sessionStorage.getItem("zaidan:docs-navigation-groups") ?? "[]"));
    await routeFrame.locator("body").evaluate(() => window.location.reload());
    await routeFrame
      .locator('[data-canonical-route="/docs/installation/astro"]')
      .waitFor({ state: "visible" });
    const restoredCollapsed = await routeFrame
      .locator("[data-docs-left-rail]")
      .getByRole("button", { name: "Guides", exact: true })
      .getAttribute("aria-expanded");

    return {
      tocHash,
      tocFocus,
      nextPath,
      nextFocus,
      collapsed,
      persistedGroups,
      restoredCollapsed,
      motionBehavior,
    };
  },

  async exerciseMobileDocs(context: unknown) {
    const { routeFrame, shell } = await getCanonicalDocsTestFrame(context);
    const leftRailVisible = await shell.locator("[data-docs-left-rail]").isVisible();
    const rightTocVisible = await shell.locator("[data-docs-right-toc]").isVisible();
    const horizontalOverflow = await routeFrame
      .locator("body")
      .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const mobileToc = shell.locator("[data-mobile-toc]");
    const mobileTocVisible = await mobileToc.isVisible();
    await mobileToc.locator("summary").click();
    await mobileToc.getByRole("link", { name: "Quick Start", exact: true }).click();
    const tocClosedAfterSelection = !(await mobileToc.getAttribute("open"));
    const focusedSection = await routeFrame
      .locator("body")
      .evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? null);

    await routeFrame
      .locator("[data-product-header]")
      .getByRole("button", { name: "Open Product menu" })
      .click();
    const dialog = routeFrame.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const menuGroups = await dialog.locator("[data-docs-mobile-group]").allTextContents();
    const activeMenuItem = await dialog.locator('[aria-current="page"]').textContent();

    return {
      leftRailVisible,
      rightTocVisible,
      horizontalOverflow,
      mobileTocVisible,
      tocClosedAfterSelection,
      focusedSection,
      menuGroups,
      activeMenuItem,
    };
  },

  async inspectInitialDeepMobileDocs(context: unknown) {
    const { routeFrame } = await getCanonicalDocsTestFrame(context);
    await routeFrame
      .locator("[data-product-header]")
      .getByRole("button", { name: "Open Product menu" })
      .click();
    const dialog = routeFrame.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const navigation = dialog.getByRole("navigation", {
      name: "Mobile Product navigation",
    });
    const activeItem = navigation.locator('[aria-current="page"]');
    await activeItem.waitFor({ state: "visible" });
    await activeItem.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    return {
      activeNavigation: await activeItem.textContent(),
      activeItemVisible: await activeItem.evaluate((element) => {
        const item = element.getBoundingClientRect();
        const scrollport = element
          .closest('nav[aria-label="Mobile Product navigation"]')
          ?.getBoundingClientRect();
        return Boolean(
          scrollport && item.top >= scrollport.top && item.bottom <= scrollport.bottom,
        );
      }),
      menuScrollTop: await navigation.evaluate((element) => element.scrollTop),
    };
  },

  async inspectDocsOverview(context: unknown) {
    const { shell } = await getCanonicalDocsTestFrame(context);
    const overview = shell.getByRole("region", { name: "Browse this category" });
    return {
      authoredIntroduction: await shell.locator("[data-authored-docs-content]").textContent(),
      cardPaths: await overview
        .getByRole("link")
        .evaluateAll((elements) =>
          elements.map((element) => new URL((element as HTMLAnchorElement).href).pathname),
        ),
      newHeadingCount: await shell.getByRole("heading", { name: "New", exact: true }).count(),
    };
  },
};
