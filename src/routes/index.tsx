import { createFileRoute, Link } from "@tanstack/solid-router";
import { ArrowLeftIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { ItemExplorer } from "@/components/item-explorer";
import { ItemPicker } from "@/components/item-picker";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Preview } from "@/components/preview";
import { SiteConfig } from "@/components/site-config";
import { StyleSwitcher } from "@/components/style-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";
import { Separator } from "@/registry/ui/separator";
import { SidebarProvider } from "@/registry/ui/sidebar";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [isFullLayout, switchLayout] = createSignal(false);
  const [style, setStyle] = createSignal<"vega" | "nova" | "lyra" | "maia" | "mira">("vega");

  return (
    <div
      data-slot="layout"
      class={cn("style-vega bg-background relative z-10 flex min-h-svh flex-col", {
        container: isFullLayout(),
      })}
    >
      <header class="sticky top-0 z-50 w-full">
        <div class="container-wrapper 3xl:fixed:px-0 px-6">
          <div class="3xl:fixed:container flex h-(--header-height) items-center **:data-[slot=separator]:h-4!">
            <div class="flex items-center xl:w-1/3">
              <Button as={Link} href="/" variant="ghost" size="icon" class="rounded-lg shadow-none">
                <ArrowLeftIcon />
              </Button>
              <Separator orientation="vertical" class="mx-2 hidden sm:mx-4 lg:flex" />
              <div class="text-muted-foreground hidden text-sm font-medium lg:flex">Zaidan</div>
            </div>
            <div class="fixed inset-x-0 bottom-0 ml-auto flex flex-1 items-center gap-2 px-4.5 pb-4 sm:static sm:justify-end sm:p-0 lg:ml-0 xl:justify-center">
              <ItemPicker />
            </div>
            <div class="ml-auto flex items-center gap-2 sm:ml-0 md:justify-end xl:ml-auto xl:w-1/3">
              <SiteConfig onClick={() => switchLayout(!isFullLayout())} />
              <Separator orientation="vertical" class="3xl:flex hidden" />
              <ModeSwitcher />
              <Separator orientation="vertical" class="mr-0 -ml-2 sm:ml-0" />
              <StyleSwitcher onStyleChange={setStyle} />
            </div>
          </div>
        </div>
      </header>
      <main class="flex flex-1 flex-col pb-16 sm:pb-0">
        <SidebarProvider class="flex h-auto min-h-min flex-1 flex-col items-start overflow-hidden px-0">
          <div
            data-slot="designer"
            class="3xl:fixed:container flex w-full flex-1 flex-col gap-2 p-6 pt-1 pb-4 [--sidebar-width:--spacing(40)] sm:gap-2 sm:pt-2 md:flex-row md:pb-6 2xl:gap-6"
          >
            <ItemExplorer />
            <Preview
              class={cn({
                "style-vega": style() === "vega",
                "style-nova": style() === "nova",
                "style-lyra": style() === "lyra",
                "style-maia": style() === "maia",
                "style-mira": style() === "mira",
              })}
            />
          </div>
        </SidebarProvider>
      </main>
    </div>
  );
}
