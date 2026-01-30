import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { Menu } from "lucide-solid";
import { lazy } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { PreviewBadgeNav } from "@/components/preview-badge-nav";
import { TableOfContents } from "@/components/toc";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/kobalte/ui/empty";

export const Route = createFileRoute("/_website/ui/$slug/docs")({
  loader: ({ params }) => {
    const doc = ui.find((u) => u.slug === params.slug);
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
  const doc = Route.useLoaderData();
  const search = Route.useSearch();
  const MDXContent = lazy(() => import(`../pages/ui/${search().primitive}/${doc().slug}.mdx`));

  return (
    <div
      data-slot="ui-docs-layout"
      class="relative flex w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full"
    >
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
      <div
        data-slot="ui-docs-content"
        class="no-scrollbar flex h-full grow justify-center overflow-y-auto scroll-smooth"
      >
        <div class="mb-10 w-full lg:max-w-2xl">
          <MDXContent components={sharedComponents} />
        </div>
      </div>
      <TableOfContents
        class="hidden h-fit w-fit shrink-0 xl:block xl:w-50 xl:pt-10"
        toc={doc().toc}
      />
      <PreviewBadgeNav slug={doc().slug} class="absolute right-2 bottom-2 isolate z-10" />
    </div>
  );
}
