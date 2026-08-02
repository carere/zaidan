import { Link, useLocation } from "@tanstack/solid-router";
import { Plus } from "lucide-solid";
import { ErrorBoundary, For } from "solid-js";
import { GitHubLink } from "@/components/github-link";
import { Zaidan } from "@/components/icons/zaidan";
import { MobileNav } from "@/components/mobile-nav";
import { ModeSwitcher } from "@/components/mode-switcher";
import { SiteSearch } from "@/components/site-search";
import { Button } from "@/registry/kobalte/ui/button";
import { Separator } from "@/registry/kobalte/ui/separator";

const navItems = [
  { label: "Docs", to: "/installation" },
  { label: "Components", to: "/ui" },
  { label: "Create", to: "/create" },
] as const;

export function SiteHeader() {
  const location = useLocation();

  return (
    <header class="sticky top-0 z-50 w-full bg-background">
      <div class="container-wrapper px-6 3xl:fixed:px-0">
        <div class="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! 3xl:fixed:container">
          <MobileNav class="flex lg:hidden" />
          <nav class="hidden items-center lg:flex" aria-label="Primary navigation">
            <Button as={Link} to="/" variant="ghost" size="sm" class="px-2.5">
              <Zaidan class="size-5" />
              <span class="sr-only">Home</span>
            </Button>
            <For each={navItems}>
              {(item) => (
                <Button
                  as={Link}
                  to={item.to}
                  variant="ghost"
                  size="sm"
                  class="relative px-2.5"
                  data-active={
                    item.to === "/create"
                      ? location().pathname.startsWith("/create")
                      : location().pathname.startsWith(item.to)
                  }
                >
                  {item.label}
                </Button>
              )}
            </For>
          </nav>
          <div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            <div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
              <SiteSearch />
            </div>
            <Separator orientation="vertical" class="ml-2 hidden lg:block" />
            <ErrorBoundary fallback={<span class="size-8" aria-hidden="true" />}>
              <GitHubLink />
            </ErrorBoundary>
            <Separator orientation="vertical" />
            <ModeSwitcher />
            <Separator orientation="vertical" />
            <Button as={Link} to="/create" size="sm" class="h-[31px] rounded-lg">
              <Plus />
              New
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
