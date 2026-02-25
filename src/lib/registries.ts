import { bazza, shadcn } from "@velite";

export const REGISTRIES = ["shadcn", "bazza"] as const;

export type Registry = (typeof REGISTRIES)[number];

export const REGISTRY_META: Record<Registry, { label: string }> = {
  shadcn: { label: "Shadcn" },
  bazza: { label: "Bazza" },
};

export function getCollectionByRegistry(registry: Registry) {
  const collections = {
    shadcn,
    bazza,
  } satisfies Record<Registry, typeof shadcn>;

  return collections[registry];
}
