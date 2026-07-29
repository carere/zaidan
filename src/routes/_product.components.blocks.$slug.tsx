import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CanonicalPage } from "@/components/canonical-route";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_product/components/blocks/$slug")({
  loader: ({ params }) => {
    const node = getCanonicalNode(`/components/blocks/${params.slug}`);
    if (!node) throw notFound();
    return node;
  },
  head: ({ loaderData }) =>
    loaderData
      ? createPageHead({
          title: loaderData.label,
          description: loaderData.description ?? "",
          path: loaderData.path,
        })
      : {},
  component: RouteComponent,
});

function RouteComponent() {
  const node = Route.useLoaderData();
  return <CanonicalPage node={node()} />;
}
