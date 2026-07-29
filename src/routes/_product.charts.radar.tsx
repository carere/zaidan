import { createFileRoute } from "@tanstack/solid-router";
import { ChartCatalog } from "@/components/chart-catalog";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/charts/radar");
if (!node) throw new TypeError("The canonical Radar Charts route is missing");
const description = "Browse fourteen source-pinned Radar Chart Catalog Entries.";

export const Route = createFileRoute("/_product/charts/radar")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: () => <ChartCatalog family="radar" />,
});
