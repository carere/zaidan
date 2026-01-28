import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createEffect, createSignal, lazy, on, onCleanup, onMount, Show } from "solid-js";
import { ItemPickerScript } from "@/components/item-picker";
import { DarkModeScript } from "@/components/mode-switcher";
import { PreviewStyle } from "@/components/preview-style";
import { RandomizeScript } from "@/components/random-button";
import { FONTS, RADII } from "@/lib/config";
import { validateDesignSystemSearch } from "@/lib/search-params";
import type { IframeMessage } from "@/lib/types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

export const Route = createFileRoute("/preview/$primitive/$slug")({
  validateSearch: validateDesignSystemSearch,
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
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const ExampleComponent = lazy(() => import(`../registry/examples/${data().slug}-example.tsx`));
  const [params, setParams] = createSignal(search());
  const [isReady, setIsReady] = createSignal(false);

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.data?.type === "design-system-params-sync" && event.data.data)
        setParams(event.data.data);
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  // Apply style and baseColor classes to document.body
  createEffect(
    on([() => params().style, () => params().baseColor], ([style, baseColor]) => {
      // Remove old style and base-color classes
      document.body.classList.forEach((className) => {
        if (className.startsWith("style-") || className.startsWith("base-color-")) {
          document.body.classList.remove(className);
        }
      });

      // Add new style and base-color classes
      if (style) document.body.classList.add(`style-${style}`);

      if (baseColor) document.body.classList.add(`base-color-${baseColor}`);

      // Mark as ready after initial style application
      setIsReady(true);
    }),
  );

  // Apply font CSS custom property to document.documentElement
  createEffect(
    on(
      () => params().font,
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
      () => params().radius,
      (radius) => {
        const radiusValue = RADII.find((r) => r.name === radius || r.name === "medium")
          ?.value as string;
        document.documentElement.style.setProperty("--radius", radiusValue);
      },
    ),
  );

  return (
    <>
      <PreviewStyle />
      <DarkModeScript />
      <RandomizeScript />
      <ItemPickerScript />
      <Show when={isReady()}>
        <ExampleComponent />
      </Show>
    </>
  );
}
