import { createFileRoute, notFound } from "@tanstack/solid-router";
import { changelog } from "@velite";
import { lazy, Suspense } from "solid-js";
import { DocsPage } from "@/components/docs-page";
import { DocsSkeleton } from "@/components/docs-skeleton";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { createPageHead } from "@/lib/seo";
import { fmtDate } from "@/lib/utils";

export const Route = createFileRoute("/_public/docs/changelog/$slug")({
  loader: ({ params }) => {
    const entry = changelog.find((item) => item.slug === params.slug);
    if (!entry) throw notFound({ data: { slug: params.slug } });
    return entry;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: `${loaderData.title} | Changelog`,
      description: loaderData.description,
      path: `/docs/changelog/${loaderData.slug}`,
    });
  },
  component: () => (
    <Suspense fallback={<DocsSkeleton />}>
      <ChangelogEntryPage />
    </Suspense>
  ),
  notFoundComponent: () => <NotFoundPage />,
});

function ChangelogEntryPage() {
  const entry = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/changelog/${entry().slug}.mdx`));

  return (
    <DocsPage toc={entry().toc}>
      <header data-slot="changelog-header" class="mb-10">
        <span class="text-muted-foreground text-sm">{fmtDate(entry().date)}</span>
        <h1 class="relative mt-1 scroll-m-28 font-heading font-semibold text-4xl tracking-tight dark:text-[#D4D4D4]">
          {entry().title}
        </h1>
        <p class="mt-3 text-base text-muted-foreground">{entry().description}</p>
      </header>
      <MDXContent components={sharedComponents} />
    </DocsPage>
  );
}
