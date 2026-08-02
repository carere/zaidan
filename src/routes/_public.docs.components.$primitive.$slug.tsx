import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Suspense } from "solid-js";
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
      <MDXContent components={sharedComponents} />
    </DocsPage>
  );
}
