import { Link, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { ItemExplorer } from "@/components/item-explorer";
import { ItemPicker } from "@/components/item-picker";
import { Logo } from "@/components/logo";
import { ModeSwitcher } from "@/components/mode-switcher";
import { SiteConfig } from "@/components/site-config";
import { StyleSwitcher } from "@/components/style-switcher";
import type { Style } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/registry/ui/separator";
import { SidebarInset, SidebarProvider } from "@/registry/ui/sidebar";

export function Shell() {
  const [isFullLayout, switchLayout] = createSignal(false);
  const [style, setStyle] = createSignal<Style>("vega");

  return (
    <div
      data-slot="layout"
      class={cn("bg-background relative z-10 flex min-h-svh flex-col", {
        container: isFullLayout(),
      })}
    >
      <header class="sticky top-0 z-50 w-full flex items-center md:gap-2 px-6 h-(--header-height) **:data-[slot=separator]:h-4!">
        <div class="flex items-center xl:w-1/3 lg:mr-2">
          <Link to="/{-$doc}" params={{ doc: "home" }}>
            <Logo class="size-6" />
          </Link>
          <Separator orientation="vertical" class="mx-4" />
          <div class="text-muted-foreground hidden text-sm font-medium lg:flex">Zaidan</div>
        </div>
        <div class="fixed inset-x-0 bottom-0 ml-auto flex-1 gap-2 px-4.5 pb-4 sm:static sm:p-0 lg:ml-0">
          <ItemPicker />
        </div>
        <div class="ml-auto flex items-center gap-2 sm:ml-0 md:justify-end xl:ml-auto xl:w-1/3">
          <SiteConfig class="hidden xl:flex" onClick={() => switchLayout(!isFullLayout())} />
          <Separator orientation="vertical" class="hidden xl:flex" />
          <ModeSwitcher />
          <StyleSwitcher style={style()} onStyleChange={setStyle} />
        </div>
      </header>
      <main class="flex flex-1 flex-col pb-16 sm:pb-0">
        <SidebarProvider class="flex h-auto min-h-min flex-1 flex-col items-start overflow-hidden px-0">
          <div
            data-slot="designer"
            class="3xl:fixed:container flex w-full flex-1 flex-col gap-2 p-6 pt-1 pb-4 [--sidebar-width:--spacing(40)] sm:gap-2 sm:pt-2 md:flex-row md:pb-6 2xl:gap-6"
          >
            <ItemExplorer />
            <SidebarInset
              class={cn("flex-1", {
                "style-vega": style() === "vega",
                "style-nova": style() === "nova",
                "style-lyra": style() === "lyra",
                "style-maia": style() === "maia",
                "style-mira": style() === "mira",
              })}
            >
              <Outlet />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </main>
    </div>
  );
}
