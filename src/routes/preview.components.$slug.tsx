import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CanonicalPreview } from "@/components/canonical-route";
import { getCanonicalNode, resolvePreviewRequest } from "@/lib/product-routing";
import { createPreviewHead } from "@/lib/seo";

export const Route = createFileRoute("/preview/components/$slug")({
  headers: () => ({ "X-Robots-Tag": "noindex, follow" }),
  loader: ({ location }) => {
    const resolution = resolvePreviewRequest(
      `${location.pathname}${location.searchStr}${location.hash}`,
    );
    if (!resolution.accepted || resolution.kind !== "components" || !resolution.slug) {
      throw notFound();
    }
    return resolution;
  },
  head: ({ params }) => {
    const node = getCanonicalNode(`/components/${params.slug}`);
    return createPreviewHead({
      title: `${node?.label ?? "Component"} Preview`,
      description: node?.description ?? "Isolated Component Preview.",
      canonicalPath: node?.path ?? "/components",
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const preview = Route.useLoaderData();
  return (
    <CanonicalPreview
      kind="components"
      slug={preview().slug as string}
      fragment={preview().fragment}
    />
  );
}
