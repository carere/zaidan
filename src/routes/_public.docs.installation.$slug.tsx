import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/installation/$slug")({
  loader: async ({ params }) => {
    const doc = docs.find((page) => page.parent === "installation" && page.slug === params.slug);
    if (!doc) throw notFound({ data: { slug: params.slug } });
    const mdxPath = `../pages/docs/installation/${doc.slug}.mdx`;
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.doc.title,
      description: loaderData.doc.description,
      path: `/docs/installation/${loaderData.doc.slug}`,
    });
  },
  component: InstallationPage,
  notFoundComponent: () => <NotFoundPage />,
});

function InstallationPage() {
  const data = Route.useLoaderData();
  const doc = createMemo(() => data().doc);
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={doc().toc}>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
