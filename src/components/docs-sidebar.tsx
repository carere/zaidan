import { Link, useLocation } from "@tanstack/solid-router";
import { blocks, docs, ui } from "@velite";
import { createEffect, For, onCleanup, onMount, Show } from "solid-js";
import { hasUpdate } from "@/lib/registry-entries";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/registry/kobalte/ui/sidebar";

const SCROLL_STORAGE_KEY = "docs-sidebar-scroll";

const sections = [
  { name: "Introduction", to: "/docs" },
  { name: "Components", to: "/docs/components" },
  { name: "Blocks", to: "/docs/blocks" },
  { name: "Installation", to: "/docs/installation" },
  { name: "Customization", to: "/docs/customization" },
  { name: "Dark Mode", to: "/docs/dark-mode" },
  { name: "Typeset", to: "/docs/typeset" },
  { name: "Zaidan Skills", to: "/docs/zaidan-agent" },
  { name: "FAQ", to: "/docs/faq" },
  { name: "Roadmap", to: "/docs/roadmap" },
  { name: "Changelog", to: "/docs/changelog" },
] as const;

const installationPages = [...docs]
  .filter((page) => page.parent === "installation")
  .sort((a, b) => a.title.localeCompare(b.title));

const componentPages = [...ui].sort((a, b) => a.title.localeCompare(b.title));

const blockPages = [...blocks].sort((a, b) => a.title.localeCompare(b.title));

function readScrollState() {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "") as {
      pathname: string;
      scrollTop: number;
    };
  } catch {
    return null;
  }
}

function saveScrollState(container: HTMLElement, pathname: string) {
  try {
    sessionStorage.setItem(
      SCROLL_STORAGE_KEY,
      JSON.stringify({ pathname, scrollTop: container.scrollTop }),
    );
  } catch {}
}

function scrollActiveItemIntoView(container: HTMLElement) {
  const active = container.querySelector<HTMLElement>('[data-active="true"]');
  if (!active) return;

  const containerRect = container.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  if (activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom) {
    container.scrollTop +=
      activeRect.top - containerRect.top - (container.clientHeight - activeRect.height) / 2;
  }
}

const menuButtonClass =
  "relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[active=true]:border-accent data-[active=true]:bg-accent 3xl:fixed:w-full 3xl:fixed:max-w-48";

export function DocsSidebar() {
  const location = useLocation();
  let contentRef: HTMLDivElement | undefined;

  onMount(() => {
    if (!contentRef) return;

    const onScroll = () => saveScrollState(contentRef as HTMLDivElement, location().pathname);
    contentRef.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => contentRef?.removeEventListener("scroll", onScroll));
  });

  createEffect(() => {
    const pathname = location().pathname;
    if (!contentRef) return;

    queueMicrotask(() => {
      if (!contentRef) return;
      const state = readScrollState();

      if (state?.pathname === pathname) {
        contentRef.scrollTop = state.scrollTop;
      } else {
        scrollActiveItemIntoView(contentRef);
      }

      saveScrollState(contentRef, pathname);
    });
  });

  return (
    <Sidebar
      collapsible="none"
      class="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] overflow-hidden overscroll-none bg-transparent [--sidebar-menu-width:--spacing(56)] lg:flex"
    >
      <div class="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-[linear-gradient(to_bottom,transparent_0%,var(--border)_10%,var(--border)_90%,transparent_100%)] lg:flex" />
      <SidebarContent
        ref={contentRef}
        data-docs-sidebar-content=""
        class="scroll-fade no-scrollbar w-(--sidebar-menu-width) overflow-x-hidden pl-2.5"
      >
        <SidebarGroup class="pt-12">
          <SidebarGroupLabel class="font-medium text-muted-foreground">Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={sections}>
                {(item) => {
                  const isActive = () =>
                    item.to === "/docs"
                      ? location().pathname === item.to
                      : location().pathname.startsWith(item.to);

                  return (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        as={Link}
                        to={item.to}
                        isActive={isActive()}
                        class={menuButtonClass}
                      >
                        <span class="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                        {item.name}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel class="font-medium text-muted-foreground">
            Installation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu class="gap-0.5">
              <For each={installationPages}>
                {(page) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      as={Link}
                      to="/docs/installation/$slug"
                      // @ts-expect-error Kobalte's polymorphic wrapper cannot infer TanStack route params.
                      params={{ slug: page.slug }}
                      isActive={location().pathname === `/docs/installation/${page.slug}`}
                      class={menuButtonClass}
                    >
                      <span class="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                      {page.title}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel class="font-medium text-muted-foreground">Blocks</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu class="gap-0.5">
              <For each={blockPages}>
                {(page) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      as={Link}
                      to="/docs/blocks/$primitive/$slug"
                      // @ts-expect-error Kobalte's polymorphic wrapper cannot infer TanStack route params.
                      params={{ primitive: "kobalte", slug: page.slug }}
                      isActive={location().pathname === `/docs/blocks/kobalte/${page.slug}`}
                      class={menuButtonClass}
                    >
                      <span class="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                      {page.title}
                      <Show when={hasUpdate(page.slug, "blocks")}>
                        <span
                          role="status"
                          aria-label="Has updates"
                          class="ml-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
                        />
                      </Show>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel class="font-medium text-muted-foreground">
            Components
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu class="gap-0.5">
              <For each={componentPages}>
                {(page) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      as={Link}
                      to="/docs/components/$primitive/$slug"
                      // @ts-expect-error Kobalte's polymorphic wrapper cannot infer TanStack route params.
                      params={{ primitive: "kobalte", slug: page.slug }}
                      isActive={location().pathname === `/docs/components/kobalte/${page.slug}`}
                      class={menuButtonClass}
                    >
                      <span class="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                      {page.title}
                      <Show when={hasUpdate(page.slug, "ui")}>
                        <span
                          role="status"
                          aria-label="Has updates"
                          class="ml-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
                        />
                      </Show>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
