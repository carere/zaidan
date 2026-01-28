import { createEffect, createSignal, on, type ParentProps } from "solid-js";
import { useIframeMessageListener } from "@/hooks/use-iframe-sync";
import { FONTS } from "@/lib/fonts";
import { type DesignSystemSearchParams, useDesignSystemSearchParams } from "@/lib/search-params";

/**
 * Maps radius configuration values to CSS rem values
 */
const RADIUS_MAP: Record<string, string> = {
  none: "0rem",
  small: "0.25rem",
  medium: "0.5rem",
  large: "0.75rem",
};

/**
 * Provider component that wraps preview iframe content, listens for design system
 * params from the parent, and applies CSS variables and class names dynamically
 * to reflect design token changes.
 *
 * This provider:
 * - Uses URL search params with shallow routing for state persistence
 * - Listens for "design-system-params" messages from parent window
 * - Applies style and baseColor as CSS classes on document.body
 * - Applies font via --font-sans CSS custom property on document.documentElement
 * - Applies radius via --radius CSS custom property on document.documentElement
 * - Only renders children when the design system is ready
 */
export function DesignSystemProvider(props: ParentProps) {
  const [params, setParams] = useDesignSystemSearchParams({ shallow: true, history: "replace" });
  const [isReady, setIsReady] = createSignal(false);

  // Listen for messages from parent window to sync design system params
  useIframeMessageListener<Partial<DesignSystemSearchParams>>("design-system-params", (data) => {
    setParams(data);
  });

  // Apply style and baseColor classes to document.body
  createEffect(
    on(
      () => [params().style, params().baseColor],
      ([style, baseColor]) => {
        // Remove old style and base-color classes
        document.body.classList.forEach((className) => {
          if (className.startsWith("style-") || className.startsWith("base-color-")) {
            document.body.classList.remove(className);
          }
        });

        // Add new style and base-color classes
        if (style) {
          document.body.classList.add(`style-${style}`);
        }
        if (baseColor) {
          document.body.classList.add(`base-color-${baseColor}`);
        }

        // Mark as ready after initial style application
        setIsReady(true);
      },
    ),
  );

  // Apply font CSS custom property to document.documentElement
  createEffect(
    on(
      () => params().font,
      (font) => {
        const fontConfig = FONTS.find((f) => f.value === font);
        if (fontConfig) {
          document.documentElement.style.setProperty("--font-sans", fontConfig.fontFamily);
        }
      },
    ),
  );

  // Apply radius CSS custom property to document.documentElement
  createEffect(
    on(
      () => params().radius,
      (radius) => {
        const radiusValue = RADIUS_MAP[radius] || RADIUS_MAP.medium;
        document.documentElement.style.setProperty("--radius", radiusValue);
      },
    ),
  );

  return <>{isReady() ? props.children : null}</>;
}
