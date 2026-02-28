import { bazza, docs, motionPrimitives, shadcn } from "@velite";
import { DRAFT_SLUGS } from "@/lib/config";
import type { Registry } from "@/lib/registries";
import type { FileRouteTypes } from "@/routeTree.gen";

export type MergedItem = {
  slug: string;
  title: string;
  description: string;
  toc: (typeof shadcn)[number]["toc"];
  registry: Registry;
};

export type Entry = {
  title: string;
  items: MergedItem[];
  kind?: "ui" | "blocks";
  route: FileRouteTypes["to"];
};

export const isDraft = (slug: string) => DRAFT_SLUGS.includes(slug);

export const filterDrafts = <T extends { slug: string }>(items: T[]) =>
  import.meta.env.DEV ? items : items.filter((item) => !isDraft(item.slug));

function tagWithRegistry<T>(items: T[], registry: Registry): (T & { registry: Registry })[] {
  return items.map((item) => ({ ...item, registry }));
}

export function getAllBlocks(): MergedItem[] {
  return filterDrafts([
    ...tagWithRegistry(bazza, "bazza"),
    ...tagWithRegistry(motionPrimitives, "motion-primitives"),
  ]).sort((a, b) => a.title.localeCompare(b.title));
}

export function getAllUI(): MergedItem[] {
  return filterDrafts(tagWithRegistry(shadcn, "shadcn")).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

export function getEntries(): Entry[] {
  return [
    {
      title: "Getting Started",
      items: docs
        .filter((d) => d.parent === undefined)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        .map((d) => ({ ...d, registry: "shadcn" as const })),
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
