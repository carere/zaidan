import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@/../.velite";
import { MDXContent } from "@/components/mdx-content";

export const Route = createFileRoute("/_app/getting-started")({
  loader: () => {
    const doc = docs.find((d) => d.slug === "getting-started");
    if (!doc) {
      throw notFound();
    }
    return doc;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const doc = Route.useLoaderData();

  return (
    <div class="text-2xl text-foreground">
      <ClientOnly fallback={<div>Loading...</div>}>
        <MDXContent
          code={doc().code}
          components={{ Element: () => <div class="text-red-500" /> }}
        />
      </ClientOnly>
    </div>
  );
}
