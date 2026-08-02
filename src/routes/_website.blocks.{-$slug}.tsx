import { createFileRoute, notFound, useRouter } from "@tanstack/solid-router";
import { blocks } from "@velite";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";
import { NotFoundPage } from "@/components/not-found-page";
import { createPageHead } from "@/lib/seo";
import type { IframeMessage } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/components/color-mode";

export const Route = createFileRoute("/_website/blocks/{-$slug}")({
  loader: ({ params }) => {
    const doc = blocks.find((u) => (params.slug ? u.slug === params.slug : false)) ?? blocks[0];
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    return doc;
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

  // Send color mode to iframe when it changes
  createEffect(() => {
    iframeRef?.contentWindow?.postMessage({
      type: "color-mode-sync",
      data: colorMode(),
    } satisfies IframeMessage);
  });

  const href = createMemo(() => {
    const slug = doc().slug;
    return router.buildLocation({
      to: "/preview/$kind/$primitive/$slug",
      params: { kind: "blocks", primitive: "kobalte", slug },
    }).href;
  });

  return (
    <div class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden rounded-2xl ring-1 ring-foreground/15 md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <iframe ref={iframeRef} src={href()} class="z-10 size-full rounded-lg" title="Preview" />
    </div>
  );
}
