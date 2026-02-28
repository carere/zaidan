import { createFileRoute, useRouter } from "@tanstack/solid-router";
import { createEffect, onCleanup, onMount, untrack } from "solid-js";
import { createPageHead } from "@/lib/seo";
import type { IframeMessage } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/components/color-mode";

export const Route = createFileRoute("/_website/")({
  head: () => {
    return createPageHead({
      title: "Home",
      description:
        "A beautiful ShadCN UI registry for SolidJS - accessible, customizable components built on Kobalte and Corvu.",
      path: "/",
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
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
    <div class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <iframe
        ref={iframeRef}
        src={
          router.buildLocation({
            to: "/preview/home",
            search: untrack(search),
          }).href
        }
        class="z-10 size-full rounded-lg"
        title="Home Preview"
      />
    </div>
  );
}
