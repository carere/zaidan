import { playwright } from "@vitest/browser-playwright";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { docsBrowserCommands } from "./tests/browser/support/docs-commands";

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
              ...docsBrowserCommands,
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
                const tokenAfterColorMode = (await routeFrame
                  .locator("[data-create-workspace]")
                  .getAttribute("data-preset")) as string;

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
                  tokenAfterColorMode,
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
              async inspectCreateLayout(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                const workspace = routeFrame.locator("[data-create-workspace]");
                const controls = routeFrame.locator("[data-configuration-rail]");
                const horizontalControls = routeFrame.locator("[data-horizontal-controls]");
                const preview = routeFrame.locator("[data-create-preview-canvas]");
                await workspace.waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();

                const [controlsBox, previewBox] = await Promise.all([
                  controls.boundingBox(),
                  preview.boundingBox(),
                ]);
                if (!controlsBox || !previewBox)
                  throw new Error("Create layout is not measurable.");

                return {
                  headerVisible: await routeFrame.locator("[data-product-header]").isVisible(),
                  previewBeforeControls:
                    Math.abs(previewBox.y - controlsBox.y) > 1
                      ? previewBox.y < controlsBox.y
                      : previewBox.x < controlsBox.x,
                  controlsHorizontal:
                    (await horizontalControls.evaluate(
                      (element) => getComputedStyle(element).flexDirection,
                    )) === "row",
                  controlsPosition: await controls.evaluate(
                    (element) => getComputedStyle(element).position,
                  ),
                  configurablePickers: await controls
                    .locator("select:not([disabled])")
                    .evaluateAll((elements) =>
                      elements.map((element) => element.getAttribute("aria-label") ?? ""),
                    ),
                  fixedPickers: await controls.locator("select[disabled]").evaluateAll((elements) =>
                    elements.map((element) => ({
                      label: element.getAttribute("aria-label") ?? "",
                      disabled: (element as HTMLSelectElement).disabled,
                      value: (element as HTMLSelectElement).selectedOptions[0]?.textContent ?? "",
                    })),
                  ),
                  controlGroups: await controls
                    .locator("[data-control-group]")
                    .evaluateAll((elements) =>
                      elements.map((element) => element.getAttribute("data-control-group") ?? ""),
                    ),
                  previewSrc: await routeFrame
                    .locator('iframe[title="Create Preview"]')
                    .getAttribute("src"),
                  comingSoonVisible: await routeFrame
                    .getByText("Coming Soon", { exact: true })
                    .count()
                    .then((count) => count > 0),
                };
              },
              async exerciseAllCreatePickers(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                const workspace = routeFrame.locator("[data-create-workspace]");
                await workspace.waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                const initialHistory = await routeFrame
                  .locator("body")
                  .evaluate(() => history.length);
                const selections = [
                  ["Style", "nova"],
                  ["Base Color", "zinc"],
                  ["Theme", "violet"],
                  ["Chart Color", "emerald"],
                  ["Heading Font", "oxanium"],
                  ["Font", "geist"],
                  ["Radius", "large"],
                  ["Menu Accent", "bold"],
                ] as const;
                for (const [label, value] of selections) {
                  await routeFrame.getByLabel(label, { exact: true }).selectOption(value);
                }
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-gWzAn"]')
                  .waitFor();
                const preview = routeFrame.frameLocator('iframe[title="Create Preview"]');
                await preview
                  .locator('[data-preview-kind="create"][data-preset="v1-gWzAn"]')
                  .waitFor();
                return {
                  historyDelta:
                    (await routeFrame.locator("body").evaluate(() => history.length)) -
                    initialHistory,
                  path: await routeFrame
                    .locator("body")
                    .evaluate(() => `${location.pathname}${location.search}`),
                  token: (await workspace.getAttribute("data-preset")) as string,
                  previewToken: (await preview
                    .locator('[data-preview-kind="create"]')
                    .getAttribute("data-preset")) as string,
                };
              },
              async inspectCreateCopyActions(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                await routeFrame.locator("[data-create-workspace]").waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                await routeFrame.locator("body").evaluate(() => {
                  document.documentElement.dataset.createCopies = "[]";
                  Object.defineProperty(navigator, "clipboard", {
                    configurable: true,
                    value: {
                      writeText(value: string) {
                        const copies = JSON.parse(
                          document.documentElement.dataset.createCopies ?? "[]",
                        ) as string[];
                        copies.push(value);
                        document.documentElement.dataset.createCopies = JSON.stringify(copies);
                        return Promise.resolve();
                      },
                    },
                  });
                });
                const currentPath = () =>
                  routeFrame
                    .locator("body")
                    .evaluate(() => `${location.pathname}${location.search}`);
                const pathBefore = await currentPath();
                const initialHistory = await routeFrame
                  .locator("body")
                  .evaluate(() => history.length);
                await routeFrame.getByRole("button", { name: /--preset v1-gWzAn/ }).click();
                await routeFrame.getByRole("button", { name: "Share" }).click();
                await routeFrame
                  .locator('[data-slot="dialog-trigger"]:has-text("Get Code")')
                  .click();
                const command = await routeFrame.locator("[role=dialog] code").textContent();
                const copied = await routeFrame
                  .locator("html")
                  .evaluate((html) => JSON.parse(html.dataset.createCopies ?? "[]"));
                return {
                  copied: copied as string[],
                  command: command ?? "",
                  historyDelta:
                    (await routeFrame.locator("body").evaluate(() => history.length)) -
                    initialHistory,
                  pathBefore,
                  pathAfter: await currentPath(),
                };
              },
              async exerciseCreatePreviewRecovery(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                const workspace = routeFrame.locator("[data-create-workspace]");
                const previewElement = routeFrame.locator('iframe[title="Create Preview"]');
                const preview = routeFrame.frameLocator('iframe[title="Create Preview"]');
                const previewSurface = preview.locator('[data-preview-kind="create"]');
                await workspace.waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                await previewSurface.waitFor({ state: "visible" });

                await routeFrame.locator("body").evaluate(() => {
                  const frame = document.querySelector<HTMLIFrameElement>(
                    'iframe[title="Create Preview"]',
                  );
                  const messages: unknown[] = [];
                  (
                    window as Window & { __createPreviewMessages?: unknown[] }
                  ).__createPreviewMessages = messages;
                  window.addEventListener("message", (event) => {
                    if (event.origin === location.origin && event.source === frame?.contentWindow) {
                      messages.push(event.data);
                    }
                  });
                });
                await preview.locator("body").evaluate(() => {
                  window.addEventListener(
                    "message",
                    (event) => {
                      if (event.origin === location.origin && event.source === window.parent) {
                        document.documentElement.dataset.latestCreateSync = JSON.stringify(
                          event.data,
                        );
                      }
                    },
                    true,
                  );
                });

                const validShortcut = {
                  channel: "zaidan-create-preview",
                  protocolVersion: 1,
                  tokenVersion: 1,
                  type: "preview-shortcut",
                  action: "shuffle",
                };
                await routeFrame.locator("body").evaluate((_, shortcut) => {
                  const frame = document.querySelector<HTMLIFrameElement>(
                    'iframe[title="Create Preview"]',
                  );
                  window.dispatchEvent(
                    new MessageEvent("message", {
                      origin: "https://forged.invalid",
                      source: frame?.contentWindow,
                      data: shortcut,
                    }),
                  );
                  window.dispatchEvent(
                    new MessageEvent("message", {
                      origin: location.origin,
                      source: null,
                      data: shortcut,
                    }),
                  );
                  window.dispatchEvent(
                    new MessageEvent("message", {
                      origin: location.origin,
                      source: frame?.contentWindow,
                      data: { ...shortcut, unexpected: true },
                    }),
                  );
                }, validShortcut);
                await preview.locator("body").evaluate(() => {
                  window.dispatchEvent(
                    new MessageEvent("message", {
                      origin: location.origin,
                      source: window.parent,
                      data: {
                        channel: "zaidan-create-preview",
                        protocolVersion: 1,
                        tokenVersion: 1,
                        type: "preset-sync",
                        revision: 999,
                        token: "v1-gWzAn",
                        colorMode: "dark",
                        unexpected: true,
                      },
                    }),
                  );
                });
                await testFrame.waitForTimeout(100);
                const tokenAfterForgery = (await workspace.getAttribute("data-preset")) as string;

                for (const [label, value] of [
                  ["Style", "nova"],
                  ["Base Color", "zinc"],
                  ["Theme", "blue"],
                  ["Font", "geist"],
                ] as const) {
                  await routeFrame.getByLabel(label, { exact: true }).selectOption(value);
                }
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-fVpmS"]')
                  .waitFor({ timeout: 5_000 });
                try {
                  await preview
                    .locator('[data-preview-kind="create"][data-preset="v1-fVpmS"]')
                    .waitFor({ timeout: 5_000 });
                } catch {
                  throw new Error(
                    `Rapid Preview synchronization stalled at ${await previewSurface.getAttribute("data-preset")}.`,
                  );
                }

                await routeFrame.locator("body").evaluate(() => {
                  const frame = document.querySelector<HTMLIFrameElement>(
                    'iframe[title="Create Preview"]',
                  );
                  const child = frame?.contentWindow;
                  if (!child) throw new Error("Create Preview window is unavailable.");
                  const nativePostMessage = child.postMessage.bind(child);
                  (
                    window as Window & {
                      __restoreCreatePreviewPostMessage?: () => void;
                    }
                  ).__restoreCreatePreviewPostMessage = () => {
                    child.postMessage = nativePostMessage;
                  };
                  child.postMessage = (message: unknown) => {
                    document.documentElement.dataset.latestBlockedCreateSync =
                      JSON.stringify(message);
                  };
                });
                await routeFrame.getByLabel("Radius", { exact: true }).selectOption("large");
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-fVpmi"]')
                  .waitFor({ timeout: 5_000 });
                const sentAfterStale = Number(await workspace.getAttribute("data-sent-revision"));
                await routeFrame.locator("body").evaluate(
                  (_, { revision, token }) => {
                    const frame = document.querySelector<HTMLIFrameElement>(
                      'iframe[title="Create Preview"]',
                    );
                    window.dispatchEvent(
                      new MessageEvent("message", {
                        origin: location.origin,
                        source: frame?.contentWindow,
                        data: {
                          channel: "zaidan-create-preview",
                          protocolVersion: 1,
                          tokenVersion: 1,
                          type: "preset-applied",
                          revision: revision - 1,
                          token,
                        },
                      }),
                    );
                  },
                  { revision: sentAfterStale, token: "v1-fVpmi" },
                );
                const appliedAfterStale = Number(
                  await workspace.getAttribute("data-applied-revision"),
                );
                try {
                  await routeFrame
                    .locator('[data-preview-status="degraded"]')
                    .waitFor({ timeout: 5_000 });
                } catch {
                  throw new Error(
                    `Preview did not degrade: status=${await routeFrame.locator("[data-preview-status]").getAttribute("data-preview-status")}, sent=${await workspace.getAttribute("data-sent-revision")}, applied=${await workspace.getAttribute("data-applied-revision")}.`,
                  );
                }
                const degraded = await routeFrame
                  .getByRole("button", { name: "Retry Preview" })
                  .isVisible();
                const syncMessage = await routeFrame
                  .locator("html")
                  .evaluate((html) => JSON.parse(html.dataset.latestBlockedCreateSync ?? "{}"));
                const previewSrcBefore = await previewElement.getAttribute("src");
                await routeFrame.locator("body").evaluate(() => {
                  (
                    window as Window & {
                      __restoreCreatePreviewPostMessage?: () => void;
                    }
                  ).__restoreCreatePreviewPostMessage?.();
                });
                await routeFrame.getByRole("button", { name: "Retry Preview" }).click();
                try {
                  await routeFrame
                    .locator('[data-preview-status="ready"]')
                    .waitFor({ timeout: 5_000 });
                  await preview
                    .locator('[data-preview-kind="create"][data-preset="v1-fVpmi"]')
                    .waitFor({ timeout: 5_000 });
                } catch {
                  throw new Error(
                    `Preview recovery stalled: status=${await routeFrame.locator("[data-preview-status]").getAttribute("data-preview-status")}, preview=${await previewSurface.getAttribute("data-preset")}.`,
                  );
                }
                const parentMessages = await routeFrame
                  .locator("body")
                  .evaluate(
                    () =>
                      (window as Window & { __createPreviewMessages?: unknown[] })
                        .__createPreviewMessages ?? [],
                  );
                const readyMessage = [...parentMessages]
                  .reverse()
                  .find((message) => (message as { type?: unknown }).type === "preview-ready");
                const appliedMessage = [...parentMessages]
                  .reverse()
                  .find((message) => (message as { type?: unknown }).type === "preset-applied");
                return {
                  tokenAfterForgery,
                  appliedAfterStale,
                  sentAfterStale,
                  degraded,
                  recoveredToken: (await previewSurface.getAttribute("data-preset")) as string,
                  recoveredPath: await routeFrame
                    .locator("body")
                    .evaluate(() => `${location.pathname}${location.search}`),
                  previewSrcBefore,
                  previewSrcAfter: await previewElement.getAttribute("src"),
                  syncKeys: Object.keys(syncMessage as object).sort(),
                  readyKeys: Object.keys(readyMessage ?? {}).sort(),
                  appliedKeys: Object.keys(appliedMessage ?? {}).sort(),
                };
              },
              async exerciseCreateReturnHandoff(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Create workspace"]');
                const currentPath = () =>
                  routeFrame
                    .locator("body")
                    .evaluate(() => `${location.pathname}${location.search}${location.hash}`);
                await routeFrame.locator("[data-product-header]").waitFor({ state: "visible" });
                await routeFrame.getByRole("link", { name: "New", exact: true }).click();
                await routeFrame.locator("[data-create-workspace]").waitFor({ state: "visible" });
                await routeFrame.locator('[data-preview-status="ready"]').waitFor();
                const entryPath = await currentPath();
                await routeFrame.getByLabel("Style", { exact: true }).selectOption("nova");
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-aKeeG"]')
                  .waitFor();
                const configuredPath = await currentPath();
                await routeFrame
                  .getByRole("navigation", { name: "Product Surfaces" })
                  .getByRole("link", { name: "Docs", exact: true })
                  .click();
                await routeFrame.locator('[data-canonical-route="/docs"]').waitFor();
                const destinationPath = await currentPath();
                await routeFrame.locator("body").evaluate(() => history.back());
                await routeFrame
                  .locator('[data-create-workspace][data-preset="v1-aKeeG"]')
                  .waitFor();
                const configuredReturnPath = await currentPath();
                await routeFrame.locator("body").evaluate(() => history.back());
                await routeFrame.locator('[data-create-workspace][data-preset="v1-0"]').waitFor();
                const defaultReturnPath = await currentPath();
                await routeFrame.locator("body").evaluate(() => history.back());
                await routeFrame.getByRole("heading", { name: "Button", exact: true }).waitFor();
                return {
                  entryPath,
                  configuredPath,
                  destinationPath,
                  configuredReturnPath,
                  defaultReturnPath,
                  sourceReturnPath: await currentPath(),
                };
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
