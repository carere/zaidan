const PRODUCT_NAVIGATION_FOCUS_KEY = "zaidan:product-navigation-focus";

export const isPrimaryProductNavigation = (event: MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export const storeProductNavigationFocus = (destination = "heading") => {
  sessionStorage.setItem(PRODUCT_NAVIGATION_FOCUS_KEY, destination);
};

export const clearProductNavigationFocus = () => {
  sessionStorage.removeItem(PRODUCT_NAVIGATION_FOCUS_KEY);
};

export const prepareProductNavigationFocus = (event: MouseEvent, destination = "heading") => {
  if (!isPrimaryProductNavigation(event)) return false;
  storeProductNavigationFocus(destination);
  return true;
};

export const focusProductNavigationDestination = (destination: string) => {
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
  const destination = sessionStorage.getItem(PRODUCT_NAVIGATION_FOCUS_KEY);
  if (!destination) return;
  clearProductNavigationFocus();
  focusProductNavigationDestination(destination);
};
