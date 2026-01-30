import { createFileRoute, notFound, useRouter } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createEffect, onCleanup, onMount, untrack } from "solid-js";
import { PreviewBadgeNav } from "@/components/preview-badge-nav";
import type { IframeMessage } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/hooks/use-color-mode";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/kobalte/ui/empty";

export const Route = createFileRoute("/_website/ui/{-$slug}")({
  loader: ({ params }) => {
    const doc = ui.find((u) => (params.slug ? u.slug === params.slug : u.slug === "button"));
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    return doc;
  },
  component: RouteComponent,
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
    if (iframeRef) {
      iframeRef.contentWindow?.postMessage({
        type: "design-system-params-sync",
        data: search(),
      } satisfies IframeMessage);
    }
  });

  // Send color mode to iframe when it changes
  createEffect(() => {
    if (iframeRef) {
      iframeRef.contentWindow?.postMessage({
        type: "color-mode-sync",
        data: colorMode(),
      } satisfies IframeMessage);
    }
  });

  return (
    <div class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden rounded-2xl ring-1 ring-foreground/15 md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <iframe
        ref={iframeRef}
        src={
          router.buildLocation({
            to: "/preview/$primitive/$slug",
            params: { primitive: "kobalte", slug: doc().slug },
            search: untrack(search),
          }).pathname
        }
        class="z-10 size-full rounded-lg"
        title="Preview"
      />
      <PreviewBadgeNav slug={doc().slug} class="absolute right-2 bottom-2 isolate z-10" />
    </div>
  );
}
