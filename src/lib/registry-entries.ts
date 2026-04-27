import { blocks, docs, ui } from "@velite";
import { UPDATED_ITEMS, type UpdatedItem } from "@/lib/config";
import type { FileRouteTypes } from "@/routeTree.gen";

export type MergedItem = {
  slug: string;
  title: string;
  description: string;
  toc: (typeof ui)[number]["toc"];
};

export type Entry = {
  title: string;
  items: MergedItem[];
  kind: "docs" | "ui" | "blocks";
  route: FileRouteTypes["to"];
};

export const hasUpdate = (slug: string, kind: UpdatedItem["kind"]) =>
  UPDATED_ITEMS.some((item) => item.kind === kind && item.slug === slug);

export function getAllBlocks(): MergedItem[] {
  return [...blocks].sort((a, b) => a.title.localeCompare(b.title));
}

export function getAllUI(): MergedItem[] {
  return [...ui].sort((a, b) => a.title.localeCompare(b.title));
}

export function getEntries(): Entry[] {
  return [
    {
      title: "Getting Started",
      items: docs
        .filter((d) => d.parent === undefined)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)),
      kind: "docs",
      route: "/$slug",
    },
    {
      title: "Blocks",
      items: getAllBlocks(),
      kind: "blocks",
      route: "/blocks/{-$slug}",
    },
    {
      title: "UI",
      items: getAllUI(),
      kind: "ui",
      route: "/ui/{-$slug}",
    },
  ];
}
