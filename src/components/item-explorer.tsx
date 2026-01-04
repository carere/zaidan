import { Link, useLocation } from "@tanstack/solid-router";
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

export function ItemExplorer() {
  const location = useLocation();
  const isActive = (slug: string, prefix?: string) =>
    `${prefix ?? ""}/${slug}` === location().pathname;

  return (
    <Sidebar
      class="sticky z-30 hidden h-[calc(100svh-var(--header-height)-2rem)] overscroll-none bg-transparent xl:flex"
      collapsible="none"
    >
      <SidebarContent class="no-scrollbar -mx-1 overflow-x-hidden">
        {/* Grouped Docs Section */}
        <Collapsible defaultOpen class="group/collapsible">
          <SidebarGroup class="px-1 py-0">
            <CollapsibleTrigger class="flex w-full items-center gap-1 py-1.5 text-[0.8rem] font-medium">
              <ChevronRightIcon class="text-muted-foreground size-3.5 transition-transform group-data-expanded/collapsible:rotate-90" />
              <span>Getting Started</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu class="border-border/50 relative ml-1.5 border-l pl-2">
                  <For each={docs}>
                    {(doc) => (
                      <SidebarMenuItem class="relative">
                        <div class="border-border/50 absolute top-1/2 -left-2 h-px w-2 border-t" />
                        <SidebarMenuButton
                          as={Link}
                          to="/{-$doc}"
                          //@ts-expect-error <Problem with kobalte typing polymorphic props>
                          params={{ doc: doc.slug }}
                          isActive={isActive(doc.slug)}
                          class="data-[active=true]:bg-accent data-[active=true]:border-accent relative h-[26px] w-fit cursor-pointer overflow-visible border border-transparent text-[0.8rem] font-normal after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md"
                        >
                          {doc.title}
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

        {/* Grouped UI Components Section */}
        <Collapsible defaultOpen class="group/collapsible">
          <SidebarGroup class="px-1 py-0">
            <CollapsibleTrigger class="flex w-full items-center gap-1 py-1.5 text-[0.8rem] font-medium">
              <ChevronRightIcon class="text-muted-foreground size-3.5 transition-transform group-data-expanded/collapsible:rotate-90" />
              <span>UI</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu class="border-border/50 relative ml-1.5 border-l pl-2">
                  <For each={ui}>
                    {(component) => (
                      <SidebarMenuItem class="relative">
                        <div class="border-border/50 absolute top-1/2 -left-2 h-px w-2 border-t" />
                        <SidebarMenuButton
                          as={Link}
                          to="/ui/$component"
                          //@ts-expect-error <Problem with kobalte typing polymorphic props>
                          params={{ component: component.slug }}
                          isActive={isActive(component.slug, "/ui")}
                          class="data-[active=true]:bg-accent data-[active=true]:border-accent relative h-[26px] w-fit cursor-pointer overflow-visible border border-transparent text-[0.8rem] font-normal after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md"
                        >
                          {component.title}
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
      </SidebarContent>
    </Sidebar>
  );
}
