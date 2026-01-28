import { useNavigate, useSearch } from "@tanstack/solid-router";
import { createMemo } from "solid-js";
import { DEFAULT_CONFIG, type DesignSystemConfig } from "@/lib/config";

/**
 * Type alias for search params that match the design system configuration
 */
export type DesignSystemSearchParams = DesignSystemConfig;

/**
 * Options for the useDesignSystemSearchParams hook
 */
export interface UseDesignSystemSearchParamsOptions {
  /** If true, use shallow routing (no full page navigation) */
  shallow?: boolean;
  /** History mode: "push" adds new entry, "replace" replaces current entry */
  history?: "push" | "replace";
}

/**
 * Validates and provides defaults for design system search params
 * Ensures all values are valid by falling back to defaults for missing/invalid values
 *
 * @param search - Raw search params from URL
 * @returns Validated DesignSystemSearchParams with defaults applied
 */
export function validateDesignSystemSearch(
  search: Record<string, unknown>,
): DesignSystemSearchParams {
  return {
    style: (search.style as DesignSystemConfig["style"]) || DEFAULT_CONFIG.style,
    baseColor: (search.baseColor as DesignSystemConfig["baseColor"]) || DEFAULT_CONFIG.baseColor,
    theme: (search.theme as DesignSystemConfig["theme"]) || DEFAULT_CONFIG.theme,
    font: (search.font as DesignSystemConfig["font"]) || DEFAULT_CONFIG.font,
    radius: (search.radius as DesignSystemConfig["radius"]) || DEFAULT_CONFIG.radius,
    menuAccent:
      (search.menuAccent as DesignSystemConfig["menuAccent"]) || DEFAULT_CONFIG.menuAccent,
  };
}

/**
 * Serializes design system search params to a URL query string
 * Only includes non-default values to keep URLs clean and readable
 *
 * @param basePath - The base path for the URL (e.g., "/ui/button")
 * @param params - Partial design system params to serialize
 * @returns Full URL path with query string (or just path if no non-default params)
 */
export function serializeDesignSystemSearchParams(
  basePath: string,
  params: Partial<DesignSystemSearchParams>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // Only include if different from default
    if (value !== undefined && value !== DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG]) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Hook for managing design system search params in the URL
 * Provides reactive access to validated params and a setter for updates
 *
 * @param options - Configuration options for navigation behavior
 * @returns Tuple of [params accessor, setParams function]
 *
 * @example
 * ```tsx
 * const [params, setParams] = useDesignSystemSearchParams();
 *
 * // Read current theme
 * console.log(params().theme);
 *
 * // Update theme
 * setParams({ theme: "blue" });
 *
 * // Update multiple values
 * setParams({ theme: "blue", radius: "large" });
 * ```
 */
export function useDesignSystemSearchParams(options?: UseDesignSystemSearchParamsOptions) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const params = createMemo(() => validateDesignSystemSearch(search() as Record<string, unknown>));

  const setParams = (updates: Partial<DesignSystemSearchParams>) => {
    const currentSearch = search() as Record<string, unknown>;
    navigate({
      to: ".",
      search: { ...currentSearch, ...updates },
      replace: options?.history === "replace",
    });
  };

  return [params, setParams] as const;
}
