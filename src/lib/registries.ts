import { bazza, motionPrimitives, shadcn } from "@velite";

export const REGISTRIES = ["shadcn", "bazza", "motion-primitives"] as const;

export type Registry = (typeof REGISTRIES)[number];

export const REGISTRY_META: Record<Registry, { label: string }> = {
  shadcn: { label: "Shadcn" },
  bazza: { label: "Bazza" },
  "motion-primitives": { label: "Motion Primitives" },
};

export function getCollectionByRegistry(registry: Registry) {
  const collections = {
    shadcn,
    bazza,
    "motion-primitives": motionPrimitives,
  } satisfies Record<Registry, typeof shadcn>;

  return collections[registry];
}
