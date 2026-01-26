import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Suspense } from "solid-js";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/registry/ui/empty";
import { Skeleton } from "@/registry/ui/skeleton";

export const Route = createFileRoute("/preview/$primitive/$slug")({
  loader: ({ params }) => {
    const { slug, primitive } = params;
    const component = ui.find((u) => u.slug === slug);
    if (!component) {
      throw notFound({
        data: {
          slug,
        },
      });
    }

    return {
      slug,
      primitive,
    };
  },
  component: PreviewComponent,
  notFoundComponent: (props) => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Component not found</EmptyTitle>
        <EmptyDescription>
          The component "{(props.data as { slug: string }).slug}" doesn't exist or couldn't be
          loaded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
});

function PreviewComponent() {
  const data = Route.useLoaderData();
  const ExampleComponent = lazy(() => import(`../registry/examples/${data().slug}-example.tsx`));

  return (
    <Suspense fallback={<Skeleton class="h-full w-full" />}>
      <ExampleComponent />
    </Suspense>
  );
}
