import { createFileRoute } from "@tanstack/solid-router";
import { HomeHero } from "@/components/home-hero";
import { HomeShowcase } from "@/components/home-showcase";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/")({
  head: () =>
    createPageHead({
      title: "Home",
      description:
        "Beautifully designed, accessible components built on Kobalte and Corvu. Copy, paste, and ship — or pull them in via the shadcn CLI.",
      path: "/",
    }),
  component: HomePage,
});

function HomePage() {
  return (
    <div class="flex flex-1 flex-col">
      <HomeHero />
      <HomeShowcase />
    </div>
  );
}
