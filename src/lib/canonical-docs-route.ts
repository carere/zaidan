import { notFound } from "@tanstack/solid-router";
import {
  type CanonicalNode,
  type CanonicalReadingEntry,
  getCanonicalNode,
  getCanonicalReadingEntry,
} from "@/lib/product-routing";

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
