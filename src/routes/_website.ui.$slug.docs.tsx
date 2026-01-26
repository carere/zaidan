import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { PreviewBadgeNav } from "@/components/preview-badge-nav";
import { TableOfContents } from "@/components/toc";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

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
  const MDXContent = lazy(() => import(`../pages/ui/${doc().slug}.mdx`));

  return (
    <div class="relative flex h-[calc(100svh-2*var(--header-height)-1rem)] flex-1 scroll-pt-[calc(var(--header-height)+0.25rem)] rounded-2xl ring-1 ring-foreground/15 sm:h-[calc(100svh-var(--header-height)-2rem)]">
      <div class="z-0 mx-auto max-w-2xl overflow-y-auto scroll-smooth py-10">
        <MDXContent components={sharedComponents} />
        <TableOfContents
          class="absolute top-10 right-0 h-fit max-h-[calc(100vh-var(--header-height)-3rem)] w-56 shrink-0 overflow-y-auto"
          toc={doc().toc}
        />
        <PreviewBadgeNav slug={doc().slug} class="absolute right-2 bottom-2 isolate z-10" />
      </div>
    </div>
  );
}
