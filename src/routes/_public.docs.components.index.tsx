import { createFileRoute } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy, Suspense } from "solid-js";
import { DocsPage } from "@/components/docs-page";
import { DocsSkeleton } from "@/components/docs-skeleton";
import { sharedComponents } from "@/components/mdx-components";
import { createPageHead } from "@/lib/seo";
import type { MdxModule } from "@/lib/types";

const mdxModules = import.meta.glob<MdxModule>("../pages/docs/*.mdx");

export const Route = createFileRoute("/_public/docs/components/")({
  loader: () => docs.find((page) => page.slug === "components"),
  head: () =>
    createPageHead({
      title: "Components",
      description: "All components available in the Zaidan registry.",
      path: "/docs/components",
    }),
  component: () => (
    <Suspense fallback={<DocsSkeleton />}>
      <ComponentsPage />
    </Suspense>
  ),
});

function ComponentsPage() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(mdxModules["../pages/docs/components.mdx"] as () => Promise<MdxModule>);

  return (
    <DocsPage toc={doc()?.toc ?? []}>
      <MDXContent components={sharedComponents} />
    </DocsPage>
  );
}
