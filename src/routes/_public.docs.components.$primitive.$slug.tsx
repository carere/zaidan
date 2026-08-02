import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Suspense } from "solid-js";
import { ComponentDocsHeader } from "@/components/component-docs-header";
import { DocsPage } from "@/components/docs-page";
import { DocsSkeleton } from "@/components/docs-skeleton";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/components/$primitive/$slug")({
  loader: ({ params }) => {
    if (params.primitive !== "kobalte") {
      throw notFound({ data: { slug: params.slug } });
    }

    const doc = ui.find((page) => page.slug === params.slug);
    if (!doc) throw notFound({ data: { slug: params.slug } });
    return doc;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.title,
      description: loaderData.description,
      path: `/docs/components/${params.primitive}/${loaderData.slug}`,
    });
  },
  component: () => (
    <Suspense fallback={<DocsSkeleton />}>
      <ComponentPage />
    </Suspense>
  ),
  notFoundComponent: () => <NotFoundPage />,
});

function ComponentPage() {
  const doc = Route.useLoaderData();
  const params = Route.useParams();
  const MDXContent = lazy(() => import(`../pages/ui/${params().primitive}/${doc().slug}.mdx`));

  return (
    <DocsPage toc={doc().toc}>
      {doc().component ? (
        <div class="flex flex-col gap-4">
          <ComponentDocsHeader
            title={doc().title}
            description={doc().description}
            foundation={doc().foundation}
          />
          <div class="w-full flex-1">
            <MDXContent components={sharedComponents} />
          </div>
        </div>
      ) : (
        <MDXContent components={sharedComponents} />
      )}
    </DocsPage>
  );
}
