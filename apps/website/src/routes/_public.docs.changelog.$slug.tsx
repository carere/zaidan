import { createFileRoute, notFound } from "@tanstack/solid-router";
import { changelog } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";
import { fmtDate } from "@/lib/utils";

export const Route = createFileRoute("/_public/docs/changelog/$slug")({
  loader: async ({ params }) => {
    const entry = changelog.find((item) => item.slug === params.slug);
    if (!entry) throw notFound({ data: { slug: params.slug } });
    const mdxPath = `../pages/changelog/${entry.slug}.mdx`;
    await preloadMdxContent(mdxPath);
    return { entry, mdxPath };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: `${loaderData.entry.title} | Changelog`,
      description: loaderData.entry.description,
      path: `/docs/changelog/${loaderData.entry.slug}`,
    });
  },
  component: ChangelogEntryPage,
  notFoundComponent: () => <NotFoundPage />,
});

function ChangelogEntryPage() {
  const data = Route.useLoaderData();
  const entry = createMemo(() => data().entry);
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={entry().toc}>
      <header data-slot="changelog-header" class="mb-10">
        <span class="text-muted-foreground text-sm">{fmtDate(entry().date)}</span>
        <h1 class="relative mt-1 scroll-m-28 font-heading font-semibold text-4xl tracking-tight dark:text-[#D4D4D4]">
          {entry().title}
        </h1>
        <p class="mt-3 text-base text-muted-foreground">{entry().description}</p>
      </header>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
