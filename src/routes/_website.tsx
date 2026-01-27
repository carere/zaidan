import { createFileRoute, Link, Outlet } from "@tanstack/solid-router";
import { Copy, Share } from "lucide-solid";
import { createSignal } from "solid-js";
import { Customizer } from "@/components/customizer";
import { GitHubLink } from "@/components/github-link";
import { Zaidan } from "@/components/icons/zaidan";
import { ItemExplorer } from "@/components/item-explorer";
import { ItemPicker } from "@/components/item-picker";
import { ModeSwitcher } from "@/components/mode-switcher";
import { RandomButton } from "@/components/random-button";
import { SiteConfig } from "@/components/site-config";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";
import { Separator } from "@/registry/ui/separator";
import { SidebarProvider } from "@/registry/ui/sidebar";

export const Route = createFileRoute("/_website")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isFullLayout, switchLayout] = createSignal(false);

  return (
    <div
      data-slot="layout"
      class={cn(
        "relative z-10 flex h-svh flex-col overflow-hidden overscroll-none bg-background antialiased contain-layout",
        { "mx-auto max-w-screen-2xl px-4 xl:px-6": isFullLayout() },
      )}
    >
      <header
        class={cn(
          "fixed top-0 z-50 flex w-full items-center px-4 py-3 **:data-[slot=separator]:h-4! md:gap-2",
          { "max-w-screen-2xl pr-[72px]": isFullLayout() },
        )}
      >
        <div class="flex items-center lg:mr-2 xl:w-1/3">
          <Link to="/{-$slug}" params={{ slug: "home" }}>
            <Zaidan class="size-6" />
          </Link>
          <Separator orientation="vertical" class="mx-4" />
          <div class="hidden font-medium text-muted-foreground text-sm lg:flex">Zaidan</div>
        </div>
        <div class="ml-auto hidden flex-1 items-center justify-end gap-2 px-4.5 pb-4 sm:static sm:p-0 md:flex lg:ml-0">
          <ItemPicker />
        </div>
        <div class="ml-auto flex items-center gap-2 sm:ml-0 md:justify-end xl:ml-auto xl:w-1/3">
          <GitHubLink />
          <Separator orientation="vertical" />
          <SiteConfig class="hidden xl:flex" onClick={() => switchLayout(!isFullLayout())} />
          <Separator orientation="vertical" class="hidden xl:flex" />
          <ModeSwitcher />
          <Button variant="outline" size="sm">
            <Share />
            <span>Share</span>
          </Button>
          <Button variant="default" size="sm">
            <Copy />
            <span>Get CSS</span>
          </Button>
        </div>
      </header>
      <SidebarProvider class="overflow-x-hidden px-4 pt-15 pb-18 md:pb-4">
        <ItemExplorer class="w-56 shrink-0" />
        <div data-slot="main-content" class="flex basis-full flex-col gap-2 md:flex-row">
          <Outlet />
          <Customizer class="shrink-0 md:w-48" />
        </div>
      </SidebarProvider>
      <div
        data-slot="bot-navbar"
        class="fixed bottom-0 flex w-full flex-row items-center gap-2 px-4 pt-2 pb-4 md:hidden"
      >
        <ItemPicker class="rounded-2xl" />
        <RandomButton />
      </div>
    </div>
  );
}
