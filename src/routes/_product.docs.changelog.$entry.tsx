import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CanonicalPage } from "@/components/canonical-route";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_product/docs/changelog/$entry")({
  loader: ({ params }) => {
    const node = getCanonicalNode(`/docs/changelog/${params.entry}`);
    if (!node) throw notFound();
    return node;
  },
  head: ({ loaderData }) =>
    loaderData
      ? createPageHead({
          title: loaderData.label,
          description: loaderData.description ?? "",
          path: loaderData.path,
          type: "article",
        })
      : {},
  component: RouteComponent,
});

function RouteComponent() {
  const node = Route.useLoaderData();
  return <CanonicalPage node={node()} />;
}
