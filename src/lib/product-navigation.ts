const DESIGN_CONFIGURATION_KEYS = new Set([
  "preset",
  "primitive",
  "style",
  "baseColor",
  "theme",
  "chartColor",
  "font",
  "headingFont",
  "radius",
  "menuAccent",
]);

const localHref = (url: URL) => `${url.pathname}${url.search}${url.hash}`;

/**
 * Resolves Product Header destinations without leaking Create-owned state.
 * Explicit destination fragments win; a same-page fragment is otherwise kept.
 */
export function resolveProductNavigationHref(target: string, current: string) {
  const currentUrl = new URL(current);
  const targetUrl = new URL(target, currentUrl.origin);

  if (targetUrl.origin !== currentUrl.origin) return target;

  if (!targetUrl.hash && targetUrl.pathname === currentUrl.pathname) {
    targetUrl.hash = currentUrl.hash;
  }

  if (targetUrl.pathname === "/create" && currentUrl.pathname === "/create") {
    const preset = currentUrl.searchParams.get("preset");
    if (!targetUrl.search && preset) targetUrl.searchParams.set("preset", preset);
  } else {
    for (const key of DESIGN_CONFIGURATION_KEYS) targetUrl.searchParams.delete(key);
  }

  return localHref(targetUrl);
}
