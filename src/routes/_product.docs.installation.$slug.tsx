import { createFileRoute } from "@tanstack/solid-router";
import { createCanonicalDocsRouteOptions } from "@/lib/canonical-docs-route";

export const Route = createFileRoute("/_product/docs/installation/$slug")(
  createCanonicalDocsRouteOptions<{ slug: string }>(({ slug }) => `/docs/installation/${slug}`),
);
