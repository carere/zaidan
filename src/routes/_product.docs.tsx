import { createFileRoute, Outlet, useLocation } from "@tanstack/solid-router";
import { CanonicalDocsPage } from "@/components/docs-shell";
import { requireCanonicalNode, requireCanonicalReadingEntry } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = requireCanonicalNode("/docs");
const entry = requireCanonicalReadingEntry("/docs");
const data = { node, entry };

export const Route = createFileRoute("/_product/docs")({
  head: () =>
    createPageHead({ title: node.label, description: node.description ?? "", path: node.path }),
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  return location().pathname === "/docs" ? <CanonicalDocsPage data={data} /> : <Outlet />;
}
