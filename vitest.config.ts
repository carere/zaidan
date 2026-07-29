import { playwright } from "@vitest/browser-playwright";
import axeCore from "axe-core";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

async function getProductRouteTestFrame(context: unknown) {
  const commandContext = context as {
    provider: {
      getCommandsContext: (sessionId: string) => {
        frame: () => Promise<Frame>;
      };
    };
    sessionId: string;
  };
  const testFrame = await commandContext.provider
    .getCommandsContext(commandContext.sessionId)
    .frame();
  const routeFrame = testFrame.frameLocator('iframe[title="Product Header route"]');
  const header = routeFrame.locator("[data-product-header]");
  await header.waitFor({ state: "visible" });
  return { testFrame, routeFrame, header };
}

async function getCanonicalDocsTestFrame(context: unknown) {
  const commandContext = context as {
    provider: {
      getCommandsContext: (sessionId: string) => {
        frame: () => Promise<Frame>;
      };
    };
    sessionId: string;
  };
  const testFrame = await commandContext.provider
    .getCommandsContext(commandContext.sessionId)
    .frame();
  const routeFrame = testFrame.frameLocator('iframe[title="Canonical Docs route"]');
  const shell = routeFrame.locator("[data-docs-shell]");
  await shell.waitFor({ state: "visible" });
  return { testFrame, routeFrame, shell };
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [solid()],
  test: {
    // Prevent vite-plugin-solid from adding jsdom to the shared config. Each
    // project below owns its real execution environment explicitly.
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.tsx"],
          globalSetup: ["tests/browser/setup-built-app.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            commands: {
              async requestBuiltRoutes(_context, urls: string[]) {
                return Promise.all(
                  urls.map(async (url) => {
                    const response = await fetch(url, { redirect: "manual" });
                    const body = await response.text();
                    return {
                      url,
                      status: response.status,
                      location: response.headers.get("location"),
                      xRobotsTag: response.headers.get("x-robots-tag"),
                      canonicalLinks: Array.from(
                        body.matchAll(/rel="canonical" href="([^"]+)"/g),
                        (match) => match[1],
                      ),
                      body: body.slice(0, 50_000),
                    };
                  }),
                );
              },
              async inspectCanonicalDocsSources(
                context,
                routes: { url: string; sentinel: string }[],
              ) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routePage = await testFrame.page().context().newPage();
                try {
                  const evidence = [];
                  for (const route of routes) {
                    await routePage.goto(route.url, { waitUntil: "domcontentloaded" });
                    const shell = routePage.locator("[data-docs-shell]");
                    await shell.waitFor({ state: "visible" });
                    const authored = shell.locator("[data-authored-docs-content]");
                    await authored.waitFor({ state: "visible" });
                    const text = (await authored.textContent()) ?? "";
                    evidence.push({
                      path: new URL(route.url).pathname,
                      authoredCount: await authored.count(),
                      source: await authored.getAttribute("data-authored-source"),
                      sentinelCount: text.split(route.sentinel).length - 1,
                    });
                  }
                  return evidence;
                } finally {
                  await routePage.close();
                }
              },
              async auditDocsAccessibility(context) {
                const { testFrame } = await getCanonicalDocsTestFrame(context);
                const iframe = await testFrame
                  .locator('iframe[title="Canonical Docs route"]')
                  .elementHandle();
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
              async inspectBuiltRoute(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Zaidan route"]');
                const heading = routeFrame.getByRole("heading", {
                  name: "The best foundation for your next SolidJS project",
                });

                await heading.waitFor({ state: "visible" });

                const showcase = routeFrame.locator('[data-home-showcase="native"]');
                await showcase.waitFor({ state: "visible" });

                return {
                  heading: await heading.textContent(),
                  iframeCount: await routeFrame.locator("iframe").count(),
                  showcaseVisible: await showcase.isVisible(),
                };
              },
              async inspectHomeShowcase(context, colorMode: "light" | "dark") {
                const { testFrame, routeFrame } = await getProductRouteTestFrame(context);
                await routeFrame.locator("html").evaluate((element, mode) => {
                  element.classList.remove("light", "dark");
                  element.classList.add(mode);
                }, colorMode);
                await testFrame.waitForTimeout(50);

                const nativeShowcase = routeFrame.locator('[data-home-showcase="native"]');
                const visibleColumns = nativeShowcase.locator("[data-showcase-column]:visible");
                const mobileArtwork = routeFrame.locator("[data-mobile-artwork]:visible");
                return {
                  columnCount: await visibleColumns.count(),
                  content: await routeFrame
                    .locator("[data-showcase-content]")
                    .evaluateAll((elements) =>
                      elements.map(
                        (element) => element.getAttribute("data-showcase-content") ?? "",
                      ),
                    ),
                  fadeCount: await nativeShowcase.locator("[data-showcase-fade]:visible").count(),
                  iframeCount: await routeFrame.locator("iframe").count(),
                  installCommand: await routeFrame.locator("[data-install-command]").textContent(),
                  mobileArtworkCount: await mobileArtwork.count(),
                  mobileArtworkSource:
                    (await mobileArtwork.count()) > 0
                      ? await mobileArtwork.first().getAttribute("src")
                      : null,
                  mobileControlCount: await routeFrame
                    .locator(
                      "[data-home-mobile] button, [data-home-mobile] input, [data-home-mobile] select, [data-home-mobile] textarea, [data-home-mobile] iframe",
                    )
                    .count(),
                  nativeShowcaseVisible: await nativeShowcase.isVisible(),
                  overflow: await routeFrame
                    .locator("body")
                    .evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
                  pathname: await routeFrame
                    .locator("body")
                    .evaluate(() => window.location.pathname),
                  search: await routeFrame.locator("body").evaluate(() => window.location.search),
                };
              },
              async exerciseHomeInstallCopy(context) {
                const { testFrame, routeFrame } = await getProductRouteTestFrame(context);
                const copied: string[] = [];
                await routeFrame.locator("body").evaluate(() => {
                  Object.defineProperty(navigator, "clipboard", {
                    configurable: true,
                    value: {
                      writeText(value: string) {
                        document.documentElement.dataset.copiedInstallCommand = value;
                        return Promise.resolve();
                      },
                    },
                  });
                });
                const copyButton = routeFrame.getByRole("button", {
                  name: "Copy install command",
                });
                await copyButton.focus();
                await testFrame.page().keyboard.press("Enter");
                await routeFrame.getByText("Install command copied", { exact: true }).waitFor({
                  state: "attached",
                });
                copied.push(
                  (await routeFrame.locator("html").getAttribute("data-copied-install-command")) ??
                    "",
                );
                return {
                  copiedText: copied[0] ?? "",
                  focusedLabel: await routeFrame
                    .locator("body")
                    .evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null),
                  liveStatus: await routeFrame.locator('[aria-live="polite"]').textContent(),
                  pathname: await routeFrame
                    .locator("body")
                    .evaluate(() => window.location.pathname),
                  search: await routeFrame.locator("body").evaluate(() => window.location.search),
                };
              },
              async inspectCanonicalPreview(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const previewFrame = testFrame.frameLocator(
                  'iframe[title="Canonical Preview route"]',
                );
                const examples = previewFrame.locator('[data-slot="example"]');

                await testFrame.waitForTimeout(500);

                return {
                  activeId: await previewFrame
                    .locator("body")
                    .evaluate(() => document.activeElement?.id ?? null),
                  activeIdentity: await previewFrame
                    .locator("body")
                    .evaluate(
                      () =>
                        (document.activeElement as HTMLElement | null)?.dataset.previewAnchor ??
                        null,
                    ),
                  activeTitle: await previewFrame
                    .locator("body")
                    .evaluate(
                      () =>
                        document.activeElement
                          ?.querySelector(":scope > div")
                          ?.textContent?.trim() ?? null,
                    ),
                  iframeCount: await testFrame
                    .locator('iframe[title="Canonical Preview route"]')
                    .count(),
                  hash: await previewFrame.locator("body").evaluate(() => window.location.hash),
                  exampleIds: await examples.evaluateAll((elements) =>
                    elements.map((element) => element.id),
                  ),
                };
              },
              async inspectSidebarCompatibilityNavigations(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const inspect = async (title: string) => {
                  const routeFrame = testFrame.frameLocator(`iframe[title="${title}"]`);
                  await routeFrame
                    .locator('[data-canonical-route="/components/sidebar"]')
                    .waitFor({ state: "visible" });
                  return routeFrame.locator("body").evaluate(() => {
                    const navigation = performance.getEntriesByType(
                      "navigation",
                    )[0] as PerformanceNavigationTiming;
                    return {
                      pathname: window.location.pathname,
                      search: window.location.search,
                      hash: window.location.hash,
                      redirectCount: navigation.redirectCount,
                    };
                  });
                };

                await testFrame.waitForTimeout(500);
                return {
                  defaultNavigation: await inspect("Sidebar default navigation"),
                  fragmentNavigation: await inspect("Sidebar fragment navigation"),
                };
              },
              async exerciseCreateHistory(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                const workspace = routeFrame.locator("[data-create-workspace]");
                await workspace.waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                const currentPath = () =>
                  routeFrame
                    .locator("body")
                    .evaluate(() => `${window.location.pathname}${window.location.search}`);
                const defaultPath = await currentPath();
                const initialHistory = await routeFrame
                  .locator("body")
                  .evaluate(() => history.length);

                await routeFrame.getByLabel("Style", { exact: true }).selectOption("nova");
                await routeFrame
                  .locator('[data-create-workspace][data-preset]:not([data-preset="v1-0"])')
                  .waitFor();
                const selectedPath = await currentPath();
                const selectedHistory = await routeFrame
                  .locator("body")
                  .evaluate(() => history.length);

                await routeFrame.getByRole("button", { name: "Undo" }).click();
                await routeFrame.locator('[data-create-workspace][data-preset="v1-0"]').waitFor();
                const undoPath = await currentPath();

                await routeFrame.getByRole("button", { name: "Redo" }).click();
                await routeFrame
                  .locator('[data-create-workspace][data-preset]:not([data-preset="v1-0"])')
                  .waitFor();
                const redoPath = await currentPath();

                await routeFrame.locator("body").evaluate(() => history.back());
                await routeFrame.locator('[data-create-workspace][data-preset="v1-0"]').waitFor();
                const backPath = await currentPath();
                const undoDisabledAfterBack = await routeFrame
                  .getByRole("button", { name: "Undo" })
                  .isDisabled();

                await routeFrame.locator("body").evaluate(() => history.forward());
                await routeFrame
                  .locator('[data-create-workspace][data-preset]:not([data-preset="v1-0"])')
                  .waitFor();
                const forwardPath = await currentPath();
                const undoDisabledAfterForward = await routeFrame
                  .getByRole("button", { name: "Undo" })
                  .isDisabled();

                await routeFrame.getByLabel("Base Color", { exact: true }).selectOption("zinc");
                await routeFrame
                  .locator('[data-create-workspace][data-preset]:not([data-preset="v1-0"])')
                  .waitFor();
                const interleavedSelectedPath = await currentPath();
                const interleavedToken = interleavedSelectedPath.split("preset=")[1] as string;
                const selectedToken = selectedPath.split("preset=")[1] as string;
                await routeFrame.getByRole("button", { name: "Undo" }).click();
                await routeFrame
                  .locator(`[data-create-workspace][data-preset="${selectedToken}"]`)
                  .waitFor();
                const interleavedUndoPath = await currentPath();
                await routeFrame.getByRole("button", { name: "Redo" }).click();
                await routeFrame
                  .locator(`[data-create-workspace][data-preset="${interleavedToken}"]`)
                  .waitFor();
                const interleavedRedoPath = await currentPath();

                const preview = routeFrame.frameLocator('iframe[title="Create Preview"]');
                await preview
                  .locator('[data-preview-kind="create"][data-preset]:not([data-preset="v1-0"])')
                  .waitFor();

                return {
                  defaultPath,
                  selectedPath,
                  undoPath,
                  redoPath,
                  backPath,
                  forwardPath,
                  undoDisabledAfterBack,
                  undoDisabledAfterForward,
                  interleavedSelectedPath,
                  interleavedUndoPath,
                  interleavedRedoPath,
                  historyDelta: selectedHistory - initialHistory,
                  previewPreset: (await preview
                    .locator('[data-preview-kind="create"]')
                    .getAttribute("data-preset")) as string,
                };
              },
              async inspectCreateActions(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                await routeFrame.locator("[data-create-workspace]").waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                const currentPath = () =>
                  routeFrame
                    .locator("body")
                    .evaluate(() => `${window.location.pathname}${window.location.search}`);
                const pathBefore = await currentPath();
                const openPresetTrigger = routeFrame.locator(
                  '[data-slot="dialog-trigger"]:has-text("Open Preset")',
                );
                await openPresetTrigger.click();
                await routeFrame.getByLabel("Preset Token").fill("v2-0");
                await routeFrame
                  .locator("form")
                  .evaluate((form) => (form as HTMLFormElement).requestSubmit());
                await routeFrame.locator("#open-preset-error").waitFor({ state: "visible" });
                const invalidError = await routeFrame.locator("#open-preset-error").textContent();
                await routeFrame.getByLabel("Preset Token").press("Shift+Tab");
                const openFocusTrapped = await routeFrame
                  .getByRole("dialog")
                  .evaluate((dialog) => dialog.contains(document.activeElement));
                await routeFrame.locator("body").press("Escape");
                await routeFrame.getByRole("dialog").waitFor({ state: "hidden" });
                const openFocusRestored = await openPresetTrigger.evaluate(
                  (trigger) => document.activeElement === trigger,
                );

                const getCodeTrigger = routeFrame.locator(
                  '[data-slot="dialog-trigger"]:has-text("Get Code")',
                );
                await getCodeTrigger.click();
                await routeFrame.locator("[role=dialog] code").waitFor({ state: "visible" });
                const command = await routeFrame.locator("[role=dialog] code").textContent();
                const yarnTab = routeFrame.getByRole("tab", { name: "yarn" });
                await routeFrame.getByRole("tab", { name: "Bun" }).press("ArrowLeft");
                await yarnTab.waitFor({ state: "visible" });
                const keyboardSelectedManager = await yarnTab.getAttribute("aria-selected");
                const keyboardSelectedCommand = await routeFrame
                  .locator("[role=dialog] code")
                  .textContent();
                const pathAfter = await currentPath();
                await routeFrame
                  .getByRole("dialog")
                  .locator('[data-slot="dialog-close"]')
                  .evaluate((button) => (button as HTMLButtonElement).click());
                await routeFrame.getByRole("dialog").waitFor({ state: "hidden" });
                const getCodeFocusRestored = await getCodeTrigger.evaluate(
                  (trigger) => document.activeElement === trigger,
                );

                await openPresetTrigger.click();
                await routeFrame.getByLabel("Preset Token").fill("--preset v1-gWzAn");
                await routeFrame
                  .getByRole("dialog")
                  .locator("form")
                  .evaluate((form) => (form as HTMLFormElement).requestSubmit());
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-gWzAn"]')
                  .waitFor();
                const validOpenPath = await currentPath();

                await routeFrame.getByRole("button", { name: "Lock Style" }).click();
                await routeFrame.getByRole("button", { name: "Shuffle" }).click();
                await routeFrame
                  .locator('[data-create-workspace][data-preset]:not([data-preset="v1-gWzAn"])')
                  .waitFor();
                const shuffledPath = await currentPath();
                const shuffledToken = (await routeFrame
                  .locator("[data-create-workspace]")
                  .getAttribute("data-preset")) as string;
                const lockedStyle = await routeFrame
                  .getByLabel("Style", { exact: true })
                  .inputValue();

                await routeFrame.locator("body").evaluate(() => {
                  window.confirm = () => true;
                });
                await routeFrame.getByRole("button", { name: "Reset", exact: true }).click();
                await routeFrame.locator('[data-create-workspace][data-preset="v1-0"]').waitFor();
                const resetPath = await currentPath();
                const lockCleared =
                  (await routeFrame
                    .getByRole("button", { name: "Lock Style" })
                    .getAttribute("aria-pressed")) === "false";
                await routeFrame.getByRole("button", { name: "Undo" }).click();
                await routeFrame
                  .locator(`[data-create-workspace][data-preset="${shuffledToken}"]`)
                  .waitFor();
                const undoResetPath = await currentPath();
                return {
                  invalidError: invalidError ?? "",
                  command: command ?? "",
                  openFocusTrapped,
                  openFocusRestored,
                  keyboardSelectedManager,
                  keyboardSelectedCommand: keyboardSelectedCommand ?? "",
                  getCodeFocusRestored,
                  pathBefore,
                  pathAfter,
                  validOpenPath,
                  shuffledPath,
                  shuffledToken,
                  lockedStyle,
                  resetPath,
                  lockCleared,
                  undoResetPath,
                };
              },
              async exerciseCreatePreviewShortcuts(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                await routeFrame.locator("[data-create-workspace]").waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                const preview = routeFrame.frameLocator('iframe[title="Create Preview"]');
                const previewSurface = preview.locator('[data-preview-kind="create"]');
                await previewSurface.waitFor({ state: "visible" });

                await routeFrame.locator("body").evaluate((body) => {
                  document.addEventListener(
                    "keydown",
                    (event) => {
                      if (
                        !event.isTrusted &&
                        (event.metaKey || event.ctrlKey) &&
                        event.key.toLowerCase() === "k"
                      ) {
                        body.dataset.previewCommandSearch = "received";
                      }
                    },
                    { once: true },
                  );
                });
                await previewSurface.press("Meta+k");
                await routeFrame.locator('body[data-preview-command-search="received"]').waitFor();
                const commandSearchForwarded = true;

                const initialDarkMode = await routeFrame
                  .locator("html")
                  .evaluate((html) => html.classList.contains("dark"));
                await previewSurface.press("d");
                await routeFrame.locator(initialDarkMode ? "html.light" : "html.dark").waitFor();
                await preview.locator(initialDarkMode ? "html.light" : "html.dark").waitFor();
                const toggledDarkMode = await routeFrame
                  .locator("html")
                  .evaluate((html) => html.classList.contains("dark"));
                const previewDarkMode = await preview
                  .locator("html")
                  .evaluate((html) => html.classList.contains("dark"));

                const tokenBeforeEditableShortcut = (await routeFrame
                  .locator("[data-create-workspace]")
                  .getAttribute("data-preset")) as string;
                await preview.locator("input").first().press("r");
                await testFrame.waitForTimeout(100);
                const editableShortcutToken = (await routeFrame
                  .locator("[data-create-workspace]")
                  .getAttribute("data-preset")) as string;

                await previewSurface.press("r");
                const shuffledWorkspace = routeFrame.locator(
                  '[data-create-workspace][data-preset]:not([data-preset="v1-0"])',
                );
                await shuffledWorkspace.waitFor();
                const shuffledToken = (await shuffledWorkspace.getAttribute(
                  "data-preset",
                )) as string;

                await previewSurface.press("Meta+z");
                await routeFrame.locator('[data-create-workspace][data-preset="v1-0"]').waitFor();
                const undoToken = (await routeFrame
                  .locator("[data-create-workspace]")
                  .getAttribute("data-preset")) as string;

                await previewSurface.press("Meta+Shift+z");
                await routeFrame
                  .locator(`[data-create-workspace][data-preset="${shuffledToken}"]`)
                  .waitFor();
                return {
                  commandSearchForwarded,
                  initialDarkMode,
                  toggledDarkMode,
                  previewDarkMode,
                  tokenBeforeEditableShortcut,
                  editableShortcutToken,
                  shuffledToken,
                  undoToken,
                  redoToken: (await routeFrame
                    .locator("[data-create-workspace]")
                    .getAttribute("data-preset")) as string,
                };
              },
              async inspectCreateCanonicalization(context, urls: string[]) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const results: string[] = [];
                for (const [index, url] of urls.entries()) {
                  await testFrame.locator("body").evaluate(
                    (_body, { target, title }) => {
                      const iframe = document.createElement("iframe");
                      iframe.src = target;
                      iframe.title = title;
                      document.body.append(iframe);
                    },
                    { target: url, title: `Canonical Create ${index}` },
                  );
                  const routeFrame = testFrame.frameLocator(
                    `iframe[title="Canonical Create ${index}"]`,
                  );
                  await routeFrame.locator("[data-create-workspace]").waitFor({ state: "visible" });
                  await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                  results.push(
                    await routeFrame
                      .locator("body")
                      .evaluate(() => `${window.location.pathname}${window.location.search}`),
                  );
                }
                return results;
              },
              async inspectBuiltChart(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built chart route"]');
                const chart = routeFrame.locator('[data-slot="chart"]');

                await chart.waitFor({ state: "visible" });
                await chart.locator(".recharts-surface").waitFor({ state: "visible" });

                return {
                  chartSlot: await chart.getAttribute("data-chart"),
                  description: await routeFrame
                    .getByText("Showing total visitors for the last 6 months")
                    .textContent(),
                  renderedAreaCount: await chart.locator(".recharts-area-area").count(),
                };
              },
              async inspectDesktopDocs(context) {
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
                  readingWidth: await article.evaluate(
                    (element) => element.getBoundingClientRect().width,
                  ),
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
              async inspectInitialDeepDocs(context) {
                const { shell } = await getCanonicalDocsTestFrame(context);
                const rail = shell.locator(
                  '[data-docs-left-rail] nav[aria-label="Docs hierarchy"]',
                );
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
              async exerciseDocsNavigation(context) {
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
                const tocHash = await routeFrame
                  .locator("body")
                  .evaluate(() => window.location.hash);
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
                const nextPath = await routeFrame
                  .locator("body")
                  .evaluate(() => window.location.pathname);
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
                  .evaluate(() =>
                    JSON.parse(sessionStorage.getItem("zaidan:docs-navigation-groups") ?? "[]"),
                  );
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
              async exerciseMobileDocs(context) {
                const { routeFrame, shell } = await getCanonicalDocsTestFrame(context);
                const leftRailVisible = await shell.locator("[data-docs-left-rail]").isVisible();
                const rightTocVisible = await shell.locator("[data-docs-right-toc]").isVisible();
                const horizontalOverflow = await routeFrame
                  .locator("body")
                  .evaluate(
                    () =>
                      document.documentElement.scrollWidth > document.documentElement.clientWidth,
                  );
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
                const menuGroups = await dialog
                  .locator("[data-docs-mobile-group]")
                  .allTextContents();
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
              async inspectDocsOverview(context) {
                const { shell } = await getCanonicalDocsTestFrame(context);
                const overview = shell.getByRole("region", { name: "Browse this category" });
                return {
                  authoredIntroduction: await shell
                    .locator("[data-authored-docs-content]")
                    .textContent(),
                  cardPaths: await overview
                    .getByRole("link")
                    .evaluateAll((elements) =>
                      elements.map(
                        (element) => new URL((element as HTMLAnchorElement).href).pathname,
                      ),
                    ),
                  newHeadingCount: await shell
                    .getByRole("heading", { name: "New", exact: true })
                    .count(),
                };
              },
              async inspectDesktopProductHeader(context) {
                const { header } = await getProductRouteTestFrame(context);

                const productNavigation = header.getByRole("navigation", {
                  name: "Product Surfaces",
                });
                return {
                  surfaces: await productNavigation.getByRole("link").allTextContents(),
                  activeSurface: await productNavigation
                    .locator('[aria-current="location"]')
                    .textContent(),
                  searchVisible: await header
                    .getByRole("button", { name: "Open Command Search" })
                    .isVisible(),
                  githubVisible: await header.getByRole("link", { name: /GitHub/i }).isVisible(),
                  modeVisible: await header
                    .getByRole("button", { name: "Toggle color mode" })
                    .isVisible(),
                  createVisible: await header
                    .getByRole("link", { name: "New", exact: true })
                    .isVisible(),
                  headerHeight: await header.evaluate(
                    (element) => element.getBoundingClientRect().height,
                  ),
                  offset: await header.evaluate(() =>
                    Number.parseFloat(
                      getComputedStyle(document.documentElement).getPropertyValue(
                        "--product-header-height",
                      ),
                    ),
                  ),
                };
              },
              async exerciseMobileProductHeader(context) {
                const { testFrame, routeFrame, header } = await getProductRouteTestFrame(context);
                await testFrame.page().emulateMedia({ reducedMotion: "reduce" });

                const search = header.getByRole("button", { name: "Open Command Search" });
                const mode = header.getByRole("button", { name: "Toggle color mode" });
                const mobileCreate = header.getByRole("link", { name: "New", exact: true });
                const menuTrigger = header.getByRole("button", { name: "Open Product menu" });
                const compactSearchVisible = await search.isVisible();
                const modeVisible = await mode.isVisible();
                const mobileCreateVisible = await mobileCreate.isVisible();

                await menuTrigger.click();
                const dialog = routeFrame.getByRole("dialog");
                await dialog.waitFor({ state: "visible" });
                const hierarchyVisible = await dialog.getByText("Component Catalog").isVisible();
                await testFrame.page().keyboard.press("Tab");
                const focusTrapped = await dialog.evaluate((element) =>
                  element.contains(document.activeElement),
                );
                const reducedMotionDuration = await dialog.evaluate(
                  (element) => getComputedStyle(element).animationDuration,
                );

                await testFrame.page().keyboard.press("Escape");
                await dialog.waitFor({ state: "hidden" });
                await testFrame.waitForTimeout(250);
                const restoredLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                await testFrame.page().keyboard.press("/");
                const shortcutLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));
                await routeFrame
                  .locator("body")
                  .evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
                await testFrame.page().keyboard.press("Control+K");
                const commandShortcutLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                await menuTrigger.click();
                await dialog.waitFor({ state: "visible" });
                await dialog.getByRole("link", { name: "Button", exact: true }).click();
                await routeFrame
                  .locator('[data-canonical-route="/components/button"]')
                  .waitFor({ state: "visible" });
                await testFrame.waitForTimeout(250);
                const selectedFocus = await routeFrame.locator("body").evaluate(() => ({
                  id: (document.activeElement as HTMLElement | null)?.id ?? null,
                  tag: document.activeElement?.tagName ?? null,
                  text: document.activeElement?.textContent?.trim() ?? null,
                }));
                const selectedHash = await routeFrame
                  .locator("body")
                  .evaluate(() => window.location.hash);

                await menuTrigger.click();
                await dialog.waitFor({ state: "visible" });
                await testFrame.page().keyboard.press("Escape");
                await dialog.waitFor({ state: "hidden" });
                await testFrame.waitForTimeout(250);
                const postSelectionRestoredLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                return {
                  compactSearchVisible,
                  modeVisible,
                  mobileCreateVisible,
                  hierarchyVisible,
                  focusTrapped,
                  restoredLabel,
                  shortcutLabel,
                  commandShortcutLabel,
                  selectedFocusId: selectedFocus.id,
                  selectedFocusTag: selectedFocus.tag,
                  selectedFocusText: selectedFocus.text,
                  selectedHash,
                  postSelectionRestoredLabel,
                  reducedMotionDuration,
                };
              },
            },
          },
        },
      },
    ],
  },
});
