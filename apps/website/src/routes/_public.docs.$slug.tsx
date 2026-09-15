import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/$slug")({
  loader: async ({ params }) => {
    const doc = docs.find((page) => page.parent === undefined && page.slug === params.slug);
    if (!doc || doc.slug === "index") {
      throw notFound({ data: { slug: params.slug } });
    }
    const mdxPath = `../pages/docs/${doc.slug}.mdx`;
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.doc.title,
      description: loaderData.doc.description,
      path: `/docs/${loaderData.doc.slug}`,
    });
  },
  component: DocPage,
  notFoundComponent: () => <NotFoundPage />,
});

function DocPage() {
  const data = Route.useLoaderData();
  const doc = createMemo(() => data().doc);
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={doc().toc}>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
