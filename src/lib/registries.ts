import { shadcn } from "@velite";

export const REGISTRIES = ["shadcn"] as const;

export type Registry = (typeof REGISTRIES)[number];

export const REGISTRY_META: Record<Registry, { label: string }> = {
  shadcn: { label: "Shadcn" },
};

export function getCollectionByRegistry(registry: Registry) {
  const collections = {
    shadcn,
  } satisfies Record<Registry, typeof shadcn>;

  return collections[registry];
}
