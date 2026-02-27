import { createFileRoute, Link, Outlet, useSearch } from "@tanstack/solid-router";
import { CircleAlert } from "lucide-solid";
import { createSignal, ErrorBoundary } from "solid-js";
import { CliButton } from "@/components/cli-button";
import { Customizer } from "@/components/customizer";
import { GitHubLink } from "@/components/github-link";
import { Zaidan } from "@/components/icons/zaidan";
import { ItemExplorer } from "@/components/item-explorer";
import { ItemPicker } from "@/components/item-picker";
import { ModeSwitcher } from "@/components/mode-switcher";
import { NotFoundPage } from "@/components/not-found-page";
import { RandomButton } from "@/components/random-button";
import { ShareButton } from "@/components/share-button";
import { SiteConfig } from "@/components/site-config";
import { LocksProvider } from "@/lib/use-locks";
import { cn } from "@/lib/utils";
import { Separator } from "@/registry/kobalte/ui/separator";
import { SidebarProvider } from "@/registry/kobalte/ui/sidebar";
import { Toaster } from "@/registry/kobalte/ui/sonner";

export const Route = createFileRoute("/_website")({
  component: RouteComponent,
  notFoundComponent: () => <NotFoundPage />,
});

function RouteComponent() {
  const [isFullLayout, switchLayout] = createSignal(false);
  const search = useSearch({ strict: false });

  return (
    <LocksProvider>
      <Toaster position="top-center" />
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
            { "max-w-screen-2xl pr-18": isFullLayout() },
          )}
        >
          <div class="flex items-center lg:mr-2 xl:w-1/3">
            <Link to="/" search={search()}>
              <Zaidan class="size-6" />
            </Link>
            <Separator orientation="vertical" class="mx-4" />
            <div class="hidden font-medium text-muted-foreground text-sm lg:flex">Zaidan</div>
          </div>
          <div class="fixed bottom-0 flex w-[calc(100svw-var(--spacing)*4)] items-center gap-2 pt-2 pr-4 pb-4 md:relative md:bottom-auto md:ml-auto md:p-0 lg:basis-1/3">
            <ItemPicker class="grow rounded-2xl md:rounded-md" />
            <RandomButton class="md:hidden" />
          </div>
          <div class="ml-auto flex items-center gap-2 md:justify-end xl:ml-auto xl:w-1/3">
            <ErrorBoundary
              fallback={(error) => {
                console.error("Error loading GitHub stars:", error);
                return <CircleAlert class="size-4 fill-red-800" />;
              }}
            >
              <GitHubLink />
            </ErrorBoundary>
            <Separator orientation="vertical" />
            <SiteConfig class="hidden xl:flex" onClick={() => switchLayout(!isFullLayout())} />
            <Separator orientation="vertical" class="hidden xl:flex" />
            <ModeSwitcher />
            <ShareButton />
            <CliButton />
          </div>
        </header>
        <SidebarProvider class="overflow-x-hidden px-4 pt-15 pb-18 md:pb-4">
          <ItemExplorer class="w-56 shrink-0" />
          <div data-slot="main-content" class="flex basis-full flex-col gap-2 md:flex-row">
            <Outlet />
            <Customizer class="shrink-0 md:w-48" />
          </div>
        </SidebarProvider>
      </div>
    </LocksProvider>
  );
}
