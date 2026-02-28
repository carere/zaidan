import { createFileRoute, notFound, useRouter } from "@tanstack/solid-router";
import { bazza, motionPrimitives } from "@velite";
import { createEffect, onCleanup, onMount, untrack } from "solid-js";
import { NotFoundPage } from "@/components/not-found-page";
import { PageToggleNav } from "@/components/page-toggle-nav";
import { getRegistryForBlockSlug } from "@/lib/registries";
import { createPageHead } from "@/lib/seo";
import type { IframeMessage } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/components/color-mode";

export const Route = createFileRoute("/_website/blocks/{-$slug}")({
  loader: ({ params }) => {
    const allBlocks = [...bazza, ...motionPrimitives];
    const doc =
      allBlocks.find((u) => (params.slug ? u.slug === params.slug : false)) ?? allBlocks[0];
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    const registry = getRegistryForBlockSlug(doc.slug);
    return { ...doc, registry };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.title,
      description: loaderData.description,
      path: `/blocks/${loaderData.slug}`,
    });
  },
  component: RouteComponent,
  notFoundComponent: () => <NotFoundPage />,
});

function RouteComponent() {
  const router = useRouter();
  const doc = Route.useLoaderData();
  const search = Route.useSearch();
  const { colorMode } = useColorMode();

  let iframeRef: HTMLIFrameElement | undefined;

  // Handle forwarded keyboard shortcuts from iframe
  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.data.type === "dark-mode-forward") {
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      } else if (event.data.type === "randomize-forward") {
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      } else if (event.data.type === "cmd-k-forward") {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key,
          metaKey: isMac,
          ctrlKey: !isMac,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      }
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  // Send design system params to iframe when they change
  createEffect(() => {
    iframeRef?.contentWindow?.postMessage({
      type: "design-system-params-sync",
      data: search(),
    } satisfies IframeMessage);
  });

  // Send color mode to iframe when it changes
  createEffect(() => {
    iframeRef?.contentWindow?.postMessage({
      type: "color-mode-sync",
      data: colorMode(),
    } satisfies IframeMessage);
  });

  return (
    <div class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden rounded-2xl ring-1 ring-foreground/15 md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <iframe
        ref={iframeRef}
        src={
          router.buildLocation({
            to: "/preview/$kind/$primitive/$slug",
            params: { kind: "blocks", primitive: "kobalte", slug: doc().slug },
            search: untrack(search),
          }).href
        }
        class="z-10 size-full rounded-lg"
        title="Preview"
      />
      <PageToggleNav
        kind="blocks"
        slug={doc().slug}
        class="absolute right-2 bottom-2 isolate z-10"
      />
    </div>
  );
}
