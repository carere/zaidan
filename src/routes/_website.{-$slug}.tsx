import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";
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
      <div data-slot="docs-content" class="no-scrollbar h-full grow overflow-y-auto scroll-smooth">
        <MDXContent components={sharedComponents} />
      </div>
      <TableOfContents class="hidden h-fit w-fit" toc={doc().toc} />
    </div>
  );
}
