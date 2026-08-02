import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy, Suspense } from "solid-js";
import { DocsPage } from "@/components/docs-page";
import { DocsSkeleton } from "@/components/docs-skeleton";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/installation/$slug")({
  loader: ({ params }) => {
    const doc = docs.find((page) => page.parent === "installation" && page.slug === params.slug);
    if (!doc) throw notFound({ data: { slug: params.slug } });
    return doc;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.title,
      description: loaderData.description,
      path: `/docs/installation/${loaderData.slug}`,
    });
  },
  component: () => (
    <Suspense fallback={<DocsSkeleton />}>
      <InstallationPage />
    </Suspense>
  ),
  notFoundComponent: () => <NotFoundPage />,
});

function InstallationPage() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/docs/installation/${doc().slug}.mdx`));

  return (
    <DocsPage toc={doc().toc}>
      <MDXContent components={sharedComponents} />
    </DocsPage>
  );
}
