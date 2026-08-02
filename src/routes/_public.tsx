import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div
      data-slot="public-layout"
      class="relative z-10 flex min-h-svh flex-col bg-background [--footer-height:--spacing(14)] [--header-height:--spacing(14)] lg:[--header-height:--spacing(16)] xl:[--footer-height:--spacing(24)]"
    >
      <SiteHeader />
      <main class="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
