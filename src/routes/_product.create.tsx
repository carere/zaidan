import { createFileRoute } from "@tanstack/solid-router";
import { CreateWorkspace } from "@/components/create-workspace";
import { resolveCreateLocation } from "@/lib/preset-token";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/create");
if (!node) throw new TypeError("The canonical Create root is missing");
const description = "Configure a Design Configuration in the Create Workspace.";

export const Route = createFileRoute("/_product/create")({
  loader: ({ location }) => resolveCreateLocation(`${location.pathname}${location.searchStr}`),
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: RouteComponent,
});

function RouteComponent() {
  const initial = Route.useLoaderData();
  return <CreateWorkspace initial={initial()} />;
}
