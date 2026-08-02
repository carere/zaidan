import { useNavigate, useSearch } from "@tanstack/solid-router";
import { Search } from "lucide-solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { getEntries, hasUpdate } from "@/lib/registry-entries";
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

export function SiteSearch() {
  const [open, setOpen] = createSignal(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const entries = getEntries();

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  return (
    <>
      <Button
        variant="outline"
        class="relative h-8 w-full justify-start rounded-lg border-none bg-muted px-3 text-foreground shadow-none transition-colors hover:bg-muted/50 md:w-48 lg:w-40 xl:w-64 dark:bg-card"
        onClick={() => setOpen(true)}
      >
        <Search class="size-4 xl:hidden" />
        <span class="hidden xl:inline-flex">Search documentation...</span>
        <span class="hidden lg:inline-flex xl:hidden">Search...</span>
        <span class="sr-only lg:hidden">Search documentation</span>
      </Button>

      <CommandDialog open={open()} onOpenChange={setOpen}>
        <Command autofocus={false}>
          <CommandInput placeholder="Search documentation..." />
          <CommandList>
            <CommandEmpty>No pages found.</CommandEmpty>
            <For each={entries}>
              {(entry, index) => (
                <Show when={entry.items.length > 0}>
                  <CommandGroup heading={entry.title}>
                    <For each={entry.items}>
                      {(item) => (
                        <CommandItem
                          value={`${entry.title} ${item.title} ${item.slug}`}
                          onSelect={() => {
                            navigate({
                              to: entry.route,
                              params: { slug: item.slug },
                              search: search(),
                            });
                            setOpen(false);
                          }}
                        >
                          {item.title}
                          <Show when={hasUpdate(item.slug, entry.kind)}>
                            <span
                              role="status"
                              aria-label="Has updates"
                              class="ml-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
                            />
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
