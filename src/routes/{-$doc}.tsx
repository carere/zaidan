import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { MDXContent } from "@/components/mdx-content";

export const Route = createFileRoute("/{-$doc}")({
  loader: ({ params }) => {
    const doc = docs.find((d) => (params.doc ? d.slug === params.doc : d.slug === "home"));
    if (!doc) {
      throw notFound({
        data: {
          doc: params.doc,
        },
      });
    }
    return doc.code;
  },
  component: RouteComponent,
  notFoundComponent: (props) => <div>Doc not found: {(props.data as { doc: string }).doc}</div>,
});

function RouteComponent() {
  const code = Route.useLoaderData();

  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      <MDXContent code={code()} />
    </ClientOnly>
  );
}
