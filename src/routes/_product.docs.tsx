import { createFileRoute, Outlet, useLocation } from "@tanstack/solid-router";
import { CanonicalPage } from "@/components/canonical-route";
import { requireCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = requireCanonicalNode("/docs");

export const Route = createFileRoute("/_product/docs")({
  head: () =>
    createPageHead({ title: node.label, description: node.description ?? "", path: node.path }),
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  return location().pathname === "/docs" ? <CanonicalPage node={node} /> : <Outlet />;
}
