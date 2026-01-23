import { createFileRoute, Link, Outlet } from "@tanstack/solid-router";
import { Copy, Share } from "lucide-solid";
import { createSignal } from "solid-js";
import { Customizer } from "@/components/customizer";
import { GitHubLink } from "@/components/github-link";
import { Zaidan } from "@/components/icons/zaidan";
import { ItemExplorer } from "@/components/item-explorer";
import { ItemPicker } from "@/components/item-picker";
import { ModeSwitcher } from "@/components/mode-switcher";
import { SiteConfig } from "@/components/site-config";
import { ViewSwitcher } from "@/components/view-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";
import { Separator } from "@/registry/ui/separator";
import { SidebarInset, SidebarProvider } from "@/registry/ui/sidebar";

export const Route = createFileRoute("/_website")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isFullLayout, switchLayout] = createSignal(false);

  return (
    <div
      data-slot="layout"
      class={cn(
        "style-vega relative z-10 flex h-svh flex-col overflow-hidden overscroll-none bg-background antialiased contain-layout [--header-height:calc(var(--spacing)*14)]",
        { container: isFullLayout() },
      )}
    >
      <header
        class={cn(
          "fixed top-0 z-50 flex w-full items-center px-6 py-3 **:data-[slot=separator]:h-4! md:gap-2",
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
        <div class="fixed inset-x-0 bottom-0 ml-auto flex-1 gap-2 px-4.5 pb-4 sm:static sm:p-0 lg:ml-0">
          <ItemPicker />
        </div>
        <div class="ml-auto flex items-center gap-2 sm:ml-0 md:justify-end xl:ml-auto xl:w-1/3">
          <GitHubLink />
          <Separator orientation="vertical" />
          <ViewSwitcher />
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
      <SidebarProvider class="flex max-h-full flex-1 items-start px-6 pt-[calc(var(--header-height)+0.25rem)] sm:flex-row">
        <ItemExplorer />
        <SidebarInset class="flex flex-col gap-6 sm:flex-row">
          <Outlet />
          <Customizer class="grow-0" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
