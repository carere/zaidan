import { Show } from "solid-js";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";

type DocsSkeletonProps = {
  class?: string;
  /** Show the right-side TOC sidebar skeleton (xl breakpoint only). Defaults to true. */
  showToc?: boolean;
  /** Show the bottom-right `PageToggleNav` placeholder (ui/blocks docs only). Defaults to false. */
  showToggleNav?: boolean;
};

/**
 * Layout-preserving fallback for routes that lazy-load MDX. Mirrors the docs
 * route shape (outer width calc + content column + optional TOC sidebar +
 * optional bottom-right toggle nav) so the surrounding chrome (sidebar,
 * customizer, header) stays anchored while the MDX module is loading.
 */
export function DocsSkeleton(props: DocsSkeletonProps) {
  const showToc = () => props.showToc ?? true;
  const showToggleNav = () => props.showToggleNav ?? false;

  return (
    <div
      data-slot="docs-skeleton"
      class={cn(
        "relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full",
        props.class,
      )}
    >
      <div
        data-slot="docs-skeleton-content"
        class="no-scrollbar flex h-full grow justify-center overflow-y-auto scroll-smooth"
      >
        <div class="w-full space-y-6 lg:max-w-2xl">
          {/* Title + lede */}
          <div class="space-y-3 pt-2">
            <Skeleton class="h-8 w-1/2" />
            <Skeleton class="h-4 w-3/4" />
          </div>

          {/* Intro paragraph */}
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
          </div>

          {/* Section heading + paragraph */}
          <div class="space-y-3 pt-4">
            <Skeleton class="h-6 w-1/3" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-4/5" />
          </div>

          {/* Code-block-ish */}
          <Skeleton class="h-40 w-full rounded-md" />

          {/* Section heading + paragraph */}
          <div class="space-y-3 pt-4">
            <Skeleton class="h-6 w-2/5" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>

          {/* Code-block-ish */}
          <Skeleton class="h-32 w-full rounded-md" />

          {/* Section heading + table-ish */}
          <div class="space-y-3 pt-4">
            <Skeleton class="h-6 w-1/4" />
            <div class="space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>

      <Show when={showToc()}>
        <div
          data-slot="docs-skeleton-toc"
          class="hidden h-fit w-fit shrink-0 xl:block xl:w-50 xl:pt-10"
        >
          <div class="space-y-2.5">
            <Skeleton class="h-3.5 w-3/4" />
            <Skeleton class="ml-3 h-3 w-1/2" />
            <Skeleton class="ml-3 h-3 w-2/3" />
            <Skeleton class="mt-4 h-3.5 w-2/3" />
            <Skeleton class="ml-3 h-3 w-1/2" />
            <Skeleton class="ml-3 h-3 w-3/5" />
            <Skeleton class="ml-3 h-3 w-1/2" />
            <Skeleton class="mt-4 h-3.5 w-1/2" />
            <Skeleton class="ml-3 h-3 w-2/3" />
          </div>
        </div>
      </Show>

      <Show when={showToggleNav()}>
        <Skeleton class="absolute right-2 bottom-2 isolate z-10 h-9 w-32 rounded-md" />
      </Show>
    </div>
  );
}
