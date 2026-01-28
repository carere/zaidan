import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createEffect, onCleanup } from "solid-js";
import { CMD_K_FORWARD_TYPE } from "@/components/item-picker";
import { DARK_MODE_FORWARD_TYPE } from "@/components/mode-switcher";
import { PreviewBadgeNav } from "@/components/preview-badge-nav";
import { RANDOMIZE_FORWARD_TYPE } from "@/components/random-button";
import { sendToIframe } from "@/hooks/use-iframe-sync";
import {
  serializeDesignSystemSearchParams,
  useDesignSystemSearchParams,
} from "@/lib/search-params";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

/** Message type for syncing design system params to iframe */
const DESIGN_SYSTEM_PARAMS_SYNC_TYPE = "design-system-params-sync";

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
  let iframeRef: HTMLIFrameElement | undefined;
  const doc = Route.useLoaderData();
  const [params] = useDesignSystemSearchParams();

  // Send design system params to iframe when they change or when iframe loads
  createEffect(() => {
    const currentParams = params();

    // Send params immediately (for when params change)
    if (iframeRef) {
      sendToIframe(iframeRef, DESIGN_SYSTEM_PARAMS_SYNC_TYPE, { params: currentParams });
    }
  });

  // Handle iframe load to send initial params
  const handleIframeLoad = () => {
    if (iframeRef) {
      sendToIframe(iframeRef, DESIGN_SYSTEM_PARAMS_SYNC_TYPE, { params: params() });
    }
  };

  // Handle forwarded keyboard shortcuts from iframe
  createEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === DARK_MODE_FORWARD_TYPE) {
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key || "d",
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      } else if (event.data.type === RANDOMIZE_FORWARD_TYPE) {
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key || "r",
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      } else if (event.data.type === CMD_K_FORWARD_TYPE) {
        const syntheticEvent = new KeyboardEvent("keydown", {
          key: event.data.key || "k",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(syntheticEvent);
      }
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  return (
    <div class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden rounded-2xl ring-1 ring-foreground/15 md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <iframe
        ref={iframeRef}
        src={serializeDesignSystemSearchParams(`/preview/kobalte/${doc().slug}`, params())}
        class="z-10 size-full rounded-lg"
        title="Preview"
        onLoad={handleIframeLoad}
      />
      <PreviewBadgeNav slug={doc().slug} class="absolute right-2 bottom-2 isolate z-10" />
    </div>
  );
}
