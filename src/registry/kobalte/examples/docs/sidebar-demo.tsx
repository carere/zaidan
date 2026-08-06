import {
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  LayoutDashboard,
  Search,
  Settings2,
  SquareTerminal,
} from "lucide-solid";
import { createSignal, For } from "solid-js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/registry/kobalte/ui/sidebar";

const sections = [
  {
    title: "Workspace",
    icon: LayoutDashboard,
    items: ["Overview", "Recent activity", "Members"],
  },
  {
    title: "Projects",
    icon: Folder,
    items: ["Design system", "Website refresh", "Mobile app"],
  },
  {
    title: "Documentation",
    icon: BookOpen,
    items: ["Introduction", "Components", "Changelog"],
  },
];

export default function SidebarDemo() {
  const [activeItem, setActiveItem] = createSignal("Overview");

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Zaidan">
                <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SquareTerminal class="size-4" />
                </div>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">Zaidan</span>
                  <span class="truncate text-xs">Engineering</span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarGroup class="py-0">
            <SidebarGroupContent class="relative">
              <label for="sidebar-demo-search" class="sr-only">
                Search navigation
              </label>
              <SidebarInput id="sidebar-demo-search" placeholder="Search" class="pl-8" />
              <Search class="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <For each={sections}>
                  {(section) => (
                    <SidebarMenuItem>
                      <Collapsible
                        class="group/collapsible"
                        defaultOpen={section.title === "Workspace"}
                      >
                        <CollapsibleTrigger as={SidebarMenuButton} tooltip={section.title}>
                          <section.icon />
                          <span>{section.title}</span>
                          <ChevronRight class="ml-auto transition-transform group-data-[expanded]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <For each={section.items}>
                              {(item) => (
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    href="#sidebar-demo-content"
                                    isActive={item === activeItem()}
                                    onClick={() => setActiveItem(item)}
                                  >
                                    <span>{item}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )}
                            </For>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}
                </For>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings">
                <Settings2 />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset id="sidebar-demo-content" class="min-h-0 bg-background">
        <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger class="-ml-1" />
          <div class="h-4 w-px bg-border" />
          <p class="text-sm font-medium">{activeItem()}</p>
        </header>
        <div class="grid flex-1 gap-4 p-4 md:grid-cols-3">
          <div class="h-24 rounded-xl bg-muted/50" />
          <div class="h-24 rounded-xl bg-muted/50" />
          <div class="h-24 rounded-xl bg-muted/50" />
          <div class="col-span-full min-h-48 rounded-xl bg-muted/50" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
