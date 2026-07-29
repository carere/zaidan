import { useLocation } from "@tanstack/solid-router";
import { Menu, Plus, Search, X } from "lucide-solid";
import { createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js";
import { DocsNavigationGroups } from "@/components/docs-navigation-groups";
import { Github } from "@/components/icons/github";
import { Zaidan } from "@/components/icons/zaidan";
import { ModeSwitcher } from "@/components/mode-switcher";
import { resolveProductNavigationHref } from "@/lib/product-navigation";
import {
  clearProductNavigationFocus,
  focusProductNavigationDestination,
  focusStoredProductNavigationDestination,
  isPrimaryProductNavigation,
  isProductNavigationFocusDestination,
  type ProductNavigationFocusDestination,
  storeProductNavigationFocus,
} from "@/lib/product-navigation-focus";
import {
  CANONICAL_CONTENT_TREE,
  type CanonicalNode,
  getProductSurfaceForPath,
  PRODUCT_SURFACES,
} from "@/lib/product-routing";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Separator } from "@/registry/kobalte/ui/separator";

export const OPEN_COMMAND_SEARCH_EVENT = "zaidan:open-command-search";

const isEditable = (target: EventTarget | null) =>
  (target instanceof HTMLElement && target.isContentEditable) ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

function ProductNavigationLink(props: {
  href: string;
  class?: string;
  current?: "page" | "location";
  onSelect?: (focusDestination?: ProductNavigationFocusDestination) => void;
  children: JSX.Element;
}) {
  const resolvedHref = () =>
    typeof window === "undefined"
      ? props.href
      : resolveProductNavigationHref(props.href, window.location.href);

  const prepareFocus = (event: MouseEvent) => {
    if (!isPrimaryProductNavigation(event)) return;
    const destination = new URL(resolvedHref(), window.location.origin);
    const staysOnPage =
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search;
    const destinationFocus = isProductNavigationFocusDestination(destination.hash)
      ? destination.hash
      : "heading";
    storeProductNavigationFocus(destinationFocus);
    props.onSelect?.(staysOnPage ? destinationFocus : undefined);
    if (staysOnPage) {
      event.preventDefault();
      if (destination.hash !== window.location.hash) {
        window.history.pushState(
          window.history.state,
          "",
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      }
      clearProductNavigationFocus();
      if (!props.onSelect) {
        window.setTimeout(() => focusProductNavigationDestination(destinationFocus), 100);
      }
    }
  };

  return (
    <a
      href={resolvedHref()}
      aria-current={props.current}
      class={props.class}
      onClick={prepareFocus}
    >
      {props.children}
    </a>
  );
}

function HierarchyNode(props: {
  node: CanonicalNode;
  pathname: string;
  onSelect: (focusDestination?: ProductNavigationFocusDestination) => void;
  depth?: number;
}) {
  return (
    <li>
      <ProductNavigationLink
        href={props.node.path}
        current={props.pathname === props.node.path ? "page" : undefined}
        onSelect={props.onSelect}
        class={cn(
          "block rounded-md py-1.5 pr-3 text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground motion-reduce:transition-none",
          (props.depth ?? 0) > 0 ? "pl-6" : "pl-3",
        )}
      >
        {props.node.label}
      </ProductNavigationLink>
      <Show when={props.node.children?.length}>
        <ul class="mt-1 space-y-1 border-l pl-2">
          <For each={props.node.children}>
            {(child) => (
              <HierarchyNode
                node={child}
                pathname={props.pathname}
                onSelect={props.onSelect}
                depth={(props.depth ?? 0) + 1}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

export function ProductHeader() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = createSignal(false);
  let header: HTMLElement | undefined;
  let mobileTrigger: HTMLButtonElement | undefined;
  let selectionInProgress = false;
  let pendingSelectionFocus: ProductNavigationFocusDestination | undefined;

  const activeSurface = createMemo(() => getProductSurfaceForPath(location().pathname));
  const activeHierarchy = createMemo(() =>
    CANONICAL_CONTENT_TREE.find(({ surface }) => surface === activeSurface()?.id),
  );
  const setMenuOpen = (open: boolean) => {
    const wasOpen = mobileOpen();
    setMobileOpen(open);
    if (!open && wasOpen && !selectionInProgress) {
      requestAnimationFrame(() => mobileTrigger?.focus());
    }
    if (!open) selectionInProgress = false;
  };

  const closeForSelection = (destination?: ProductNavigationFocusDestination) => {
    selectionInProgress = true;
    pendingSelectionFocus = destination;
    setMenuOpen(false);
  };

  const finishDialogClose = () => {
    const destination = pendingSelectionFocus;
    pendingSelectionFocus = undefined;
    if (destination) {
      window.setTimeout(() => focusProductNavigationDestination(destination), 0);
    }
  };

  const openCommandSearch = () => {
    const triggers = document.querySelectorAll<HTMLElement>("[data-command-search-trigger]");
    const visibleTrigger = [...triggers].find((trigger) => trigger.offsetParent !== null);
    visibleTrigger?.focus();
    document.dispatchEvent(new CustomEvent(OPEN_COMMAND_SEARCH_EVENT));
  };

  onMount(() => {
    focusStoredProductNavigationDestination();

    const updateHeaderHeight = () => {
      if (!header) return;
      document.documentElement.style.setProperty(
        "--product-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    if (header) observer.observe(header);

    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const commandShortcut =
        (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      const slashShortcut = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!commandShortcut && !slashShortcut) return;
      event.preventDefault();
      openCommandSearch();
    };
    document.addEventListener("keydown", handleShortcut);

    onCleanup(() => {
      observer.disconnect();
      document.removeEventListener("keydown", handleShortcut);
    });
  });

  return (
    <header
      ref={header}
      data-product-header
      class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-14 max-w-[1520px] items-center gap-2 px-3 sm:px-4 md:px-6">
        <Dialog open={mobileOpen()} onOpenChange={setMenuOpen}>
          <DialogTrigger
            ref={mobileTrigger}
            as={Button}
            variant="ghost"
            size="icon-sm"
            class="lg:hidden"
            aria-label="Open Product menu"
          >
            <Menu />
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            onCloseAutoFocus={finishDialogClose}
            class="top-0 left-0 flex h-svh w-full translate-x-0 translate-y-0 flex-col overflow-hidden bg-background p-0 motion-reduce:animate-none lg:hidden"
          >
            <div class="flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <Zaidan class="size-5" />
              <DialogTitle class="font-semibold">Zaidan</DialogTitle>
              <DialogDescription class="sr-only">
                Navigate Product Surfaces and the active content hierarchy.
              </DialogDescription>
              <Button
                variant="ghost"
                size="icon-sm"
                class="ml-auto"
                aria-label="Close Product menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </Button>
            </div>
            <nav
              aria-label="Mobile Product navigation"
              class="min-h-0 flex-1 overflow-y-auto px-5 py-6"
            >
              <p class="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Product Surfaces
              </p>
              <ul class="mt-4 space-y-1">
                <For each={PRODUCT_SURFACES}>
                  {(surface) => (
                    <li>
                      <ProductNavigationLink
                        href={surface.path}
                        current={activeSurface()?.id === surface.id ? "location" : undefined}
                        onSelect={closeForSelection}
                        class="block rounded-md px-3 py-2 font-semibold text-xl outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-muted motion-reduce:transition-none"
                      >
                        {surface.label}
                      </ProductNavigationLink>
                    </li>
                  )}
                </For>
              </ul>

              <Show
                when={
                  (activeSurface()?.id === "docs" || activeSurface()?.id === "components") &&
                  activeHierarchy()
                }
              >
                {(hierarchy) => (
                  <>
                    <Separator class="my-6" />
                    <p class="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {activeSurface()?.id === "docs" ? "Docs hierarchy" : "Component Catalog"}
                    </p>
                    <Show
                      when={activeSurface()?.id === "docs"}
                      fallback={
                        <ul class="mt-4 space-y-1">
                          <For each={hierarchy().children}>
                            {(node) => (
                              <HierarchyNode
                                node={node}
                                pathname={location().pathname}
                                onSelect={closeForSelection}
                              />
                            )}
                          </For>
                        </ul>
                      }
                    >
                      <DocsNavigationGroups
                        pathname={location().pathname}
                        revealWhenVisible={mobileOpen()}
                        variant="mobile"
                        idPrefix="mobile-docs-group"
                        class="mt-4 space-y-5"
                        triggerClass="flex w-full items-center justify-between rounded-sm px-3 py-1 font-medium text-muted-foreground text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        nodesClass="mt-1 space-y-1"
                        nestedNodesClass="mt-1 space-y-1 border-l pl-2"
                        renderLink={(node, depth) => (
                          <ProductNavigationLink
                            href={node.path}
                            current={location().pathname === node.path ? "page" : undefined}
                            onSelect={closeForSelection}
                            class={cn(
                              "block rounded-md py-1.5 pr-3 text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground motion-reduce:transition-none",
                              depth > 0 ? "pl-6" : "pl-3",
                            )}
                          >
                            {node.label}
                          </ProductNavigationLink>
                        )}
                      />
                    </Show>
                  </>
                )}
              </Show>
            </nav>
          </DialogContent>
        </Dialog>

        <ProductNavigationLink
          href="/"
          current={activeSurface()?.id === "home" ? "page" : undefined}
          class="flex shrink-0 items-center gap-2 rounded-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Zaidan class="size-5" />
          <span>Zaidan</span>
        </ProductNavigationLink>

        <nav aria-label="Product Surfaces" class="ml-2 hidden items-center gap-0.5 lg:flex">
          <For each={PRODUCT_SURFACES}>
            {(surface) => (
              <ProductNavigationLink
                href={surface.path}
                current={activeSurface()?.id === surface.id ? "location" : undefined}
                class="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-muted aria-[current]:text-foreground motion-reduce:transition-none"
              >
                {surface.label}
              </ProductNavigationLink>
            )}
          </For>
        </nav>

        <div class="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            data-command-search-trigger
            aria-label="Open Command Search"
            aria-keyshortcuts="Meta+K Control+K /"
            class="hidden min-w-44 justify-between text-muted-foreground shadow-none md:inline-flex"
            onClick={openCommandSearch}
          >
            <span class="flex items-center gap-2">
              <Search /> Search
            </span>
            <kbd class="text-[10px]">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            data-command-search-trigger
            aria-label="Open Command Search"
            aria-keyshortcuts="Meta+K Control+K /"
            class="md:hidden"
            onClick={openCommandSearch}
          >
            <Search />
          </Button>
          <div class="hidden sm:block">
            <Button
              as="a"
              href="https://github.com/carere/zaidan"
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="icon-sm"
              aria-label="Open Zaidan on GitHub"
            >
              <Github class="fill-foreground" />
            </Button>
          </div>
          <ModeSwitcher />
          <Button
            as="a"
            href={
              typeof window === "undefined"
                ? "/create"
                : resolveProductNavigationHref("/create", window.location.href)
            }
            size="sm"
            class="ml-1 gap-1.5"
            aria-label={activeSurface()?.id === "create" ? "Create" : "New"}
            aria-current={activeSurface()?.id === "create" ? "location" : undefined}
          >
            <Plus />
            <span class="hidden sm:inline">
              {activeSurface()?.id === "create" ? "Create" : "New"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
