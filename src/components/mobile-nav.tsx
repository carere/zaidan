import { Link } from "@tanstack/solid-router";
import { blocks, docs, ui } from "@velite";
import { createSignal, For, Show, splitProps } from "solid-js";
import { hasUpdate } from "@/lib/registry-entries";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

const topLevelDocs = [...docs]
  .filter((item) => item.parent === undefined)
  .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

const installationDocs = [...docs]
  .filter((item) => item.parent === "installation")
  .sort((a, b) => a.title.localeCompare(b.title));

const blockPages = [...blocks].sort((a, b) => a.title.localeCompare(b.title));
const componentPages = [...ui].sort((a, b) => a.title.localeCompare(b.title));

const mobileLinkClass = "flex items-center gap-2 text-2xl font-medium";

type MobileNavProps = {
  class?: string;
};

export function MobileNav(props: MobileNavProps) {
  const [local] = splitProps(props, ["class"]);
  const [open, setOpen] = createSignal(false);
  let contentRef: HTMLDivElement | undefined;

  return (
    <Popover
      open={open()}
      placement="bottom-start"
      gutter={14}
      shift={-16}
      fitViewport
      overflowPadding={0}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        as={Button}
        variant="ghost"
        class={cn(
          "extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 p-0! hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
          local.class,
        )}
      >
        <div class="relative flex h-8 w-4 items-center justify-center">
          <div class="relative size-4">
            <span
              class="absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100"
              classList={{ "top-1": !open(), "top-[0.4rem] -rotate-45": open() }}
            />
            <span
              class="absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100"
              classList={{ "top-2.5": !open(), "top-[0.4rem] rotate-45": open() }}
            />
          </div>
          <span class="sr-only">Toggle Menu</span>
        </div>
        <span class="flex h-8 items-center font-medium text-lg leading-none">Menu</span>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef?.focus();
        }}
        class="no-scrollbar h-(--kb-popper-content-available-height) w-(--kb-popper-content-available-width) overflow-y-auto rounded-none border-none bg-background/90 p-0 shadow-none ring-0! backdrop-blur duration-100 data-expanded:animate-none!"
      >
        <nav class="flex flex-col gap-12 overflow-auto px-6 py-6" aria-label="Mobile navigation">
          <div class="flex flex-col gap-4">
            <div class="font-medium text-muted-foreground text-sm">Menu</div>
            <div class="flex flex-col gap-3">
              <Link to="/" class={mobileLinkClass} onClick={() => setOpen(false)}>
                Home
              </Link>
              <Link
                to="/$slug"
                params={{ slug: "installation" }}
                class={mobileLinkClass}
                onClick={() => setOpen(false)}
              >
                Docs
              </Link>
              <Link to="/ui/{-$slug}" class={mobileLinkClass} onClick={() => setOpen(false)}>
                Components
              </Link>
              <Link to="/create" class={mobileLinkClass} onClick={() => setOpen(false)}>
                Create
              </Link>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="font-medium text-muted-foreground text-sm">Sections</div>
            <div class="flex flex-col gap-3">
              <For each={topLevelDocs}>
                {(item) => (
                  <Link
                    to="/$slug"
                    params={{ slug: item.slug }}
                    class={mobileLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.title}
                    <Show when={hasUpdate(item.slug, "docs")}>
                      <span class="flex size-2 rounded-full bg-blue-500" title="New" />
                    </Show>
                  </Link>
                )}
              </For>
              <Link to="/changelog" class={mobileLinkClass} onClick={() => setOpen(false)}>
                Changelog
                <Show when={hasUpdate("changelog", "docs")}>
                  <span class="flex size-2 rounded-full bg-blue-500" title="New" />
                </Show>
              </Link>
            </div>
          </div>

          <div class="flex flex-col gap-8">
            <div class="flex flex-col gap-4">
              <div class="font-medium text-muted-foreground text-sm">Installation</div>
              <div class="flex flex-col gap-3">
                <For each={installationDocs}>
                  {(item) => (
                    <Link
                      to="/installation/$slug"
                      params={{ slug: item.slug }}
                      class={mobileLinkClass}
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                      <Show when={hasUpdate(item.slug, "docs")}>
                        <span class="flex size-2 rounded-full bg-blue-500" title="New" />
                      </Show>
                    </Link>
                  )}
                </For>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div class="font-medium text-muted-foreground text-sm">Blocks</div>
              <div class="flex flex-col gap-3">
                <For each={blockPages}>
                  {(item) => (
                    <Link
                      to="/blocks/{-$slug}"
                      params={{ slug: item.slug }}
                      class={mobileLinkClass}
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                      <Show when={hasUpdate(item.slug, "blocks")}>
                        <span class="flex size-2 rounded-full bg-blue-500" title="New" />
                      </Show>
                    </Link>
                  )}
                </For>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div class="font-medium text-muted-foreground text-sm">Components</div>
              <div class="flex flex-col gap-3">
                <For each={componentPages}>
                  {(item) => (
                    <Link
                      to="/ui/{-$slug}"
                      params={{ slug: item.slug }}
                      class={mobileLinkClass}
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                      <Show when={hasUpdate(item.slug, "ui")}>
                        <span class="flex size-2 rounded-full bg-blue-500" title="New" />
                      </Show>
                    </Link>
                  )}
                </For>
              </div>
            </div>
          </div>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
