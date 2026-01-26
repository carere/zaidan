import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Show, Suspense } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { Preview } from "@/components/preview";
import { TableOfContents } from "@/components/toc";
import { useView } from "@/lib/view-context";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";
import { Skeleton } from "@/registry/ui/skeleton";

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
  const { view } = useView();
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/ui/${doc().slug}.mdx`));

  return (
    <div class="relative flex h-[calc(100svh-2*var(--header-height)-1rem)] flex-1 scroll-pt-[calc(var(--header-height)+0.25rem)] sm:h-[calc(100svh-var(--header-height)-2rem)]">
      <Show
        when={view() === "preview"}
        fallback={
          <div class="relative flex sm:mx-auto sm:max-w-6xl">
            <div
              class="no-scrollbar min-w-0 flex-1 overflow-y-auto scroll-smooth sm:px-20"
              id="ui-doc"
            >
              <Suspense fallback={<Skeleton class="h-64 w-full" />}>
                <MDXContent components={sharedComponents} />
              </Suspense>
            </div>
            <TableOfContents class="hidden sm:block" toc={doc().toc} />
          </div>
        }
      >
        <Preview slug={doc().slug} />
      </Show>
    </div>
  );
}
