import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { Menu } from "lucide-solid";
import { lazy } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";
import { Button } from "@/registry/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/registry/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

export const Route = createFileRoute("/_website/{-$slug}")({
  loader: async ({ params }) => {
    const doc = docs.find((d) => (params.slug ? d.slug === params.slug : d.slug === "home"));
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
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          The page "{(props.data as { slug: string }).slug}" doesn't exist or couldn't be loaded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
});

function RouteComponent() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/docs/${doc().slug}.mdx`));

  return (
    <div
      data-slot="docs-layout"
      class="relative flex w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)]"
    >
      {/* Mobile/Tablet TOC - shown below md breakpoint */}
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
      <div data-slot="docs-content" class="no-scrollbar h-full grow overflow-y-auto scroll-smooth">
        <MDXContent components={sharedComponents} />
      </div>
      <TableOfContents class="hidden h-fit w-fit xl:block" toc={doc().toc} />
    </div>
  );
}
