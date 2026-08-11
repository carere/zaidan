import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { ComponentDocsHeader } from "@/components/component-docs-header";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { NotFoundPage } from "@/components/not-found-page";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/docs/components/$primitive/$slug")({
  loader: async ({ params }) => {
    if (params.primitive !== "kobalte") {
      throw notFound({ data: { slug: params.slug } });
    }

    const doc = ui.find((page) => page.slug === params.slug);
    if (!doc) throw notFound({ data: { slug: params.slug } });
    const mdxPath = `../pages/ui/${params.primitive}/${doc.slug}.mdx`;
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    return createPageHead({
      title: loaderData.doc.title,
      description: loaderData.doc.description,
      path: `/docs/components/${params.primitive}/${loaderData.doc.slug}`,
    });
  },
  component: ComponentPage,
  notFoundComponent: () => <NotFoundPage />,
});

function ComponentPage() {
  const data = Route.useLoaderData();
  const doc = createMemo(() => data().doc);
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

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
            <Dynamic component={MDXContent()} components={sharedComponents} />
          </div>
        </div>
      ) : (
        <Dynamic component={MDXContent()} components={sharedComponents} />
      )}
    </DocsPage>
  );
}
