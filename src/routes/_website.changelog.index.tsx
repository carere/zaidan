import { createFileRoute } from "@tanstack/solid-router";
import { changelog } from "@velite";
import { For, Show } from "solid-js";
import {
  ChangelogEntry,
  MoreUpdates,
  sharedComponents,
  UpdateCard,
} from "@/components/mdx-components";
import { createPageHead } from "@/lib/seo";
import type { MdxModule } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const RECENT_COUNT = 5;

export const Route = createFileRoute("/_website/changelog/")({
  loader: () => {
    const sorted = changelog.sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );

    return {
      recent: sorted.slice(0, RECENT_COUNT),
      older: sorted.slice(RECENT_COUNT),
    };
  },
  head: () =>
    createPageHead({
      title: "Changelog",
      description: "Latest updates and announcements for the Zaidan registry.",
      path: "/changelog",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const mdxModules = import.meta.glob<MdxModule>("../pages/changelog/*.mdx", { eager: true });
  const componentBySlug: Record<string, MdxModule["default"]> = {};
  for (const [path, mod] of Object.entries(mdxModules)) {
    const slug = path.match(/([^/]+)\.mdx$/)?.[1];
    if (slug) componentBySlug[slug] = mod.default;
  }

  return (
    <div
      data-slot="changelog-layout"
      class="relative flex h-full w-[calc(100svw-var(--spacing)*8)] flex-row overflow-hidden md:w-[calc(100svw-var(--spacing)*56)] lg:w-full"
    >
      <div
        data-slot="changelog-content"
        class="no-scrollbar flex h-full grow justify-center overflow-y-auto scroll-smooth"
      >
        <div class="w-full lg:max-w-2xl">
          <h1 class="relative mt-2 scroll-m-28 font-heading font-semibold text-4xl tracking-tight dark:text-[#D4D4D4]">
            Changelog
          </h1>
          <span class="mt-2 mb-10 inline-flex text-muted-foreground text-sm">
            Latest updates and announcements.
          </span>

          <For each={data().recent}>
            {(entry) => {
              const MDX = componentBySlug[entry.slug];
              return (
                <Show when={MDX}>
                  <ChangelogEntry>
                    <span class="text-muted-foreground text-sm">{fmtDate(entry.date)}</span>
                    <h2 class="mt-1 mb-6 font-heading font-semibold text-2xl tracking-tight dark:text-[#D4D4D4]">
                      {entry.title}
                    </h2>
                    <MDX components={sharedComponents} />
                  </ChangelogEntry>
                </Show>
              );
            }}
          </For>

          <Show when={data().older.length > 0}>
            <MoreUpdates>
              <For each={data().older}>
                {(entry) => (
                  <UpdateCard
                    date={fmtDate(entry.date)}
                    title={entry.title}
                    href={`/changelog/${entry.slug}`}
                  />
                )}
              </For>
            </MoreUpdates>
          </Show>
        </div>
      </div>
    </div>
  );
}
