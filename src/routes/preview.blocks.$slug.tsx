import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CanonicalPreview } from "@/components/canonical-route";
import { getCanonicalNode, resolvePreviewRequest } from "@/lib/product-routing";
import { createPreviewHead } from "@/lib/seo";

export const Route = createFileRoute("/preview/blocks/$slug")({
  headers: () => ({ "X-Robots-Tag": "noindex, follow" }),
  loader: ({ location }) => {
    const resolution = resolvePreviewRequest(
      `${location.pathname}${location.searchStr}${location.hash}`,
    );
    if (!resolution.accepted || resolution.kind !== "blocks" || !resolution.slug) {
      throw notFound();
    }
    return resolution;
  },
  head: ({ params }) => {
    const node = getCanonicalNode(`/components/blocks/${params.slug}`);
    return createPreviewHead({
      title: `${node?.label ?? "Block"} Preview`,
      description: node?.description ?? "Isolated Block Preview.",
      canonicalPath: node?.path ?? "/components/blocks",
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const preview = Route.useLoaderData();
  return (
    <CanonicalPreview kind="blocks" slug={preview().slug as string} fragment={preview().fragment} />
  );
}
