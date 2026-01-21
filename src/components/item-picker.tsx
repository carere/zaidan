import { Link } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import { type ComponentProps, createMemo, For, Show, splitProps } from "solid-js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/ui/command";
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
    items: ui.sort((a, b) => a.title.localeCompare(b.title)),
    route: "/ui/$slug",
  },
];

export function ItemPicker(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);

  const currentPage = createMemo(() => {
    const pathname = window.location.pathname;

    // Match docs route: / or /{slug}
    if (pathname === "/" || (pathname.startsWith("/") && !pathname.startsWith("/ui"))) {
      const slug = pathname === "/" ? "home" : pathname.slice(1);
      const doc = docs.find((d) => d.slug === slug);
      return doc?.title ?? "Home";
    }

    // Match UI route: /ui/{slug}
    if (pathname.startsWith("/ui/")) {
      const slug = pathname.slice(4);
      const component = ui.find((u) => u.slug === slug);
      return component?.title;
    }

    return "Home";
  });

  return (
    <Command class={local.class} {...others}>
      <CommandInput placeholder={currentPage() || "Search pages..."} />
      <CommandList>
        <CommandEmpty>No pages found.</CommandEmpty>
        <For each={entries}>
          {(entry, index) => (
            <>
              <CommandGroup heading={entry.title}>
                <For each={entry.items}>
                  {(item) => (
                    <CommandItem value={item.title}>
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
  );
}
