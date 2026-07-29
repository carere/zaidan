import { createFileRoute } from "@tanstack/solid-router";
import { HomeHero } from "@/components/home-hero";
import { HomeShowcase } from "@/components/home-showcase";
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
    <main data-product-surface="home" class="min-w-0 overflow-x-clip">
      <HomeHero />
      <HomeShowcase />
    </main>
  );
}
