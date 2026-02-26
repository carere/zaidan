import { Link, useSearch } from "@tanstack/solid-router";
import { ChevronRightIcon } from "lucide-solid";
import { For, mergeProps, Show, splitProps } from "solid-js";
import { REGISTRY_META } from "@/lib/registries";
import { getEntries, isDraft } from "@/lib/registry-entries";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  type SidebarProps,
} from "@/registry/kobalte/ui/sidebar";

export function ItemExplorer(props: SidebarProps) {
  const mergedProps = mergeProps({ collapsible: "none" }, props);
  const search = useSearch({ strict: false });
  const [local, others] = splitProps(mergedProps as SidebarProps, ["class", "collapsible"]);

  return (
    <Sidebar
      collapsible={local.collapsible}
      class={cn("z-30 hidden h-full overscroll-none bg-transparent xl:flex", local.class)}
      {...others}
    >
      <SidebarContent class="no-scrollbar -mx-1 overflow-x-hidden">
        <For each={getEntries()}>
          {(entry) => (
            <Show when={entry.items.length > 0}>
              <Collapsible defaultOpen class="group/collapsible">
                <SidebarGroup class="px-1 py-0">
                  <CollapsibleTrigger class="flex w-full items-center gap-1 py-1.5 font-medium text-[0.8rem]">
                    <ChevronRightIcon class="size-3.5 text-muted-foreground transition-transform group-data-expanded/collapsible:rotate-90" />
                    <span>{entry.title}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu class="relative ml-1.5 border-border/50 border-l pl-2">
                        <For each={entry.items}>
                          {(item) => (
                            <SidebarMenuItem class="relative">
                              <div class="absolute top-1/2 -left-2 h-px w-2 border-border/50 border-t" />
                              <SidebarMenuButton
                                as={Link}
                                to={entry.route}
                                //@ts-expect-error <Problem with kobalte typing polymorphic props>
                                params={{ slug: item.slug }}
                                //@ts-expect-error <Problem with kobalte typing polymorphic props>
                                search={search()}
                                class="relative h-6.5 w-fit cursor-pointer overflow-visible border border-transparent font-normal text-[0.8rem] after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[status=active]:border-accent data-[status=active]:bg-accent"
                              >
                                {item.title}
                                <Show when={item.registry !== "shadcn"}>
                                  <span class="ml-1 text-[0.65rem] text-muted-foreground">
                                    ({REGISTRY_META[item.registry].label})
                                  </span>
                                </Show>
                                <Show when={isDraft(item.slug)}>
                                  <Badge
                                    variant="outline"
                                    class="ml-1 rounded-sm px-1 py-0 font-mono text-[0.6rem]"
                                  >
                                    draft
                                  </Badge>
                                </Show>
                                <span class="absolute inset-0 flex w-(--sidebar-width) bg-transparent" />
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </For>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            </Show>
          )}
        </For>
      </SidebarContent>
    </Sidebar>
  );
}
