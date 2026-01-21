import registry from "../../registry.json";

/**
 * Registry item from registry.json
 */
export type RegistryItem = (typeof registry.items)[number];

/**
 * Primitive type for components - either kobalte-based or base (no kobalte dependency)
 */
export type Primitive = "kobalte" | "base";

/**
 * Determine if a component uses kobalte or base primitives
 * based on whether it has @kobalte/core as a dependency
 *
 * @param slug - The component slug (e.g., "button", "alert")
 * @returns The primitive type or null if component not found
 */
export function getComponentPrimitive(slug: string): Primitive | null {
  const component = registry.items.find((item) => item.name === slug);
  if (!component) {
    return null;
  }
  return component.dependencies?.includes("@kobalte/core") ? "kobalte" : "base";
}

/**
 * Check if a component exists in the registry
 *
 * @param slug - The component slug (e.g., "button", "alert")
 * @returns true if the component exists in the registry
 */
export function componentExists(slug: string): boolean {
  return registry.items.some((item) => item.name === slug);
}

/**
 * Get component metadata from registry
 *
 * @param slug - The component slug (e.g., "button", "alert")
 * @returns The component metadata or null if not found
 */
export function getComponentMetadata(slug: string): RegistryItem | null {
  return registry.items.find((item) => item.name === slug) ?? null;
}

/**
 * Get all component slugs from the registry
 *
 * @returns Array of all component slugs
 */
export function getAllComponentSlugs(): string[] {
  return registry.items.map((item) => item.name);
}

/**
 * Validate that a primitive value is valid
 *
 * @param primitive - The primitive value to validate
 * @returns true if the primitive is valid
 */
export function isValidPrimitive(primitive: string): primitive is Primitive {
  return primitive === "kobalte" || primitive === "base";
}

/**
 * Check if an example file exists for a given slug
 * This is a runtime check using dynamic imports
 *
 * @param slug - The component slug
 * @returns A promise that resolves to true if the example exists
 */
export async function exampleExists(slug: string): Promise<boolean> {
  try {
    await import(`../registry/examples/${slug}-example.tsx`);
    return true;
  } catch {
    return false;
  }
}
