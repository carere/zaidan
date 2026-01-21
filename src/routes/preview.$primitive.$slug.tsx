import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ErrorBoundary, lazy, Suspense } from "solid-js";
import { componentExists, isValidPrimitive } from "@/lib/registry-utils";

export const Route = createFileRoute("/preview/$primitive/$slug")({
  loader: ({ params }) => {
    const { primitive, slug } = params;

    // Validate primitive parameter - default to 'kobalte' if invalid
    const validPrimitive = isValidPrimitive(primitive) ? primitive : "kobalte";

    // Validate component exists
    if (!componentExists(slug)) {
      throw notFound({
        data: {
          slug,
          primitive: validPrimitive,
          reason: "Component not found in registry",
        },
      });
    }

    return {
      slug,
      primitive: validPrimitive,
    };
  },
  component: PreviewComponent,
  notFoundComponent: (props) => {
    const data = props.data as { slug?: string; reason?: string } | undefined;
    const slug = data?.slug ?? "unknown";
    const reason = data?.reason ?? "Component not found";

    return (
      <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h1 class="font-bold text-2xl text-foreground">Component Not Found</h1>
        <p class="text-muted-foreground">
          The component <code class="rounded bg-muted px-2 py-1">{slug}</code> could not be found.
        </p>
        <p class="text-muted-foreground text-sm">{reason}</p>
        <div class="mt-4 text-left">
          <p class="mb-2 text-muted-foreground text-sm">Available components can be found at:</p>
          <a href="/ui" class="text-primary underline hover:no-underline">
            /ui
          </a>
        </div>
      </div>
    );
  },
});

function PreviewComponent() {
  const data = Route.useLoaderData();
  const ExampleComponent = lazy(() => import(`../registry/examples/${data().slug}-example.tsx`));

  return (
    <div class="min-h-screen w-full bg-background">
      <ErrorBoundary
        fallback={(err) => (
          <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
            <h1 class="font-bold text-2xl text-foreground">Error Loading Component</h1>
            <p class="text-muted-foreground">
              Could not load the example for{" "}
              <code class="rounded bg-muted px-2 py-1">{data().slug}</code>
            </p>
            <p class="max-w-md text-muted-foreground text-sm">
              {err instanceof Error ? err.message : "An unknown error occurred"}
            </p>
          </div>
        )}
      >
        <Suspense
          fallback={
            <div class="flex min-h-screen w-full items-center justify-center">
              <div class="flex items-center gap-2 text-muted-foreground">
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Loading component...</span>
              </div>
            </div>
          }
        >
          <ExampleComponent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
