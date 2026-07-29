import { createFileRoute, notFound } from "@tanstack/solid-router";
import { resolvePreviewRequest } from "@/lib/product-routing";
import { createPreviewHead } from "@/lib/seo";

export const Route = createFileRoute("/preview/charts/$slug")({
  headers: () => ({ "X-Robots-Tag": "noindex, follow" }),
  loader: ({ location }) => {
    const resolution = resolvePreviewRequest(
      `${location.pathname}${location.searchStr}${location.hash}`,
    );
    if (!resolution.accepted || resolution.kind !== "charts") throw notFound();
    return resolution;
  },
  head: () =>
    createPreviewHead({
      title: "Chart Preview",
      description: "Isolated Chart Catalog Preview.",
      canonicalPath: "/charts",
    }),
  component: () => null,
});
