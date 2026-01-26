import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy, Suspense } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";
import { Skeleton } from "@/registry/ui/skeleton";

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
    <div class="relative mx-auto flex max-w-5xl flex-1 gap-8 overflow-hidden overflow-y-auto p-6">
      <div class="min-w-0 flex-1 overflow-y-auto">
        <Suspense fallback={<Skeleton class="h-64 w-full" />}>
          <MDXContent components={sharedComponents} />
        </Suspense>
      </div>
      <TableOfContents toc={doc().toc} />
    </div>
  );
}
