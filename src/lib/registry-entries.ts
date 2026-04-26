import { blocks, docs, ui } from "@velite";
import { NEW_COMPONENTS } from "@/lib/config";
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
  kind?: "ui" | "blocks";
  route: FileRouteTypes["to"];
};

export const isNew = (slug: string) => NEW_COMPONENTS.includes(slug);

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
