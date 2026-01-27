import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { PreviewBadgeNav } from "@/components/preview-badge-nav";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";

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

  return (
    <div class="relative basis-full overflow-hidden rounded-2xl ring-1 ring-foreground/15">
      <iframe
        ref={iframeRef}
        src={`/preview/kobalte/${doc().slug}`}
        class="z-10 size-full rounded-lg"
        title="Preview"
      />
      <PreviewBadgeNav slug={doc().slug} class="absolute right-2 bottom-2 isolate z-10" />
    </div>
  );
}
