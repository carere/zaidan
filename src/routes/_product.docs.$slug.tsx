import { createFileRoute } from "@tanstack/solid-router";
import { CanonicalDocsRouteView } from "@/components/docs-shell";
import { resolveCanonicalDocsRoute } from "@/lib/canonical-docs-route";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_product/docs/$slug")({
  loader: ({ params }) => resolveCanonicalDocsRoute(`/docs/${params.slug}`),
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
  return <CanonicalDocsRouteView data={data()} />;
}
