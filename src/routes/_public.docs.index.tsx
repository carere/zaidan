import { createFileRoute } from "@tanstack/solid-router";
import { docs } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

const mdxPath = "../pages/docs/index.mdx";

export const Route = createFileRoute("/_public/docs/")({
  loader: async () => {
    const doc = docs.find((page) => page.slug === "index");
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: () =>
    createPageHead({
      title: "Introduction",
      description: "Zaidan is a collection of open-code components for SolidJS.",
      path: "/docs",
    }),
  component: IntroductionPage,
});

function IntroductionPage() {
  const data = Route.useLoaderData();
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={data().doc?.toc ?? []}>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
