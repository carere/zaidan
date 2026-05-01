import { Link } from "@tanstack/solid-router";
import { ArrowRightIcon } from "lucide-solid";
import { BentoNotch } from "@/components/bento-notch";
import { Button } from "@/registry/kobalte/ui/button";

export function HomeHero() {
  return (
    <section
      data-slot="home-hero"
      class="relative flex w-full flex-col items-center gap-6 px-4 pt-4 pb-16 text-center lg:pt-6 lg:pb-24"
    >
      <Link
        to="/changelog"
        class="group inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted/80"
      >
        <span>New: Sortable, Scroll Area, and shadcn-aligned fonts &amp; colors</span>
        <ArrowRightIcon class="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <h1 class="max-w-3xl text-balance font-heading font-semibold text-3xl tracking-tight lg:text-5xl lg:leading-[1.1] lg:tracking-tighter">
        The best foundation for your next SolidJS project
      </h1>

      <p class="max-w-2xl text-balance text-base text-muted-foreground lg:text-lg">
        Beautifully designed, accessible components built on Kobalte and Corvu. Copy, paste, and
        ship — or pull them in via the shadcn CLI.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button
          as={Link}
          to="/$slug"
          //@ts-expect-error <Problem with kobalte typing polymorphic props>
          params={{ slug: "installation" }}
          size="sm"
        >
          Getting Started
        </Button>
        <Button as={Link} to="/ui/{-$slug}" variant="outline" size="sm">
          View Components
        </Button>
      </div>

      <BentoNotch />
    </section>
  );
}
