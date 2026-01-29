import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createEffect, createSignal, lazy, on, onCleanup, onMount } from "solid-js";
import { FONTS, RADII } from "@/lib/config";
import type { IframeMessage } from "@/lib/types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

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
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const ExampleComponent = lazy(() => import(`../registry/examples/${data().slug}-example.tsx`));
  const [params, setParams] = createSignal(search());

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.data?.type === "design-system-params-sync" && event.data.data)
        setParams(event.data.data);

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
  });

  // Apply style classes to document.body
  createEffect(
    on(
      () => params().style,
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

  return <ExampleComponent />;
}
