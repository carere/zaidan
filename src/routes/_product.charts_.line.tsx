import { createFileRoute } from "@tanstack/solid-router";
import { ChartCatalog } from "@/components/chart-catalog";
import { getCanonicalNode } from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

const node = getCanonicalNode("/charts/line");
if (!node) throw new TypeError("The canonical Line Charts route is missing");
const description = "Browse the Line Chart Catalog and its isolated visual examples.";

export const Route = createFileRoute("/_product/charts_/line")({
  head: () => createPageHead({ title: node.label, description, path: node.path }),
  component: () => <ChartCatalog family="line" />,
});
