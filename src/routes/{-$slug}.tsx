import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { MDXContent } from "@/components/mdx-content";
import { TableOfContents } from "@/components/toc";

export const Route = createFileRoute("/{-$slug}")({
  loader: ({ params }) => {
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
  notFoundComponent: (props) => <div>Doc not found: {(props.data as { slug: string }).slug}</div>,
});

function RouteComponent() {
  const doc = Route.useLoaderData();

  return (
    <div class="mx-auto flex max-w-7xl gap-8 overflow-y-auto p-6">
      <div class="min-w-0 flex-1">
        <ClientOnly fallback={<div>Loading documentation...</div>}>
          <MDXContent code={doc().code} />
        </ClientOnly>
      </div>
      <TableOfContents toc={doc().toc} />
    </div>
  );
}
