import { createFileRoute } from "@tanstack/solid-router";
import { createCanonicalDocsRouteOptions } from "@/lib/canonical-docs-route";

export const Route = createFileRoute("/_product/docs/changelog/$entry")(
  createCanonicalDocsRouteOptions<{ entry: string }>(({ entry }) => `/docs/changelog/${entry}`, {
    type: "article",
  }),
);
