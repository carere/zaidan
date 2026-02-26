import { useLocation, useNavigate, useParams, useSearch } from "@tanstack/solid-router";
import { bazza, docs, motionPrimitives, shadcn } from "@velite";
import { Search } from "lucide-solid";
import {
  type ComponentProps,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from "solid-js";
import { DRAFT_SLUGS } from "@/lib/config";
import { REGISTRY_META } from "@/lib/registries";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/kobalte/ui/command";
import { Kbd } from "@/registry/kobalte/ui/kbd";
import type { FileRouteTypes } from "@/routeTree.gen";

type Entry = {
  title: string;
  items: typeof docs | typeof shadcn | typeof bazza | typeof motionPrimitives;
  registry?: "shadcn" | "bazza" | "motion-primitives";
  route: FileRouteTypes["to"];
};

const isDraft = (slug: string) => DRAFT_SLUGS.includes(slug);
const filterDrafts = <T extends { slug: string }>(items: T[]) =>
  import.meta.env.DEV ? items : items.filter((item) => !isDraft(item.slug));

const entries: Entry[] = [
  {
    title: "Getting Started",
    items: docs.filter((d) => d.parent === undefined),
    route: "/{-$slug}",
  },
  {
    title: REGISTRY_META.bazza.label,
    items: filterDrafts(bazza.sort((a, b) => a.title.localeCompare(b.title))),
    registry: "bazza",
    route: "/registry/$registry/{-$slug}",
  },
  {
    title: REGISTRY_META.shadcn.label,
    items: filterDrafts(shadcn.sort((a, b) => a.title.localeCompare(b.title))),
    registry: "shadcn",
    route: "/registry/$registry/{-$slug}",
  },
  {
    title: REGISTRY_META["motion-primitives"].label,
    items: filterDrafts(motionPrimitives.sort((a, b) => a.title.localeCompare(b.title))),
    registry: "motion-primitives",
    route: "/registry/$registry/{-$slug}",
  },
];

export function ItemPicker(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  const [open, setOpen] = createSignal(false);
  const location = useLocation();
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const isDocsPage = createMemo(() => location().pathname.endsWith("/docs"));

  // Keyboard shortcut: Cmd+K / Ctrl+K to open dialog
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  const currentPage = createMemo(
    () =>
      entries.flatMap(({ items }) => items).find(({ slug }) => slug === params().slug)?.title ??
      "Zaidan",
  );

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
        <Command autofocus={false}>
          <CommandInput placeholder="Search pages..." />
          <CommandList>
            <CommandEmpty>No pages found.</CommandEmpty>

            <For each={entries}>
              {(entry, index) => (
                <Show when={entry.items.length > 0}>
                  <CommandGroup heading={entry.title}>
                    <For each={entry.items}>
                      {(item) => (
                        <CommandItem
                          value={item.slug}
                          data-selected={params().slug === item.slug}
                          onSelect={() => {
                            navigate({
                              to: entry.route,
                              params: { registry: entry.registry, slug: item.slug },
                              search: search(),
                            });
                            setOpen(false);
                          }}
                        >
                          {item.title}
                          <Show when={isDraft(item.slug)}>
                            <Badge
                              variant="outline"
                              class="ml-1 rounded-sm px-1 py-0 font-mono text-[0.6rem]"
                            >
                              draft
                            </Badge>
                          </Show>
                        </CommandItem>
                      )}
                    </For>
                  </CommandGroup>

                  <Show when={index() < entries.length - 1}>
                    <CommandSeparator />
                  </Show>
                </Show>
              )}
            </For>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
