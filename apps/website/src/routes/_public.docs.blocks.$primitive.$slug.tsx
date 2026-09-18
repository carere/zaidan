import { createFileRoute, notFound } from "@tanstack/solid-router";
import { blocks } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/blocks/$primitive/$slug")({
  loader: async ({ params }) => {
    if (params.primitive !== "kobalte") {
      throw notFound({ data: { slug: params.slug } });
    }

    const doc = blocks.find((page) => page.slug === params.slug);
    if (!doc) throw notFound({ data: { slug: params.slug } });
    const mdxPath = `../pages/blocks/${params.primitive}/${doc.slug}.mdx`;
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.doc.title,
      description: loaderData.doc.description,
      path: `/docs/blocks/${params.primitive}/${loaderData.doc.slug}`,
    });
  },
  component: BlockPage,
  notFoundComponent: () => <NotFoundPage />,
});

function BlockPage() {
  const data = Route.useLoaderData();
  const doc = createMemo(() => data().doc);
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={doc().toc}>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
