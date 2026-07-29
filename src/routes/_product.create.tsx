import { createFileRoute } from "@tanstack/solid-router";
import { CanonicalPage } from "@/components/canonical-route";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/create");
if (!node) throw new TypeError("The canonical Create root is missing");
const description = "Configure a Design Configuration in the Create Workspace.";

export const Route = createFileRoute("/_product/create")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: () => <CanonicalPage node={{ ...node, description }} />,
});
