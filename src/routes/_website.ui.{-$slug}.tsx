import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Show, Suspense } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { Preview } from "@/components/preview";
import { TableOfContents } from "@/components/toc";
import { cn } from "@/lib/utils";
import { useView } from "@/lib/view-context";

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
  notFoundComponent: (props) => {
    return <div>Component not found: {(props.data as { slug: string }).slug}</div>;
  },
});

function RouteComponent() {
  const { view } = useView();
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/ui/${doc().slug}.mdx`));

  return (
    <div
      class={cn(
        "relative flex h-[calc(100svh-2*var(--header-height)-1rem)] flex-1 scroll-pt-[calc(var(--header-height)+0.25rem)] sm:h-[calc(100svh-var(--header-height)-2rem)]",
        { "rounded-lg border": view() === "preview" },
      )}
    >
      <Show
        when={view() === "preview"}
        fallback={
          <div class="relative mx-auto flex max-w-6xl">
            <div
              class="no-scrollbar min-w-0 flex-1 overflow-y-auto scroll-smooth px-20"
              id="ui-doc"
            >
              <Suspense fallback={<div>Skeleton ui docs page</div>}>
                <MDXContent components={sharedComponents} />
              </Suspense>
            </div>
            <TableOfContents toc={doc().toc} />
          </div>
        }
      >
        <Preview slug={doc().slug} />
      </Show>
    </div>
  );
}
