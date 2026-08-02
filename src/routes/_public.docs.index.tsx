import { createFileRoute } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy, Suspense } from "solid-js";
import { DocsPage } from "@/components/docs-page";
import { DocsSkeleton } from "@/components/docs-skeleton";
import { sharedComponents } from "@/components/mdx-components";
import { createPageHead } from "@/lib/seo";
import type { MdxModule } from "@/lib/types";

const mdxModules = import.meta.glob<MdxModule>("../pages/docs/*.mdx");

export const Route = createFileRoute("/_public/docs/")({
  loader: () => docs.find((page) => page.slug === "index"),
  head: () =>
    createPageHead({
      title: "Introduction",
      description: "Zaidan is a collection of open-code components for SolidJS.",
      path: "/docs",
    }),
  component: () => (
    <Suspense fallback={<DocsSkeleton />}>
      <IntroductionPage />
    </Suspense>
  ),
});

function IntroductionPage() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(mdxModules["../pages/docs/index.mdx"] as () => Promise<MdxModule>);

  return (
    <DocsPage toc={doc()?.toc ?? []}>
      <MDXContent components={sharedComponents} />
    </DocsPage>
  );
}
