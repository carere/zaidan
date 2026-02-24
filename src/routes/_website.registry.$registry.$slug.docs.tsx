import { createFileRoute, notFound } from "@tanstack/solid-router";
import { Menu } from "lucide-solid";
import { lazy, Show } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { PageToggleNav } from "@/components/page-toggle-nav";
import { TableOfContents } from "@/components/toc";
import { getCollectionByRegistry, type Registry } from "@/lib/registries";
import { createPageHead } from "@/lib/seo";
import { flattenTocUrls } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";

export const Route = createFileRoute("/_website/registry/$registry/$slug/docs")({
  loader: ({ params }) => {
    const doc = getCollectionByRegistry(params.registry as Registry).find(
      (u) => u.slug === params.slug,
    );
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    return { ...doc, registry: params.registry };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.title,
      description: loaderData.description,
      path: `/registry/${loaderData.registry}/${loaderData.slug}/docs`,
    });
  },
  component: RouteComponent,
  notFoundComponent: () => <NotFoundPage />,
});

function RouteComponent() {
  const doc = Route.useLoaderData();
  const search = Route.useSearch();
  const routeParams = Route.useParams();
  const MDXContent = lazy(
    () => import(`../pages/${routeParams().registry}/${search().primitive}/${doc().slug}.mdx`),
  );

  return (
    <div
      data-slot="ui-docs-layout"
      class="relative flex w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full"
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
            <TableOfContents toc={doc().toc} />
          </CollapsibleContent>
        </Collapsible>
      </Show>
      <div
        data-slot="ui-docs-content"
        class="no-scrollbar flex h-full grow justify-center overflow-y-auto scroll-smooth"
      >
        <div class="mb-10 w-full lg:max-w-2xl">
          <MDXContent components={sharedComponents} />
        </div>
      </div>
      <Show when={flattenTocUrls(doc().toc).length > 1}>
        <TableOfContents
          class="hidden h-fit w-fit shrink-0 xl:block xl:w-50 xl:pt-10"
          toc={doc().toc}
        />
      </Show>
      <PageToggleNav
        registry={routeParams().registry}
        slug={doc().slug}
        class="absolute right-2 bottom-2 isolate z-10"
      />
    </div>
  );
}
