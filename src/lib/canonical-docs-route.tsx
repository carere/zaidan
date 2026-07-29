import { notFound, useLoaderData } from "@tanstack/solid-router";
import type { Accessor } from "solid-js";
import { CanonicalDocsPage } from "@/components/docs-shell";
import {
  type CanonicalNode,
  type CanonicalReadingEntry,
  getCanonicalNode,
  getCanonicalReadingEntry,
} from "@/lib/product-routing";
import { createPageHead } from "@/lib/seo";

export type CanonicalDocsRouteData = {
  node: CanonicalNode;
  entry: CanonicalReadingEntry;
};

export const resolveCanonicalDocsRoute = (path: string): CanonicalDocsRouteData => {
  const node = getCanonicalNode(path);
  if (!node || node.surface !== "docs") throw notFound();
  const entry = getCanonicalReadingEntry(node.path);
  if (!entry) throw notFound();
  return { node, entry };
};

function CanonicalDocsRouteComponent() {
  const data = useLoaderData({ strict: false }) as Accessor<CanonicalDocsRouteData>;
  return <CanonicalDocsPage data={data()} />;
}

export const createCanonicalDocsRouteOptions = <TParams extends Record<string, string>>(
  pathForParams: (params: TParams) => string,
  metadata: { type?: "article" } = {},
) => ({
  loader: ({ params }: { params: TParams }) => resolveCanonicalDocsRoute(pathForParams(params)),
  head: ({ loaderData }: { loaderData?: CanonicalDocsRouteData }) =>
    loaderData
      ? createPageHead({
          title: loaderData.node.label,
          description: loaderData.node.description ?? "",
          path: loaderData.node.path,
          ...metadata,
        })
      : {},
  component: CanonicalDocsRouteComponent,
});
