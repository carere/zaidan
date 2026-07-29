import { createFileRoute, Outlet, useLocation } from "@tanstack/solid-router";
import { CanonicalPage } from "@/components/canonical-route";
import { requireCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = requireCanonicalNode("/components/blocks");
const description = "Browse authored Zaidan Blocks.";

export const Route = createFileRoute("/_product/components/blocks")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  return location().pathname === "/components/blocks" ? (
    <CanonicalPage node={{ ...node, description }} />
  ) : (
    <Outlet />
  );
}
