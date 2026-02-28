import { bazza, motionPrimitives, shadcn } from "@velite";

export const REGISTRIES = ["shadcn", "bazza", "motion-primitives"] as const;

export type Registry = (typeof REGISTRIES)[number];

export const EXTERNAL_REGISTRIES = REGISTRIES.filter((r) => r !== "shadcn");

export type Kind = "ui" | "blocks";

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

export function getKindForRegistry(registry: Registry): Kind {
  return registry === "shadcn" ? "ui" : "blocks";
}

export function getRegistrySlug(componentName: string, registry: Registry): string {
  return registry === "shadcn" ? componentName : `${registry}-${componentName}`;
}

export function getDisplayName(
  title: string,
  registry: Registry,
): { title: string; suffix?: string } {
  return registry === "shadcn" ? { title } : { title, suffix: REGISTRY_META[registry].label };
}

export function getRegistryForBlockSlug(slug: string): Registry | undefined {
  for (const registry of EXTERNAL_REGISTRIES) {
    const collection = getCollectionByRegistry(registry);
    if (collection.some((item) => item.slug === slug)) {
      return registry;
    }
  }
  return undefined;
}
