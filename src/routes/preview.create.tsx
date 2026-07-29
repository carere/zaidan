import { createFileRoute, notFound } from "@tanstack/solid-router";
import { CreatePreviewSurface } from "@/components/create-preview";
import { resolvePreviewRequest } from "@/lib/product-routing";
import { createPreviewHead } from "@/lib/seo";

export const Route = createFileRoute("/preview/create")({
  headers: () => ({ "X-Robots-Tag": "noindex, follow" }),
  loader: ({ location }) => {
    const resolution = resolvePreviewRequest(
      `${location.pathname}${location.searchStr}${location.hash}`,
    );
    if (!resolution.accepted || resolution.kind !== "create") throw notFound();
    return resolution;
  },
  head: () =>
    createPreviewHead({
      title: "Create Preview",
      description: "Isolated Create Workspace Preview.",
      canonicalPath: "/create",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const preview = Route.useLoaderData();
  return <CreatePreviewSurface preset={preview().preset} />;
}
