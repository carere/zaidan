import { Link } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import { ChevronRightIcon } from "lucide-solid";
import { For } from "solid-js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/registry/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/registry/ui/sidebar";
import type { FileRouteTypes } from "@/routeTree.gen";

type Entry = {
  title: string;
  items: typeof docs | typeof ui;
  route: FileRouteTypes["to"];
};

export function ItemExplorer() {
  const entries: Entry[] = [
    {
      title: "Getting Started",
      items: docs,
      route: "/{-$slug}",
    },
    {
      title: "UI",
      items: ui,
      route: "/ui/$slug",
    },
  ];

  return (
    <Sidebar
      class="sticky z-30 hidden h-[calc(100svh-var(--header-height)-2rem)] overscroll-none bg-transparent xl:flex"
      collapsible="none"
    >
      <SidebarContent class="no-scrollbar -mx-1 overflow-x-hidden">
        <For each={entries}>
          {(entry) => (
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
                              class="relative h-[26px] w-fit cursor-pointer overflow-visible border border-transparent font-normal text-[0.8rem] after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[status=active]:border-accent data-[status=active]:bg-accent"
                            >
                              {item.title}
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
          )}
        </For>
      </SidebarContent>
    </Sidebar>
  );
}
