import { createFileRoute } from "@tanstack/solid-router";
import { ChartCatalog } from "@/components/chart-catalog";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/charts/tooltip");
if (!node) throw new TypeError("The canonical Tooltip Charts route is missing");
const description = "Browse source-pinned Tooltip Chart Catalog Entries and isolated Previews.";

export const Route = createFileRoute("/_product/charts_/tooltip")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: () => <ChartCatalog family="tooltip" />,
});
