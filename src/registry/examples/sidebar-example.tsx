/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { Check, ChevronsUpDown, Search } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/registry/ui/item";
import { Label } from "@/registry/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/registry/ui/sidebar";

export default function SidebarExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <Basic />
    </ExampleWrapper>
  );
}

function Basic() {
  const data = {
    versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
    navMain: [
      {
        title: "Getting Started",
        url: "#",
        items: [
          {
            title: "Installation",
            url: "#",
          },
          {
            title: "Project Structure",
            url: "#",
          },
        ],
      },
      {
        title: "Building Your Application",
        url: "#",
        items: [
          {
            title: "Routing",
            url: "#",
          },
          {
            title: "Data Fetching",
            url: "#",
            isActive: true,
          },
          {
            title: "Rendering",
            url: "#",
          },
          {
            title: "Caching",
            url: "#",
          },
          {
            title: "Styling",
            url: "#",
          },
          {
            title: "Optimizing",
            url: "#",
          },
          {
            title: "Configuring",
            url: "#",
          },
          {
            title: "Testing",
            url: "#",
          },
          {
            title: "Authentication",
            url: "#",
          },
          {
            title: "Deploying",
            url: "#",
          },
          {
            title: "Upgrading",
            url: "#",
          },
          {
            title: "Examples",
            url: "#",
          },
        ],
      },
      {
        title: "API Reference",
        url: "#",
        items: [
          {
            title: "Components",
            url: "#",
          },
          {
            title: "File Conventions",
            url: "#",
          },
          {
            title: "Functions",
            url: "#",
          },
          {
            title: "next.config.js Options",
            url: "#",
          },
          {
            title: "CLI",
            url: "#",
          },
          {
            title: "Edge Runtime",
            url: "#",
          },
        ],
      },
      {
        title: "Architecture",
        url: "#",
        items: [
          {
            title: "Accessibility",
            url: "#",
          },
          {
            title: "Fast Refresh",
            url: "#",
          },
          {
            title: "Next.js Compiler",
            url: "#",
          },
          {
            title: "Supported Browsers",
            url: "#",
          },
          {
            title: "Turbopack",
            url: "#",
          },
        ],
      },
    ],
  };

  const [selectedVersion, setSelectedVersion] = createSignal(data.versions[0]);

  return (
    <Example title="Basic">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={SidebarMenuButton}
                    size="lg"
                    class="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                  >
                    <Item class="p-0" size="xs">
                      <ItemContent>
                        <ItemTitle class="text-sm">Documentation</ItemTitle>
                        <ItemDescription>v{selectedVersion()}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <ChevronsUpDown />
                      </ItemActions>
                    </Item>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <For each={data.versions}>
                      {(version) => (
                        <DropdownMenuItem onSelect={() => setSelectedVersion(version)}>
                          v{version}{" "}
                          <Show when={version === selectedVersion()}>
                            <Check class="ml-auto" />
                          </Show>
                        </DropdownMenuItem>
                      )}
                    </For>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
            <form>
              <SidebarGroup class="py-0">
                <SidebarGroupContent class="relative">
                  <Label for="search" class="sr-only">
                    Search
                  </Label>
                  <SidebarInput id="search" placeholder="Search the docs..." class="pl-8" />
                  <Search class="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none opacity-50" />
                </SidebarGroupContent>
              </SidebarGroup>
            </form>
          </SidebarHeader>
          <SidebarContent>
            <For each={data.navMain}>
              {(item) => (
                <SidebarGroup>
                  <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <For each={item.items}>
                        {(subItem) => (
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              as="a"
                              href={subItem.url}
                              isActive={subItem.isActive}
                            >
                              {subItem.title}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </For>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </For>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header class="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger class="-ml-1" />
          </header>
          <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="grid auto-rows-min gap-4 md:grid-cols-3">
              <div class="aspect-video rounded-xl bg-muted/50" />
              <div class="aspect-video rounded-xl bg-muted/50" />
              <div class="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div class="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Example>
  );
}
