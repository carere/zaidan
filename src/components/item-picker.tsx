import { Link } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import {
  type ComponentProps,
  createEffect,
  createSignal,
  For,
  onCleanup,
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
    route: "/ui/$slug",
  },
];

export function ItemPicker(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  const [open, setOpen] = createSignal(false);
  const [currentPage, setCurrentPage] = createSignal("Home");

  // Keyboard shortcut: Cmd+K / Ctrl+K to open dialog
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // Detect current page from active link (SSR-safe)
  createEffect(() => {
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
    const pathname = window.location.pathname;

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
        class={cn("w-full justify-between", local.class)}
        {...others}
      >
        <span class="truncate">{currentPage()}</span>
        <Kbd class="ml-2">⌘K</Kbd>
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
                        <CommandItem value={item.title} onSelect={() => setOpen(false)}>
                          <Link
                            to={entry.route}
                            params={{ slug: item.slug }}
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
