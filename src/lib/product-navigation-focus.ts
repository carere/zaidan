const PRODUCT_NAVIGATION_FOCUS_KEY = "zaidan:product-navigation-focus";

export type ProductNavigationFocusDestination = "heading" | `#${string}`;

type ProductNavigationFocusStorage = Pick<Storage, "getItem" | "removeItem">;

export const isProductNavigationFocusDestination = (
  value: string,
): value is ProductNavigationFocusDestination =>
  value === "heading" || (value.startsWith("#") && value.length > 1);

export const isPrimaryProductNavigation = (event: MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export const storeProductNavigationFocus = (
  destination: ProductNavigationFocusDestination = "heading",
) => {
  sessionStorage.setItem(PRODUCT_NAVIGATION_FOCUS_KEY, destination);
};

export const clearProductNavigationFocus = () => {
  sessionStorage.removeItem(PRODUCT_NAVIGATION_FOCUS_KEY);
};

export const consumeProductNavigationFocus = (storage: ProductNavigationFocusStorage) => {
  const destination = storage.getItem(PRODUCT_NAVIGATION_FOCUS_KEY);
  if (destination === null) return undefined;
  storage.removeItem(PRODUCT_NAVIGATION_FOCUS_KEY);
  return isProductNavigationFocusDestination(destination) ? destination : undefined;
};

export const prepareProductNavigationFocus = (
  event: MouseEvent,
  destination: ProductNavigationFocusDestination = "heading",
) => {
  if (!isPrimaryProductNavigation(event)) return false;
  storeProductNavigationFocus(destination);
  return true;
};

export const focusProductNavigationDestination = (
  destination: ProductNavigationFocusDestination,
) => {
  requestAnimationFrame(() => {
    const scrollTarget = destination.startsWith("#")
      ? document.getElementById(destination.slice(1))
      : document.querySelector<HTMLElement>("main h1");
    if (!scrollTarget) return;
    const focusTarget =
      scrollTarget.getAttribute("aria-hidden") === "true"
        ? (scrollTarget.closest("main")?.querySelector<HTMLElement>("h1, h2, h3") ?? scrollTarget)
        : scrollTarget;
    focusTarget.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
    if (destination.startsWith("#")) {
      scrollTarget.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });
};

export const focusStoredProductNavigationDestination = () => {
  const destination = consumeProductNavigationFocus(sessionStorage);
  if (!destination) return;
  focusProductNavigationDestination(destination);
};
