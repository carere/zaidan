import { createFileRoute } from "@tanstack/solid-router";
import { RootComponents } from "@/components/home";
import { HomeHero } from "@/components/home-hero";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_website/")({
  head: () => {
    return createPageHead({
      title: "Home",
      description:
        "A beautiful ShadCN UI registry for SolidJS - accessible, customizable components built on Kobalte and Corvu.",
      path: "/",
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div class="no-scrollbar relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-col overflow-y-auto md:w-[calc(100svw-var(--spacing)*56)] lg:w-full">
      <HomeHero />
      <RootComponents />
    </div>
  );
}
