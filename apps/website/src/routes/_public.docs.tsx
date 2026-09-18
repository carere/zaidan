import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { DocsSidebar } from "@/components/docs-sidebar";
import { SidebarProvider } from "@/registry/kobalte/ui/sidebar";

export const Route = createFileRoute("/_public/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <div class="container-wrapper flex flex-1 flex-col px-2">
      {/* has-data-[variant=inset]:bg-transparent keeps inline inset sidebar demos
          (e.g. on the sidebar docs page) from repainting the whole docs shell. */}
      <SidebarProvider class="min-h-min flex-1 items-start px-0 has-data-[variant=inset]:bg-transparent [--sidebar-width:--spacing(72)] [--toc-width:--spacing(64)] [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:--spacing(4)] 3xl:fixed:container 3xl:fixed:px-3">
        <DocsSidebar />
        <div class="h-full min-w-0 w-full">
          <Outlet />
        </div>
      </SidebarProvider>
    </div>
  );
}
