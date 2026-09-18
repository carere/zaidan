import { createFileRoute } from "@tanstack/solid-router";
import { docs } from "@velite";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsPage } from "@/components/docs-page";
import { sharedComponents } from "@/components/mdx-components";
import { getMdxContent, preloadMdxContent } from "@/lib/mdx-content";
import { createPageHead } from "@/lib/seo";

const mdxPath = "../pages/docs/blocks.mdx";

export const Route = createFileRoute("/_public/docs/blocks/")({
  loader: async () => {
    const doc = docs.find((page) => page.slug === "blocks");
    await preloadMdxContent(mdxPath);
    return { doc, mdxPath };
  },
  head: () =>
    createPageHead({
      title: "Blocks",
      description: "All blocks available in the Zaidan registry.",
      path: "/docs/blocks",
    }),
  component: BlocksPage,
});

function BlocksPage() {
  const data = Route.useLoaderData();
  const MDXContent = createMemo(() => getMdxContent(data().mdxPath));

  return (
    <DocsPage toc={data().doc?.toc ?? []}>
      <Dynamic component={MDXContent()} components={sharedComponents} />
    </DocsPage>
  );
}
