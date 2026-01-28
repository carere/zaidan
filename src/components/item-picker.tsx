import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import { Search } from "lucide-solid";
import {
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/ui/command";
import { Kbd } from "@/registry/ui/kbd";
import type { FileRouteTypes } from "@/routeTree.gen";

type Entry = {
  title: string;
  items: typeof docs | typeof ui;
  route: FileRouteTypes["to"];
};

const entries: Entry[] = [
  {
    title: "Getting Started",
    items: docs,
    route: "/{-$slug}",
  },
  {
    title: "UI",
    items: [...ui].sort((a, b) => a.title.localeCompare(b.title)),
    route: "/ui/{-$slug}",
  },
];

export function ItemPicker(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  const [open, setOpen] = createSignal(false);
  const [currentPage, setCurrentPage] = createSignal("Home");
  const location = useLocation();
  const navigate = useNavigate();

  const isDocsPage = createMemo(() => location().pathname.endsWith("/docs"));

  // Keyboard shortcut: Cmd+K / Ctrl+K to open dialog
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        console.log("Shortcut pressed");
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // Detect current page from active link (reactive to route changes)
  createEffect(() => {
    // Access location().pathname to make this effect reactive to route changes
    const pathname = location().pathname;

    // Strategy 1: Query for active link (TanStack Router sets data-status="active")
    const activeLink = document.querySelector('[data-status="active"]');
    if (activeLink) {
      const text = activeLink.textContent?.trim();
      if (text) {
        setCurrentPage(text);
        return;
      }
    }

    // Strategy 2: Fallback to pathname parsing
    // Match docs route: / or /{slug}
    if (pathname === "/" || (pathname.startsWith("/") && !pathname.startsWith("/ui"))) {
      const slug = pathname === "/" ? "home" : pathname.slice(1);
      const doc = docs.find((d) => d.slug === slug);
      setCurrentPage(doc?.title ?? "Home");
      return;
    }

    // Match UI route: /ui/{slug}
    if (pathname.startsWith("/ui/")) {
      const slug = pathname.slice(4);
      const component = ui.find((u) => u.slug === slug);
      setCurrentPage(component?.title ?? "Home");
      return;
    }

    // Default fallback
    setCurrentPage("Home");
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        class={cn("h-[calc(--spacing(13.5))] flex-1 justify-between md:h-9 md:w-full", local.class)}
        {...others}
      >
        <span class="flex flex-col items-start">
          <span class="text-muted-foreground text-xs sm:hidden">
            {isDocsPage() ? "Docs" : "Preview"}
          </span>
          <span class="truncate">{currentPage()}</span>
        </span>
        <Kbd class="ml-2 hidden items-center sm:flex">⌘K</Kbd>
        <Search class="size-4 sm:hidden" />
      </Button>

      <CommandDialog open={open()} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search pages..." />
          <CommandList>
            <CommandEmpty>No pages found.</CommandEmpty>

            <For each={entries}>
              {(entry, index) => (
                <>
                  <CommandGroup heading={entry.title}>
                    <For each={entry.items}>
                      {(item) => (
                        <CommandItem
                          value={item.title}
                          onSelect={() => {
                            navigate({
                              to: entry.route,
                              params: { slug: item.slug },
                              search: (prev) => prev,
                            });
                            setOpen(false);
                          }}
                        >
                          <Link
                            to={entry.route}
                            params={{ slug: item.slug }}
                            search={(prev) => prev}
                            class="flex w-full items-center"
                          >
                            {item.title}
                          </Link>
                        </CommandItem>
                      )}
                    </For>
                  </CommandGroup>

                  <Show when={index() < entries.length - 1}>
                    <CommandSeparator />
                  </Show>
                </>
              )}
            </For>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

export const CMD_K_FORWARD_TYPE = "cmd-k-forward";

export function ItemPickerScript() {
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: CMD_K_FORWARD_TYPE, key: e.key }, "*");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  return null;
}
