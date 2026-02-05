import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { Menu } from "lucide-solid";
import { lazy, Show } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { TableOfContents } from "@/components/toc";
import { createPageHead } from "@/lib/seo";
import { flattenTocUrls } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";

export const Route = createFileRoute("/_website/installation/$slug")({
  loader: async ({ params }) => {
    const doc = docs.find((d) => d.parent === "installation" && d.slug === params.slug);
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
      title: `${loaderData.title} Installation`,
      description: loaderData.description,
      path: `/installation/${loaderData.slug}`,
    });
  },
  component: RouteComponent,
  notFoundComponent: () => <NotFoundPage />,
});

function RouteComponent() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/docs/installation/${doc().slug}.mdx`));

  return (
    <div
      data-slot="docs-layout"
      class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full"
    >
      <Show when={flattenTocUrls(doc().toc).length > 1}>
        <Collapsible class="absolute top-0 right-0 xl:hidden">
          <CollapsibleTrigger
            as={Button}
            variant="secondary"
            size="icon-sm"
            class="z-10"
            data-slot="mobile-toc-trigger"
          >
            <Menu class="size-4" />
            <span class="sr-only">Toggle table of contents</span>
          </CollapsibleTrigger>
          <CollapsibleContent
            class="absolute top-full right-0 z-10 mt-2 w-64 rounded-lg border bg-background p-4 shadow-lg"
            data-slot="mobile-toc-content"
          >
            <ClientOnly>
              <TableOfContents toc={doc().toc} />
            </ClientOnly>
          </CollapsibleContent>
        </Collapsible>
      </Show>
      <div
        data-slot="docs-content"
        class="no-scrollbar flex h-full grow justify-center overflow-y-auto scroll-smooth"
      >
        <div class="w-full lg:max-w-2xl">
          <MDXContent components={sharedComponents} />
        </div>
      </div>
      <Show when={flattenTocUrls(doc().toc).length > 1}>
        <TableOfContents class="hidden h-fit w-fit shrink-0 xl:block xl:w-62" toc={doc().toc} />
      </Show>
    </div>
  );
}
