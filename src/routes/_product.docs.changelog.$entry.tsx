import { createFileRoute } from "@tanstack/solid-router";
import { CanonicalDocsRouteView } from "@/components/docs-shell";
import { resolveCanonicalDocsRoute } from "@/lib/canonical-docs-route";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_product/docs/changelog/$entry")({
  loader: ({ params }) => resolveCanonicalDocsRoute(`/docs/changelog/${params.entry}`),
  head: ({ loaderData }) =>
    loaderData
      ? createPageHead({
          title: loaderData.node.label,
          description: loaderData.node.description ?? "",
          path: loaderData.node.path,
          type: "article",
        })
      : {},
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <CanonicalDocsRouteView data={data()} />;
}
