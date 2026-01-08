import { createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { lazy, Suspense } from "solid-js";
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";

export const Route = createFileRoute("/{-$slug}")({
  loader: async ({ params }) => {
    const doc = docs.find((d) => (params.slug ? d.slug === params.slug : d.slug === "home"));
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }

    return doc;
  },
  component: RouteComponent,
  notFoundComponent: (props) => <div>Doc not found: {(props.data as { slug: string }).slug}</div>,
});

function RouteComponent() {
  const doc = Route.useLoaderData();
  const MDXContent = lazy(() => import(`../pages/docs/${doc().slug}.mdx`));

  return (
    <div class="mx-auto flex max-w-5xl gap-8 overflow-y-auto p-6">
      <div class="min-w-0 flex-1">
        <Suspense>
          <MDXContent components={sharedComponents} />
        </Suspense>
      </div>
      <TableOfContents toc={doc().toc} />
    </div>
  );
}
