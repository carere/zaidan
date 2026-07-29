import { createFileRoute } from "@tanstack/solid-router";
import { ChartCatalog } from "@/components/chart-catalog";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/charts/bar");
if (!node) throw new TypeError("The canonical Bar Charts route is missing");
const description = "Browse the Bar Chart Catalog and its isolated visual examples.";

export const Route = createFileRoute("/_product/charts_/bar")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: () => <ChartCatalog family="bar" />,
});
