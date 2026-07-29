import { createFileRoute } from "@tanstack/solid-router";
import { ChartCatalog } from "@/components/chart-catalog";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/charts");
if (!node) throw new TypeError("The canonical Charts root is missing");
const description = "Browse the Chart Catalog and its isolated visual examples.";

export const Route = createFileRoute("/_product/charts")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: ChartCatalog,
});
