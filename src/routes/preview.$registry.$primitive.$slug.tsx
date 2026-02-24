import { createFileRoute, notFound } from "@tanstack/solid-router";
import {
  createEffect,
  createMemo,
  createSignal,
  lazy,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { NotFoundPage } from "@/components/not-found-page";
import { FONTS, RADII } from "@/lib/config";
import { getCollectionByRegistry, type Registry } from "@/lib/registries";
import { buildRegistryTheme } from "@/lib/theme-utils";
import type { IframeMessage } from "@/lib/types";

export const Route = createFileRoute("/preview/$registry/$primitive/$slug")({
  loader: ({ params }) => {
    const { slug, primitive, registry } = params;
    const component = getCollectionByRegistry(registry as Registry).find((u) => u.slug === slug);
    if (!component) {
      throw notFound({
        data: {
          slug,
        },
      });
    }

    return {
      slug,
      primitive,
    };
  },
  component: PreviewComponent,
  notFoundComponent: () => <NotFoundPage />,
});

function PreviewComponent() {
  const initialSearch = Route.useSearch();
  const params = Route.useParams();
  const [search, setSearch] = createSignal(initialSearch());
  const [isReady, setIsReady] = createSignal(false);
  const ExampleComponent = lazy(
    () =>
      import(
        `../registry/${params().primitive}/examples/${params().registry}/${params().slug}-example.tsx`
      ),
  );

  const registryTheme = createMemo(() => {
    const p = search();
    if (!p.baseColor || !p.theme || !p.menuAccent || !p.radius) {
      return null;
    }

    return buildRegistryTheme({
      baseColor: p.baseColor,
      theme: p.theme,
      menuAccent: p.menuAccent,
      radius: p.radius,
    });
  });

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.data?.type === "design-system-params-sync" && event.data.data)
        setSearch(event.data.data);

      if (event.data?.type === "color-mode-sync" && event.data.data) {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(event.data.data);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "cmd-k-forward", key: e.key } satisfies IframeMessage);
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

      if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
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
            type: "randomize-forward",
            key: e.key,
          } satisfies IframeMessage);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("keydown", handleKeyDown);
      document.getElementById("design-system-theme-vars")?.remove();
    });
  });

  // Apply style/base color/font to document
  createEffect(
    on(
      [() => search().style, () => search().baseColor, () => search().font],
      ([style, baseColor, font]) => {
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

        setIsReady(true);
      },
    ),
  );

  // Apply radius CSS custom property to document.documentElement
  createEffect(
    on(
      () => search().radius,
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
        // Add light mode vars
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
      <ExampleComponent />
    </Show>
  );
}
