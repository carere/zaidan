import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createEffect, createMemo, createSignal, lazy, on, onCleanup, onMount } from "solid-js";
import { FONTS, RADII } from "@/lib/config";
import { buildRegistryTheme } from "@/lib/theme-utils";
import type { IframeMessage } from "@/lib/types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/kobalte/ui/empty";

export const Route = createFileRoute("/preview/$primitive/$slug")({
  loader: ({ params }) => {
    const { slug, primitive } = params;
    const component = ui.find((u) => u.slug === slug);
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
  notFoundComponent: (props) => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Component not found</EmptyTitle>
        <EmptyDescription>
          The component "{(props.data as { slug: string }).slug}" doesn't exist or couldn't be
          loaded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
});

function PreviewComponent() {
  const initialSearch = Route.useSearch();
  const params = Route.useParams();
  const [search, setSearch] = createSignal(initialSearch());
  const ExampleComponent = lazy(
    () => import(`../registry/${params().primitive}/examples/${params().slug}-example.tsx`),
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
    });

    // Clean up the style element on unmount
    onCleanup(() => {
      const styleElement = document.getElementById("design-system-theme-vars");
      if (styleElement) {
        styleElement.remove();
      }
    });
  });

  // Apply style classes to document.body
  createEffect(
    on(
      () => search().style,
      (style) => {
        document.body.classList.forEach((className) => {
          if (className.startsWith("style-")) {
            document.body.classList.remove(className);
          }
        });
        document.body.classList.add(`style-${style}`);
      },
    ),
  );

  // Apply base color class to document.body
  createEffect(
    on(
      () => search().baseColor,
      (baseColor) => {
        document.body.classList.forEach((className) => {
          if (className.startsWith("base-color-")) {
            document.body.classList.remove(className);
          }
        });
        if (baseColor) {
          document.body.classList.add(`base-color-${baseColor}`);
        }
      },
    ),
  );

  // Apply font CSS custom property to document.documentElement
  createEffect(
    on(
      () => search().font,
      (font) => {
        const fontConfig = FONTS.find((f) => f.value === font);
        if (fontConfig) {
          document.documentElement.style.setProperty("--font-sans", fontConfig.fontFamily);
        }
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

  return <ExampleComponent />;
}
