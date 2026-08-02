import { blocks, docs, ui } from "@velite";
import { UPDATED_ITEMS, type UpdatedItem } from "@/lib/config";

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
};

const CHANGELOG_ENTRY: MergedItem = {
  slug: "changelog",
  title: "Changelog",
  description: "Latest updates and announcements for the Zaidan registry.",
  toc: [],
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
      items: [
        ...docs
          .filter((d) => d.parent === undefined && d.slug !== "index" && d.slug !== "components")
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)),
        CHANGELOG_ENTRY,
      ],
      kind: "docs",
    },
    {
      title: "Blocks",
      items: getAllBlocks(),
      kind: "blocks",
    },
    {
      title: "UI",
      items: getAllUI(),
      kind: "ui",
    },
  ];
}

export function getPreviewEntries(): Entry[] {
  return getEntries().filter((entry) => entry.kind !== "docs");
}
