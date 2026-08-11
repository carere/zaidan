import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { CreateIndex } from "@/components/create-index";
import { DEFAULT_CONFIG, FONTS, RADII } from "@/lib/config";
import { isCreateShowcase } from "@/lib/create-previews";
import { buildRegistryTheme } from "@/lib/theme-utils";
import type { IframeMessage } from "@/lib/types";

export const Route = createFileRoute("/preview/create")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    showcase:
      typeof search.showcase === "string" && isCreateShowcase(search.showcase)
        ? search.showcase
        : "preview-02",
  }),
  component: PreviewComponent,
});

function PreviewComponent() {
  const search = Route.useSearch();
  const [isReady, setIsReady] = createSignal(false);
  const [config, setConfig] = createSignal(DEFAULT_CONFIG);

  const registryTheme = createMemo(() => {
    const p = config();
    if (!p.baseColor || !p.theme || !p.chartColor || !p.menuAccent || !p.radius) {
      return null;
    }

    return buildRegistryTheme({
      baseColor: p.baseColor,
      theme: p.theme,
      chartColor: p.chartColor,
      menuAccent: p.menuAccent,
      radius: p.radius,
    });
  });

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === "color-mode-sync" && event.data.data) {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(event.data.data);
      } else if (event.data?.type === "design-system-params-sync") {
        setConfig(event.data.data);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "cmd-k-forward",
            key: e.key,
          } satisfies IframeMessage);
        }
      }

      if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "dark-mode-forward",
            key: e.key,
          } satisfies IframeMessage);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("keydown", handleKeyDown);
    window.parent.postMessage(
      { type: "preview-ready" } satisfies IframeMessage,
      window.location.origin,
    );

    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("keydown", handleKeyDown);
      document.getElementById("design-system-theme-vars")?.remove();
    });
  });

  // Apply style/base color/font to document
  createEffect(
    on(
      [
        () => config().style,
        () => config().baseColor,
        () => config().font,
        () => config().headingFont,
      ],
      ([style, baseColor, font, headingFont]) => {
        document.body.classList.forEach((className) => {
          if (className.startsWith("style-")) {
            document.body.classList.remove(className);
          }
        });
        document.body.classList.add(`style-${style}`);

        document.body.classList.forEach((className) => {
          if (className.startsWith("base-color-")) {
            document.body.classList.remove(className);
          }
        });
        if (baseColor) {
          document.body.classList.add(`base-color-${baseColor}`);
        }

        const fontConfig = FONTS.find((f) => f.value === font);
        if (fontConfig) {
          document.documentElement.style.setProperty("--font-sans", fontConfig.fontFamily);
        }

        const headingFontConfig = FONTS.find((f) => f.value === headingFont);
        if (headingFontConfig) {
          document.documentElement.style.setProperty(
            "--font-heading",
            headingFontConfig.fontFamily,
          );
        }

        setIsReady(true);
      },
    ),
  );

  // Apply radius CSS custom property to document.documentElement
  createEffect(
    on(
      () => config().radius,
      (radius) => {
        const radiusValue = RADII.find((r) => r.name === radius || r.name === "medium")
          ?.value as string;
        document.documentElement.style.setProperty("--radius", radiusValue);
      },
    ),
  );

  // Apply theme CSS variables to document
  createEffect(
    on(
      () => registryTheme(),
      (theme) => {
        if (!theme?.cssVars) {
          return;
        }

        const styleId = "design-system-theme-vars";
        let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

        if (!styleElement) {
          styleElement = document.createElement("style");
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }

        const { light: lightVars, dark: darkVars } = theme.cssVars;

        let cssText = ":root {\n";
        if (lightVars) {
          for (const [key, value] of Object.entries(lightVars)) {
            if (value) {
              cssText += `  --${key}: ${value};\n`;
            }
          }
        }
        cssText += "}\n\n";

        cssText += ".dark {\n";
        if (darkVars) {
          for (const [key, value] of Object.entries(darkVars)) {
            if (value) {
              cssText += `  --${key}: ${value};\n`;
            }
          }
        }
        cssText += "}\n";

        styleElement.textContent = cssText;
      },
    ),
  );

  return (
    <Show when={isReady()}>
      <CreateIndex
        config={config()}
        showcase={search().showcase}
        onShowcaseChange={(showcase) =>
          window.parent.postMessage(
            { type: "showcase-change", data: showcase } satisfies IframeMessage,
            window.location.origin,
          )
        }
      />
    </Show>
  );
}
