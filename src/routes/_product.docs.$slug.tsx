import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CanonicalDocsPage } from "@/components/docs-shell";
import { getCanonicalNode, getCanonicalReadingEntry } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_product/docs/$slug")({
  loader: ({ params }) => {
    const node = getCanonicalNode(`/docs/${params.slug}`);
    if (!node || node.surface !== "docs") throw notFound();
    const entry = getCanonicalReadingEntry(node.path);
    if (!entry) throw notFound();
    return { node, entry };
  },
  head: ({ loaderData }) =>
    loaderData
      ? createPageHead({
          title: loaderData.node.label,
          description: loaderData.node.description ?? "",
          path: loaderData.node.path,
        })
      : {},
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <CanonicalDocsPage node={data().node} entry={data().entry} />;
}
