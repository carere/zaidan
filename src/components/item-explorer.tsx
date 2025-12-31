import { Link } from "@tanstack/solid-router";
import { ChevronRightIcon } from "lucide-solid";
import { For } from "solid-js";
import { cn } from "@/lib/utils";
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
  const groupedItems = [
    {
      title: "Components",
      items: [{ name: "Button", title: "Button" }],
    },
  ];

  return (
    <Sidebar
      class="sticky z-30 hidden h-[calc(100svh-var(--header-height)-2rem)] overscroll-none bg-transparent xl:flex"
      collapsible="none"
    >
      <SidebarContent class="no-scrollbar -mx-1 overflow-x-hidden">
        {groupedItems.map((group) => (
          <Collapsible defaultOpen class="group/collapsible">
            <SidebarGroup class="px-1 py-0">
              <CollapsibleTrigger class="flex w-full items-center gap-1 py-1.5 text-[0.8rem] font-medium [&[data-state=open]>svg]:rotate-90">
                <ChevronRightIcon class="text-muted-foreground size-3.5 transition-transform" />
                <span>{group.title}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu class="border-border/50 relative ml-1.5 border-l pl-2">
                    <For each={group.items}>
                      {(item, index) => (
                        <SidebarMenuItem class="relative">
                          <div
                            class={cn(
                              "border-border/50 absolute top-1/2 -left-2 h-px w-2 border-t",
                              index() === group.items.length - 1 && "bg-sidebar",
                            )}
                          />
                          {index() === group.items.length - 1 && (
                            <div class="bg-sidebar absolute top-1/2 -bottom-1 -left-2.5 w-1" />
                          )}
                          <SidebarMenuButton
                            //onClick={() => setParams({ item: item.name })}
                            class="data-[active=true]:bg-accent data-[active=true]:border-accent 3xl:fixed:w-full 3xl:fixed:max-w-48 relative h-[26px] w-fit cursor-pointer overflow-visible border border-transparent text-[0.8rem] font-normal after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md"
                            //data-active={item.name === currentItem?.name}
                            //isActive={item.name === currentItem?.name}
                          >
                            {item.title}
                            <span class="absolute inset-0 flex w-(--sidebar-width) bg-transparent" />
                          </SidebarMenuButton>
                          <Link
                            //to={`/preview/${base}/${item.name}`}
                            to="/"
                            class="sr-only"
                            tabIndex={-1}
                          >
                            {item.title}
                          </Link>
                        </SidebarMenuItem>
                      )}
                    </For>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
