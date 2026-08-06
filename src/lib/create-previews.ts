import type { Component } from "solid-js";

export const CREATE_SHOWCASES = ["preview-02", "preview"] as const;
export type CreateShowcase = (typeof CREATE_SHOWCASES)[number];

const EXCLUDED_CREATE_ITEMS = new Set([
  "component-example",
  "direction",
  "sidebar-floating",
  "sidebar-icon",
  "sidebar-inset",
  "sonner",
]);

type PreviewModule = { default: Component };
type PreviewKind = "blocks" | "ui";

const previewModules = {
  ...import.meta.glob<PreviewModule>("../registry/kobalte/examples/ui/*-example.tsx"),
  ...import.meta.glob<PreviewModule>("../registry/kobalte/examples/blocks/*-example.tsx"),
};

export function isCreateShowcase(value: string | undefined): value is CreateShowcase {
  return CREATE_SHOWCASES.some((showcase) => showcase === value);
}

export function isExcludedCreateItem(slug: string) {
  return EXCLUDED_CREATE_ITEMS.has(slug);
}

export function getPreviewModule(kind: PreviewKind, primitive: string, slug: string) {
  if (primitive !== "kobalte" || isExcludedCreateItem(slug)) return undefined;
  return previewModules[`../registry/kobalte/examples/${kind}/${slug}-example.tsx`];
}

export function hasPreviewModule(kind: PreviewKind, primitive: string, slug: string) {
  return getPreviewModule(kind, primitive, slug) !== undefined;
}
