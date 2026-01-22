import { createFileRoute } from "@tanstack/solid-router";
import { lazy } from "solid-js";

export const Route = createFileRoute("/preview/$primitive/$slug")({
  loader: ({ params }) => {
    const { slug, primitive } = params;

    return {
      slug,
      primitive,
    };
  },
  component: PreviewComponent,
  notFoundComponent: () => <div>Component not found when rendering iframe</div>,
});

function PreviewComponent() {
  const data = Route.useLoaderData();
  const ExampleComponent = lazy(() => import(`../registry/examples/${data().slug}-example.tsx`));

  return <ExampleComponent />;
}
